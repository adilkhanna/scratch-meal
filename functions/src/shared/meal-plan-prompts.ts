/**
 * GPT-4o prompt builders for weekly meal plan generation.
 * Each prompt uses glossary/Spoonacular recipes as RAG context to prevent hallucination.
 */

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
For example, if a dish feeds 3 people and totals 900 cal, report calories as 300.`;

export function buildBreakfastPrompt(
  ingredients: string[],
  dietaryConditions: string[],
  familySize: number,
  breakfastPrefs: BreakfastPref[],
  glossaryRecipes: RecipeContext[],
  planDays: number,
  calorieTarget: number | null
): string {
  const isFamily = familySize > 1;

  return `You are a professional nutritionist and chef planning breakfasts for ${isFamily ? `a family of ${familySize}` : 'an individual'}.

AVAILABLE INGREDIENTS:
${ingredients.map((i) => `- ${i}`).join('\n')}

DIETARY CONSTRAINTS (MUST FOLLOW ALL):
${dietaryConditions.length > 0 ? dietaryConditions.map((c) => `- ${c}`).join('\n') : '- None'}

${isFamily && breakfastPrefs.length > 0 ? `FAMILY MEMBER BREAKFAST PREFERENCES:
${breakfastPrefs.map((p) => `- ${p.memberName}: prefers ${p.preferences.join(', ')}`).join('\n')}
IMPORTANT: Each family member's breakfast preferences MUST be reflected in the options. If a member prefers "oats", at least one option must feature oats prominently.` : ''}

APPROVED BREAKFAST RECIPES (you MUST choose ONLY from this list — do NOT invent new dishes):
${formatRecipeContext(glossaryRecipes)}
${calorieTarget ? `
CALORIE TARGET:
This breakfast should total approximately ${calorieTarget} calories PER PERSON (per single serving, not total for the family). All nutritionInfo.calories values must be per person.` : ''}

STRICT RULES:
- You MUST only use breakfasts from the APPROVED list above. Do NOT create new dishes.
- Do NOT combine ingredients in weird ways (no "paneer smoothie", no "spinach pancake with carrots").
- Every dish you suggest must match a real recipe from the list. You may adapt ingredients slightly for dietary needs, but the dish identity must remain the same.
- NEVER suggest heavy lunch/dinner items (curries, biryani, tandoori, pasta, fried rice, heavy meat dishes).

REQUIREMENTS:
1. ${isFamily ? 'Generate 5 breakfast OPTIONS that family members can choose from each day. Each option should be a complete breakfast.' : `Generate 5 rotating breakfast templates for ${planDays} days. Most people rotate 4-5 breakfasts.`}
2. Each breakfast should be BALANCED: include protein, carbs, and fruit/nuts where possible.
3. For dietary constraints, recommend specific variants (e.g., "oat milk" for lactose intolerant, "gluten-free bread" for celiac)
4. Include a "dietaryNotes" field explaining any substitutions made for dietary compliance
5. Scale ingredient quantities for ${familySize} ${familySize === 1 ? 'person' : 'people'}, but report nutritionInfo.calories PER PERSON
6. Each breakfast component should have full ingredients and instructions

Return ONLY a JSON object:
${isFamily ? `{
  "breakfastOptions": [
    {
      "optionLabel": "Option 1: Oats & Fruit",
      "components": [MEAL_COMPONENT, ...]
    }
  ]
}` : `{
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

AVAILABLE INGREDIENTS:
${ingredients.map((i) => `- ${i}`).join('\n')}

DIETARY CONSTRAINTS (MUST FOLLOW ALL):
${dietaryConditions.length > 0 ? dietaryConditions.map((c) => `- ${c}`).join('\n') : '- None'}

CUISINE PREFERENCES FOR LUNCH:
${lunchCuisines.length > 0 ? lunchCuisines.join(', ') : 'Diverse (mix of cuisines)'}
${lunchCuisines.length > 0 ? `CRITICAL: ALL lunch dishes MUST be ${lunchCuisines.join(' or ')} cuisine. Every component (main dish, side, accompaniment) must belong to these cuisines. Do NOT suggest dishes from other cuisines for lunch.` : ''}

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

AVAILABLE INGREDIENTS:
${ingredients.map((i) => `- ${i}`).join('\n')}

DIETARY CONSTRAINTS (MUST FOLLOW ALL):
${dietaryConditions.length > 0 ? dietaryConditions.map((c) => `- ${c}`).join('\n') : '- None'}

CUISINE PREFERENCES FOR DINNER:
${dinnerCuisines.length > 0 ? dinnerCuisines.join(', ') : 'Diverse (mix of cuisines)'}
${dinnerCuisines.length > 0 ? `CRITICAL: ALL dinner dishes MUST be ${dinnerCuisines.join(' or ')} cuisine. Every component must belong to these cuisines. Do NOT suggest dishes from other cuisines for dinner.` : ''}

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
