import { TimeRange } from '@/types';

export const INGREDIENT_EXTRACTION_PROMPT = `You are an expert food recognition AI. Analyze this image and extract ALL visible food ingredients.

RULES:
1. Identify individual ingredients, not dishes or meals
2. Be specific (e.g., "red bell pepper" not just "pepper")
3. If something is unclear, make your best educated guess
4. Return only ingredient names
5. Use common English names

Return ONLY a JSON object:
{
  "ingredients": ["ingredient1", "ingredient2", ...]
}`;

export function buildRecipePrompt(
  ingredients: string[],
  dietaryConditions: string[],
  timeRange: TimeRange
): string {
  const maxMinutes = parseInt(timeRange);

  return `You are a professional chef. Create exactly 5 unique, practical recipes using the available ingredients while respecting ALL dietary constraints.

AVAILABLE INGREDIENTS:
${ingredients.map((i) => `- ${i}`).join('\n')}

DIETARY CONSTRAINTS (MUST FOLLOW ALL):
${dietaryConditions.length > 0 ? dietaryConditions.map((c) => `- ${c}`).join('\n') : '- None'}

TIME CONSTRAINT: Maximum ${maxMinutes} minutes total (prep + cooking)

REQUIREMENTS:
1. Each recipe MUST primarily use the available ingredients (you may assume basic pantry staples like salt, pepper, oil, water)
2. Each recipe MUST comply with ALL dietary constraints listed
3. Each recipe MUST be completable within ${maxMinutes} minutes
4. Provide 5 DIVERSE recipes (different cuisines and cooking methods)
5. Include at least one "Easy" difficulty recipe

Return ONLY a JSON object with this EXACT structure:
{
  "recipes": [
    {
      "name": "Recipe Name",
      "description": "Brief appetizing 2-sentence description",
      "cookTime": "${maxMinutes} minutes or less",
      "difficulty": "Easy" | "Medium" | "Hard",
      "keyIngredients": ["main ingredient 1", "main ingredient 2", "main ingredient 3"],
      "ingredients": [
        { "name": "ingredient", "quantity": "1", "unit": "cup" }
      ],
      "instructions": ["Step 1...", "Step 2..."],
      "tips": ["Helpful tip"],
      "nutritionInfo": {
        "servings": 2,
        "calories": 350,
        "protein": "25g",
        "carbs": "30g",
        "fat": "15g"
      }
    }
  ]
}`;
}
