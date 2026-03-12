/**
 * GPT-4o prompt builders for weekly meal plan generation.
 * Breakfast is code-selected (no GPT). Lunch/dinner use GPT with strict anti-hallucination rules.
 * Each prompt uses glossary/Spoonacular recipes as RAG context.
 */

import * as fs from 'fs';
import * as path from 'path';
import { EXPENSIVE_INGREDIENTS } from './breakfast-selector';

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

function formatRecipeContext(recipes: RecipeContext[]): string {
  if (recipes.length === 0) {
    return 'WARNING: No reference recipes provided. You MUST only suggest well-known, widely-recognized traditional dishes that any chef would know. Do NOT invent new dish names or combine ingredients in novel ways. Every dish must be a real, established recipe.';
  }
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

function formatIngredientExclusions(ingredientsByDay: Record<string, string[]>, dayNames: string[], label: string): string {
  const lines: string[] = [];
  for (const day of dayNames) {
    const ingredients = ingredientsByDay[day] || [];
    if (ingredients.length > 0) {
      lines.push(`  ${day}: ${ingredients.slice(0, 10).join(', ')}`);
    }
  }
  if (lines.length === 0) return '';
  return `\nINGREDIENT EXCLUSIONS PER DAY (do NOT repeat these ${label} ingredients in this meal):
${lines.join('\n')}
IMPORTANT: If breakfast uses avocado on Monday, do NOT use avocado in Monday's lunch or dinner. Vary the key ingredients across meals each day.\n`;
}

function formatBudgetGuidance(weeklyBudget: number | null): string {
  if (!weeklyBudget) return '';
  if (weeklyBudget <= 1500) {
    return `\nBUDGET CONSTRAINT: Weekly budget is ₹${weeklyBudget}. AVOID expensive ingredients: ${EXPENSIVE_INGREDIENTS.slice(0, 10).join(', ')}. Use economical alternatives (e.g., banana instead of avocado, regular oats instead of quinoa, chicken instead of salmon).\n`;
  }
  if (weeklyBudget <= 3000) {
    return `\nBUDGET NOTE: Weekly budget is ₹${weeklyBudget}. LIMIT expensive ingredients (avocado, quinoa, salmon, prawns) to max 1-2 uses across the entire week.\n`;
  }
  return '';
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

const ANTI_HALLUCINATION_RULES = `
CRITICAL ANTI-HALLUCINATION RULES:
- Every dish you suggest MUST be a real, recognizable dish that exists in cookbooks or food websites.
- Do NOT combine random ingredients into novel creations (no "Corn Avocado Salsa with Smoothie", no "Spinach Banana Oat Bowl", no "Paneer Quinoa Wrap with Mango").
- Do NOT invent new dish names. Use established names only (e.g., "Dal Tadka", "Pasta Primavera", "Tom Yum Soup").
- If adapting for dietary needs, make MINIMAL substitutions only — the dish identity must remain the same.
- When in doubt, pick a simpler, more traditional dish rather than a creative combination.`;

export function buildLunchPrompt(
  ingredients: string[],
  dietaryConditions: string[],
  familySize: number,
  lunchCuisines: string[],
  breakfastSummary: string,
  glossaryRecipes: RecipeContext[],
  planDays: number,
  dayNames: string[],
  calorieTarget: number | null,
  breakfastIngredientsByDay: Record<string, string[]>,
  weeklyBudget: number | null
): string {
  return `You are a professional nutritionist and chef planning lunches for ${familySize === 1 ? 'an individual' : `a family of ${familySize}`} for ${planDays} days.

${formatIngredientsSection(ingredients)}

DIETARY CONSTRAINTS (MUST FOLLOW ALL):
${dietaryConditions.length > 0 ? dietaryConditions.map((c) => `- ${c}`).join('\n') : '- None'}

CUISINE PREFERENCES FOR LUNCH:
${lunchCuisines.length > 0 ? lunchCuisines.join(', ') : 'Diverse (mix of cuisines)'}
${lunchCuisines.length > 0 ? `CRITICAL: ALL lunch dishes MUST be ${lunchCuisines.join(' or ')} cuisine. Every component (main dish, side, accompaniment) must belong to these cuisines. Do NOT suggest dishes from other cuisines for lunch.` : ''}
${getRegionalContext(lunchCuisines)}
BREAKFAST INGREDIENTS (do NOT repeat these in lunch):
${breakfastSummary}
${formatIngredientExclusions(breakfastIngredientsByDay, dayNames, 'breakfast')}${formatBudgetGuidance(weeklyBudget)}
REFERENCE RECIPES (you MUST select dishes from this list — adapt minimally for dietary needs):
${formatRecipeContext(glossaryRecipes)}
${calorieTarget ? `
CALORIE TARGET:
Each lunch should total approximately ${calorieTarget} calories PER PERSON (not total for the family). All nutritionInfo.calories values must be per single serving.` : ''}
${ANTI_HALLUCINATION_RULES}

REQUIREMENTS:
1. Generate ${planDays} lunches, one for each day: ${dayNames.join(', ')}
2. Each lunch should have 3-4 components (main dish, side, accompaniment, optional salad/raita)
3. You MUST select dishes from the REFERENCE RECIPES list above. Pick the closest match and adapt minimally for cuisine/dietary needs. Do NOT invent new dish names.
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
  calorieTarget: number | null,
  priorIngredientsByDay: Record<string, string[]>,
  weeklyBudget: number | null
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
${formatIngredientExclusions(priorIngredientsByDay, dayNames, 'breakfast + lunch')}${formatBudgetGuidance(weeklyBudget)}
REFERENCE RECIPES (you MUST select dishes from this list — adapt minimally for dietary needs):
${formatRecipeContext(glossaryRecipes)}
${calorieTarget ? `
CALORIE TARGET:
Each dinner should total approximately ${calorieTarget} calories PER PERSON (not total for the family). All nutritionInfo.calories values must be per single serving.` : ''}
${ANTI_HALLUCINATION_RULES}

REQUIREMENTS:
1. Generate ${planDays} dinners, one for each day: ${dayNames.join(', ')}
2. Each dinner should have 3-4 components (main dish, side, accompaniment)
3. You MUST select dishes from the REFERENCE RECIPES list above. Pick the closest match and adapt minimally for cuisine/dietary needs. Do NOT invent new dish names.
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
