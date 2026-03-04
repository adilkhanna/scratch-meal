import OpenAI from 'openai';
import { estimateRecipeCost } from './ingredient-prices';

// --- Spoonacular types ---
interface SpoonacularSearchResult {
  id: number;
  title: string;
  usedIngredientCount: number;
  missedIngredientCount: number;
}

interface SpoonacularRecipeDetail {
  id: number;
  title: string;
  sourceUrl: string;
  readyInMinutes: number;
  servings: number;
  extendedIngredients: { original: string; name: string; amount: number; unit: string }[];
  analyzedInstructions: { steps: { number: number; step: string }[] }[];
  summary: string;
}

// --- Prompt builders ---

function buildRecipePrompt(
  ingredients: string[],
  dietaryConditions: string[],
  timeRange: string,
  cuisines: string[] = []
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
4. ${cuisines.length > 0 ? `Focus on these cuisines: ${cuisines.join(', ')}. Distribute the 5 recipes across the selected cuisines.` : 'Provide 5 DIVERSE recipes (different cuisines and cooking methods)'}
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

function buildRAGPrompt(
  ingredients: string[],
  dietaryConditions: string[],
  timeRange: string,
  realRecipes: SpoonacularRecipeDetail[],
  cuisines: string[] = []
): string {
  const maxMinutes = parseInt(timeRange);

  const recipeContext = realRecipes.map((r, i) => {
    const steps = r.analyzedInstructions?.[0]?.steps?.map((s) => s.step) || [];
    const ings = r.extendedIngredients?.map((e) => e.original) || [];
    return `RECIPE ${i + 1}: "${r.title}" (${r.readyInMinutes} min, serves ${r.servings})
Ingredients: ${ings.join('; ')}
Steps: ${steps.join(' ')}`;
  }).join('\n\n');

  return `You are a professional chef. You have 5 REAL recipes as reference. Adapt each one to create a practical version using ONLY the user's available ingredients while respecting dietary constraints and time limits.

AVAILABLE INGREDIENTS:
${ingredients.map((i) => `- ${i}`).join('\n')}

DIETARY CONSTRAINTS (MUST FOLLOW ALL):
${dietaryConditions.length > 0 ? dietaryConditions.map((c) => `- ${c}`).join('\n') : '- None'}

TIME CONSTRAINT: Maximum ${maxMinutes} minutes total (prep + cooking)

REFERENCE RECIPES (adapt these — keep the essence but modify for the user's ingredients and constraints):
${recipeContext}

REQUIREMENTS:
1. Produce exactly 5 adapted recipes (one per reference recipe above)
2. Each recipe MUST primarily use the user's available ingredients (you may assume basic pantry staples)
3. Each recipe MUST comply with ALL dietary constraints
4. Each recipe MUST be completable within ${maxMinutes} minutes — if a reference recipe takes longer, simplify it
5. Keep the spirit/name of the original recipe but adapt ingredients and steps as needed
6. Include at least one "Easy" difficulty recipe${cuisines.length > 0 ? `\n7. Prefer recipes from these cuisines: ${cuisines.join(', ')}.` : ''}

Return ONLY a JSON object with this EXACT structure:
{
  "recipes": [
    {
      "name": "Adapted Recipe Name",
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
      },
      "sourceRecipe": {
        "title": "Original Recipe Title",
        "sourceUrl": "original recipe URL",
        "spoonacularId": 12345
      }
    }
  ]
}`;
}

// --- Spoonacular API helpers ---

async function searchSpoonacular(
  apiKey: string,
  ingredients: string[],
  count: number
): Promise<SpoonacularSearchResult[]> {
  const url = `https://api.spoonacular.com/recipes/findByIngredients?ingredients=${encodeURIComponent(ingredients.join(','))}&number=${count}&ranking=1&ignorePantry=true&apiKey=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 402) throw new Error('SPOONACULAR_QUOTA_EXCEEDED');
    throw new Error(`Spoonacular search failed: ${res.status}`);
  }
  return res.json();
}

async function getSpoonacularRecipeDetails(
  apiKey: string,
  ids: number[]
): Promise<SpoonacularRecipeDetail[]> {
  const url = `https://api.spoonacular.com/recipes/informationBulk?ids=${ids.join(',')}&apiKey=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 402) throw new Error('SPOONACULAR_QUOTA_EXCEEDED');
    throw new Error(`Spoonacular details failed: ${res.status}`);
  }
  return res.json();
}

// --- Dietary compliance reviewer ---

async function reviewDietaryCompliance(
  openai: OpenAI,
  recipes: SpoonacularRecipeDetail[],
  dietaryConditions: string[]
): Promise<SpoonacularRecipeDetail[]> {
  if (dietaryConditions.length === 0) return recipes;

  const recipeSummaries = recipes.map((r, i) => {
    const ings = r.extendedIngredients?.map((e) => e.name) || [];
    return `${i}: "${r.title}" — Ingredients: ${ings.join(', ')}`;
  }).join('\n');

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a dietary compliance reviewer. Analyze recipes and determine which ones are SAFE given the user\'s dietary conditions. Always respond with valid JSON.',
      },
      {
        role: 'user',
        content: `Review these recipes for compliance with ALL of the following dietary conditions:
${dietaryConditions.map((c) => `- ${c}`).join('\n')}

RECIPES:
${recipeSummaries}

For each recipe, determine if it is SAFE (compliant with ALL conditions) or UNSAFE (violates any condition).
Return ONLY a JSON object: { "safe": [array of recipe index numbers that are compliant] }
Only mark a recipe UNSAFE if it clearly and obviously violates a condition based on its listed ingredients. Do not reject recipes based on speculation about hidden ingredients or trace amounts.`,
      },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 200,
    temperature: 0,
  });

  const content = response.choices?.[0]?.message?.content;
  if (!content) return recipes; // fallback: return all if review fails

  try {
    const parsed = JSON.parse(content);
    const safeIndices: number[] = parsed.safe || [];
    const compliant = safeIndices
      .filter((i) => i >= 0 && i < recipes.length)
      .map((i) => recipes[i]);
    return compliant.length > 0 ? compliant : recipes; // fallback if all rejected
  } catch {
    return recipes; // fallback on parse error
  }
}

// --- Core recipe generation ---

export interface GeneratedRecipes {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recipes: any[];
  pricesAsOf?: string | null;
}

export async function generateRecipesCore(
  openai: OpenAI,
  ingredients: string[],
  dietaryConditions: string[],
  timeRange: string,
  spoonacularKey?: string,
  cuisines: string[] = [],
  useMandiPrices: boolean = false
): Promise<GeneratedRecipes> {
  let prompt: string;
  let useRAG = false;

  console.log(`[recipe-gen] Starting: ${ingredients.length} ingredients, ${dietaryConditions.length} dietary conditions, time=${timeRange}, cuisines=${cuisines.join(',')}`);

  if (!spoonacularKey) {
    console.error('[recipe-gen] No Spoonacular key configured!');
    throw new Error('RECIPE_SOURCE_UNAVAILABLE');
  }

  try {
    console.log('[recipe-gen] Searching Spoonacular...');
    const searchResults = await searchSpoonacular(spoonacularKey, ingredients, 15);
    console.log(`[recipe-gen] Spoonacular returned ${searchResults.length} results`);
    if (searchResults.length < 3) {
      throw new Error('NOT_ENOUGH_RECIPES');
    }

    const topIds = searchResults.slice(0, 10).map((r) => r.id);
    const details = await getSpoonacularRecipeDetails(spoonacularKey, topIds);
    console.log(`[recipe-gen] Got ${details.length} recipe details`);

    // Review dietary compliance before using as RAG context
    const compliant = await reviewDietaryCompliance(openai, details, dietaryConditions);
    console.log(`[recipe-gen] ${compliant.length} recipes passed dietary review`);
    const finalRecipes = compliant.slice(0, 5);

    if (finalRecipes.length < 2) {
      throw new Error('DIETARY_COMPLIANCE_FAILED');
    }

    prompt = buildRAGPrompt(ingredients, dietaryConditions, timeRange, finalRecipes, cuisines);
    useRAG = true;
  } catch (err) {
    console.error('Recipe generation pipeline error:', err);
    if (err instanceof Error && ['DIETARY_COMPLIANCE_FAILED', 'NOT_ENOUGH_RECIPES', 'RECIPE_SOURCE_UNAVAILABLE', 'SPOONACULAR_QUOTA_EXCEEDED'].includes(err.message)) {
      throw err; // re-throw known errors
    }
    throw new Error('RECIPE_SOURCE_UNAVAILABLE');
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: useRAG
          ? 'You are a professional chef adapting real recipes. Always respond with valid JSON.'
          : 'You are a professional chef and recipe developer. Always respond with valid JSON.',
      },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 4000,
    temperature: 0.7,
  });

  const content = response.choices?.[0]?.message?.content;
  if (!content) throw new Error('No response from AI');

  const parsed = JSON.parse(content);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const costResults = await Promise.all(
    (parsed.recipes || []).map(async (recipe: any) => {
      const servings = recipe.nutritionInfo?.servings || 2;
      const { costPerServing, pricesAsOf: recipePricesAsOf } = await estimateRecipeCost(
        recipe.ingredients || [],
        servings,
        useMandiPrices
      );
      return { ...recipe, estimatedCostPerServing: costPerServing, _pricesAsOf: recipePricesAsOf };
    })
  );

  // Extract pricesAsOf from first recipe (same for all since they share the same mandi cache)
  const pricesAsOf = costResults[0]?._pricesAsOf || null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recipesWithCost = costResults.map(({ _pricesAsOf, ...recipe }: any) => recipe);
  console.log(`[recipe-gen] Cost estimates${pricesAsOf ? ' (live mandi)' : ' (hardcoded)'}: ${recipesWithCost.map((r: { name: string; estimatedCostPerServing: number }) => `${r.name}=₹${r.estimatedCostPerServing}`).join(', ')}`);
  return { recipes: recipesWithCost, pricesAsOf };
}
