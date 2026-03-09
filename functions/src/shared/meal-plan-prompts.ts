/**
 * GPT-4o prompt builders for weekly meal plan generation.
 * Each prompt uses glossary/Spoonacular recipes as RAG context to prevent hallucination.
 */

import * as fs from 'fs';
import * as path from 'path';

// Load regional ingredients data once at module level
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let regionalData: Record<string, any> = {};
try {
  const dataPath = path.join(__dirname, '../../data/regional-ingredients.json');
  regionalData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
} catch {
  // Gracefully handle missing file (e.g., during tests)
  regionalData = {};
}

const CUISINE_TO_REGION: Record<string, string> = {
  indian: 'south-asian',
  italian: 'mediterranean',
  chinese: 'east-asian',
  japanese: 'east-asian',
  mexican: 'mexican',
  thai: 'east-asian',
  mediterranean: 'mediterranean',
  american: 'american',
  korean: 'east-asian',
  french: 'mediterranean',
  middle_eastern: 'middle-eastern',
  vietnamese: 'east-asian',
};

function getRegionalContext(cuisines: string[]): string {
  if (cuisines.length === 0) return '';
  const regions = [...new Set(cuisines.map((c) => CUISINE_TO_REGION[c]).filter(Boolean))];
  if (regions.length === 0) return '';

  const lines: string[] = [];
  for (const region of regions) {
    const data = regionalData[region];
    if (!data) continue;
    lines.push(`For ${region.replace('-', ' ')} cuisine:`);
    if (data.preferred_vegetables?.length) {
      lines.push(`  PREFER these native vegetables: ${data.preferred_vegetables.slice(0, 20).join(', ')}`);
    }
    if (data.preferred_lentils?.length) {
      lines.push(`  PREFER these lentils/legumes: ${data.preferred_lentils.join(', ')}`);
    }
    if (data.avoid?.length) {
      lines.push(`  AVOID these non-native ingredients in substitutions: ${data.avoid.join(', ')}`);
    }
    if (data.note) {
      lines.push(`  Note: ${data.note}`);
    }
  }

  return lines.length > 0
    ? `\nREGIONAL INGREDIENT GUIDANCE (use native ingredients for authentic recipes, avoid non-native substitutions):\n${lines.join('\n')}\n`
    : '';
}

interface RecipeContext {
  name: string;
  description: string;
  cookTime: string;
  ingredients: string[];
  cuisine: string[];
  dietaryTags: string[];
}

interface BreakfastPref {
  memberName: string;
  preferences: string[];
}

function formatRecipeContext(recipes: RecipeContext[]): string {
  if (recipes.length === 0) return 'No reference recipes available — use only well-known standard dishes appropriate for this specific meal type.';
  return recipes
    .map(
      (r, i) =>
        `${i + 1}. "${r.name}" (${r.cookTime}) — ${r.description}\n   Ingredients: ${r.ingredients.join(', ')}\n   Cuisine: ${r.cuisine.join(', ')} | Tags: ${r.dietaryTags.join(', ')}`
    )
    .join('\n\n');
}

function formatIngredientsSection(ingredients: string[]): string {
  if (ingredients.length === 0) {
    return `AVAILABLE INGREDIENTS:
No specific ingredients provided. Use commonly available ingredients appropriate for the selected cuisines and dietary requirements. The grocery list will be generated from the recipes you choose.`;
  }
  return `AVAILABLE INGREDIENTS:
${ingredients.map((i) => `- ${i}`).join('\n')}`;
}

const MEAL_COMPONENT_SCHEMA = `{
  "name": "Dish Name",
  "description": "Brief 1-sentence description",
  "cookTime": "15 min",
  "difficulty": "Easy",
  "ingredients": [
    { "name": "ingredient", "quantity": "1", "unit": "cup" }
  ],
  "instructions": ["Step 1...", "Step 2..."],
  "tips": ["One helpful tip"],
  "nutritionInfo": {
    "servings": 2,
    "calories": 250,
    "protein": "12g",
    "carbs": "30g",
    "fat": "8g"
  },
  "dietaryNotes": "Used oat milk instead of regular milk (lactose intolerant)"
}
IMPORTANT: "calories" MUST be PER PERSON (per single serving), NOT total for the whole family.
For example, if a dish is cooked for 4 people and the pot totals 2000 cal, report 500 cal per person.
REMINDER: Always divide total dish calories by the number of servings to get per-person calories.`;

export function buildBreakfastPrompt(
  ingredients: string[],
  dietaryConditions: string[],
  familySize: number,
  breakfastPrefs: BreakfastPref[],
  glossaryRecipes: RecipeContext[],
  planDays: number,
  calorieTarget: number | null,
  dayNames: string[] = []
): string {
  const isFamily = familySize > 1;

  // Build member names list — use preferences if provided, otherwise default names
  const memberNames = isFamily
    ? (breakfastPrefs.length > 0
        ? breakfastPrefs.map((p) => p.memberName)
        : Array.from({ length: familySize }, (_, i) => `Person ${i + 1}`))
    : [];

  return `You are a professional nutritionist and chef planning breakfasts for ${isFamily ? `a family of ${familySize}` : 'an individual'}.

${formatIngredientsSection(ingredients)}

DIETARY CONSTRAINTS (MUST FOLLOW ALL):
${dietaryConditions.length > 0 ? dietaryConditions.map((c) => `- ${c}`).join('\n') : '- None'}

${isFamily ? `FAMILY MEMBERS AND THEIR BREAKFAST PREFERENCES:
${breakfastPrefs.length > 0
    ? breakfastPrefs.map((p) => `- ${p.memberName}: prefers ${p.preferences.length > 0 ? p.preferences.join(', ') : 'no specific preference'}`).join('\n')
    : memberNames.map((n) => `- ${n}: no specific preference`).join('\n')}
CRITICAL: Each family member MUST get a personalized breakfast matching their preferences. If "${memberNames[0] || 'a member'}" prefers "oats", their breakfast MUST feature oats every day (with variation in preparation).` : ''}

APPROVED BREAKFAST RECIPES (you MUST choose ONLY from this list — do NOT invent new dishes):
${formatRecipeContext(glossaryRecipes)}
${calorieTarget ? `
CALORIE TARGET:
Each person's breakfast should total approximately ${calorieTarget} calories PER PERSON (per single serving). All nutritionInfo.calories values must be per person.` : ''}

STRICT RULES:
- You MUST only use breakfasts from the APPROVED list above. Do NOT create new dishes.
- Do NOT combine ingredients in weird ways (no "paneer smoothie", no "spinach pancake with carrots").
- Every dish you suggest must match a real recipe from the list. You may adapt ingredients slightly for dietary needs, but the dish identity must remain the same.
- NEVER suggest heavy lunch/dinner items (curries, biryani, tandoori, pasta, fried rice, heavy meat dishes).

REQUIREMENTS:
${isFamily ? `1. Generate a PERSONALIZED breakfast for EACH family member for EACH day: ${dayNames.join(', ')}
2. Each member's breakfast MUST reflect their stated preferences — do NOT give everyone the same breakfast.
3. Vary breakfasts across days — no member should eat the exact same dish more than 2 days in the plan.
4. Each breakfast should be a single complete dish (1 component per person per day).` : `1. Generate 5 rotating breakfast templates for ${planDays} days. Most people rotate 4-5 breakfasts.`}
${isFamily ? '5' : '2'}. Each breakfast should be BALANCED: include protein, carbs, and fruit/nuts where possible.
${isFamily ? '6' : '3'}. For dietary constraints, recommend specific variants (e.g., "oat milk" for lactose intolerant, "gluten-free bread" for celiac)
${isFamily ? '7' : '4'}. Include a "dietaryNotes" field explaining any substitutions made for dietary compliance
${isFamily ? '8' : '5'}. Report nutritionInfo.calories PER PERSON (per single serving)
${isFamily ? '9' : '6'}. Each breakfast component should have full ingredients and instructions

Return ONLY a JSON object:
${isFamily ? `{
  "breakfastByDay": {
    "${dayNames[0] || 'monday'}": [
      { "memberName": "${memberNames[0] || 'Person 1'}", "components": [MEAL_COMPONENT] },
      { "memberName": "${memberNames[1] || 'Person 2'}", "components": [MEAL_COMPONENT] }
    ],
    "${dayNames[1] || 'tuesday'}": [...]
  }
}
Generate entries for ALL ${dayNames.length} days and ALL ${memberNames.length || familySize} family members.` : `{
  "breakfastTemplates": [
    {
      "templateLabel": "Template 1: Energizing Start",
      "assignedDays": ["monday", "wednesday", "friday"],
      "components": [MEAL_COMPONENT, ...]
    }
  ]
}`}

Each MEAL_COMPONENT follows this exact schema:
${MEAL_COMPONENT_SCHEMA}`;
}

export function buildLunchPrompt(
  ingredients: string[],
  dietaryConditions: string[],
  familySize: number,
  lunchCuisines: string[],
  breakfastSummary: string,
  glossaryRecipes: RecipeContext[],
  planDays: number,
  dayNames: string[],
  calorieTarget: number | null
): string {
  return `You are a professional nutritionist and chef planning lunches for ${familySize === 1 ? 'an individual' : `a family of ${familySize}`} for ${planDays} days.

${formatIngredientsSection(ingredients)}

DIETARY CONSTRAINTS (MUST FOLLOW ALL):
${dietaryConditions.length > 0 ? dietaryConditions.map((c) => `- ${c}`).join('\n') : '- None'}

CUISINE PREFERENCES FOR LUNCH:
${lunchCuisines.length > 0 ? lunchCuisines.join(', ') : 'Diverse (mix of cuisines)'}
${lunchCuisines.length > 0 ? `CRITICAL: ALL lunch dishes MUST be ${lunchCuisines.join(' or ')} cuisine. Every component (main dish, side, accompaniment) must belong to these cuisines. Do NOT suggest dishes from other cuisines for lunch.` : ''}
${getRegionalContext(lunchCuisines)}
BREAKFAST PLAN (for nutritional balancing — ensure lunches complement breakfast nutrition):
${breakfastSummary}

REFERENCE RECIPES (adapt dishes from this list, filtered to match cuisine preferences above):
${formatRecipeContext(glossaryRecipes)}
${calorieTarget ? `
CALORIE TARGET:
Each lunch should total approximately ${calorieTarget} calories PER PERSON (not total for the family). All nutritionInfo.calories values must be per single serving.` : ''}

REQUIREMENTS:
1. Generate ${planDays} lunches, one for each day: ${dayNames.join(', ')}
2. Each lunch should have 3-4 components (main dish, side, accompaniment, optional salad/raita)
3. Adapt recipes from the reference list where possible. If reference recipes don't match the required cuisine, use well-known traditional dishes from the specified cuisine(s) instead.
4. Each meal should be nutritionally balanced (protein + carbs + vegetables)
5. Vary the dishes across days — don't repeat the same main dish
6. Scale ingredient quantities for ${familySize} ${familySize === 1 ? 'person' : 'people'}, but report nutritionInfo.calories PER PERSON
7. Include "dietaryNotes" for any substitutions
8. For Indian meals: include components like dal, sabzi, roti/rice, raita where appropriate
9. For Western meals: include protein, starch, vegetable components
${lunchCuisines.length > 0 ? `10. CUISINE RULE: Every single dish must be authentically ${lunchCuisines.join('/')}. This overrides reference recipe suggestions if they don't match the cuisine.` : ''}

Return ONLY a JSON object:
{
  "lunches": [
    {
      "day": "monday",
      "components": [MEAL_COMPONENT, MEAL_COMPONENT, ...]
    }
  ]
}

Each MEAL_COMPONENT follows this exact schema:
${MEAL_COMPONENT_SCHEMA}`;
}

export function buildDinnerPrompt(
  ingredients: string[],
  dietaryConditions: string[],
  familySize: number,
  dinnerCuisines: string[],
  priorMealsSummary: string,
  glossaryRecipes: RecipeContext[],
  planDays: number,
  dayNames: string[],
  calorieTarget: number | null
): string {
  return `You are a professional nutritionist and chef planning dinners for ${familySize === 1 ? 'an individual' : `a family of ${familySize}`} for ${planDays} days.

${formatIngredientsSection(ingredients)}

DIETARY CONSTRAINTS (MUST FOLLOW ALL):
${dietaryConditions.length > 0 ? dietaryConditions.map((c) => `- ${c}`).join('\n') : '- None'}

CUISINE PREFERENCES FOR DINNER:
${dinnerCuisines.length > 0 ? dinnerCuisines.join(', ') : 'Diverse (mix of cuisines)'}
${dinnerCuisines.length > 0 ? `CRITICAL: ALL dinner dishes MUST be ${dinnerCuisines.join(' or ')} cuisine. Every component must belong to these cuisines. Do NOT suggest dishes from other cuisines for dinner.` : ''}
${getRegionalContext(dinnerCuisines)}
TODAY'S BREAKFAST & LUNCH (vary dinner to avoid repetition and balance nutrition):
${priorMealsSummary}

REFERENCE RECIPES (adapt dishes from this list, filtered to match cuisine preferences above):
${formatRecipeContext(glossaryRecipes)}
${calorieTarget ? `
CALORIE TARGET:
Each dinner should total approximately ${calorieTarget} calories PER PERSON (not total for the family). All nutritionInfo.calories values must be per single serving.` : ''}

REQUIREMENTS:
1. Generate ${planDays} dinners, one for each day: ${dayNames.join(', ')}
2. Each dinner should have 3-4 components (main dish, side, accompaniment)
3. Adapt recipes from the reference list where possible. If reference recipes don't match the required cuisine, use well-known traditional dishes from the specified cuisine(s) instead.
4. Dinners should be lighter than lunches where possible (nutritional balance across the day)
5. Do NOT repeat lunch dishes — vary proteins and cooking styles
6. Scale ingredient quantities for ${familySize} ${familySize === 1 ? 'person' : 'people'}, but report nutritionInfo.calories PER PERSON
7. Include "dietaryNotes" for any substitutions
${dinnerCuisines.length > 0 ? `8. CUISINE RULE: Every single dish must be authentically ${dinnerCuisines.join('/')}. This overrides reference recipe suggestions if they don't match the cuisine.` : ''}

Return ONLY a JSON object:
{
  "dinners": [
    {
      "day": "monday",
      "components": [MEAL_COMPONENT, MEAL_COMPONENT, ...]
    }
  ]
}

Each MEAL_COMPONENT follows this exact schema:
${MEAL_COMPONENT_SCHEMA}`;
}
