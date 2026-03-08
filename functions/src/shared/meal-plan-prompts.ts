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
  if (recipes.length === 0) return 'No reference recipes available — use only well-known, standard dishes.';
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
}`;

export function buildBreakfastPrompt(
  ingredients: string[],
  dietaryConditions: string[],
  familySize: number,
  breakfastPrefs: BreakfastPref[],
  glossaryRecipes: RecipeContext[],
  planDays: number
): string {
  const isFamily = familySize > 1;

  return `You are a professional nutritionist and chef planning breakfasts for ${isFamily ? `a family of ${familySize}` : 'an individual'}.

AVAILABLE INGREDIENTS:
${ingredients.map((i) => `- ${i}`).join('\n')}

DIETARY CONSTRAINTS (MUST FOLLOW ALL):
${dietaryConditions.length > 0 ? dietaryConditions.map((c) => `- ${c}`).join('\n') : '- None'}

${isFamily && breakfastPrefs.length > 0 ? `FAMILY MEMBER BREAKFAST PREFERENCES:\n${breakfastPrefs.map((p) => `- ${p.memberName}: prefers ${p.preferences.join(', ')}`).join('\n')}` : ''}

REFERENCE RECIPES (use these as inspiration — adapt or use directly):
${formatRecipeContext(glossaryRecipes)}

REQUIREMENTS:
1. ${isFamily ? 'Generate 5 breakfast OPTIONS that family members can choose from each day. Each option should be a complete breakfast.' : `Generate 5 rotating breakfast templates for ${planDays} days. Most people rotate 4-5 breakfasts.`}
2. Each breakfast should be BALANCED: include protein, carbs, and fruit/nuts where possible.
3. ONLY use dishes from the reference recipes above OR well-known standard breakfast dishes (oatmeal, toast, eggs, smoothie, etc.)
4. For dietary constraints, recommend specific variants (e.g., "oat milk" for lactose intolerant, "gluten-free bread" for celiac)
5. Include a "dietaryNotes" field explaining any substitutions made for dietary compliance
6. Scale ingredient quantities for ${familySize} ${familySize === 1 ? 'person' : 'people'}
7. Each breakfast component should have full ingredients and instructions

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
  dayNames: string[]
): string {
  return `You are a professional nutritionist and chef planning lunches for ${familySize === 1 ? 'an individual' : `a family of ${familySize}`} for ${planDays} days.

AVAILABLE INGREDIENTS:
${ingredients.map((i) => `- ${i}`).join('\n')}

DIETARY CONSTRAINTS (MUST FOLLOW ALL):
${dietaryConditions.length > 0 ? dietaryConditions.map((c) => `- ${c}`).join('\n') : '- None'}

CUISINE PREFERENCES FOR LUNCH:
${lunchCuisines.length > 0 ? lunchCuisines.join(', ') : 'Diverse (mix of cuisines)'}

BREAKFAST PLAN (for nutritional balancing — ensure lunches complement breakfast nutrition):
${breakfastSummary}

REFERENCE RECIPES (use these as your primary source — adapt for available ingredients):
${formatRecipeContext(glossaryRecipes)}

REQUIREMENTS:
1. Generate ${planDays} lunches, one for each day: ${dayNames.join(', ')}
2. Each lunch should have 3-4 components (main dish, side, accompaniment, optional salad/raita)
3. ONLY use dishes from the reference recipes above OR well-known standard dishes from the specified cuisines
4. Each meal should be nutritionally balanced (protein + carbs + vegetables)
5. Vary the dishes across days — don't repeat the same main dish
6. Scale quantities for ${familySize} ${familySize === 1 ? 'person' : 'people'}
7. Include "dietaryNotes" for any substitutions
8. For Indian meals: include components like dal, sabzi, roti/rice, raita where appropriate
9. For Western meals: include protein, starch, vegetable components

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
  dayNames: string[]
): string {
  return `You are a professional nutritionist and chef planning dinners for ${familySize === 1 ? 'an individual' : `a family of ${familySize}`} for ${planDays} days.

AVAILABLE INGREDIENTS:
${ingredients.map((i) => `- ${i}`).join('\n')}

DIETARY CONSTRAINTS (MUST FOLLOW ALL):
${dietaryConditions.length > 0 ? dietaryConditions.map((c) => `- ${c}`).join('\n') : '- None'}

CUISINE PREFERENCES FOR DINNER:
${dinnerCuisines.length > 0 ? dinnerCuisines.join(', ') : 'Diverse (mix of cuisines)'}

TODAY'S BREAKFAST & LUNCH (vary dinner to avoid repetition and balance nutrition):
${priorMealsSummary}

REFERENCE RECIPES (use these as your primary source — adapt for available ingredients):
${formatRecipeContext(glossaryRecipes)}

REQUIREMENTS:
1. Generate ${planDays} dinners, one for each day: ${dayNames.join(', ')}
2. Each dinner should have 3-4 components (main dish, side, accompaniment)
3. ONLY use dishes from the reference recipes above OR well-known standard dishes
4. Dinners should be lighter than lunches where possible (nutritional balance across the day)
5. Do NOT repeat lunch dishes — vary proteins and cooking styles
6. Scale quantities for ${familySize} ${familySize === 1 ? 'person' : 'people'}
7. Include "dietaryNotes" for any substitutions

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
