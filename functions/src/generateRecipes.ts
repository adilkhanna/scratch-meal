import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import OpenAI from 'openai';

if (!admin.apps.length) admin.initializeApp();

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
  timeRange: string
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

function buildRAGPrompt(
  ingredients: string[],
  dietaryConditions: string[],
  timeRange: string,
  realRecipes: SpoonacularRecipeDetail[]
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
6. Include at least one "Easy" difficulty recipe

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
  if (!res.ok) throw new Error(`Spoonacular search failed: ${res.status}`);
  return res.json();
}

async function getSpoonacularRecipeDetails(
  apiKey: string,
  ids: number[]
): Promise<SpoonacularRecipeDetail[]> {
  const url = `https://api.spoonacular.com/recipes/informationBulk?ids=${ids.join(',')}&apiKey=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Spoonacular details failed: ${res.status}`);
  return res.json();
}

// --- Main Cloud Function ---

export const generateRecipes = onCall(
  {
    maxInstances: 10,
    timeoutSeconds: 120,
    memory: '256MiB',
    enforceAppCheck: false,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be signed in.');
    }

    const { ingredients, dietaryConditions, timeRange } = request.data;
    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      throw new HttpsError('invalid-argument', 'ingredients array is required.');
    }
    if (!timeRange) {
      throw new HttpsError('invalid-argument', 'timeRange is required.');
    }

    const configSnap = await admin.firestore().doc('admin-config/app').get();
    const configData = configSnap.data();
    const openaiKey = configData?.openaiApiKey;
    const spoonacularKey = configData?.spoonacularApiKey;

    if (!openaiKey) {
      throw new HttpsError('failed-precondition', 'OpenAI API key not configured. Contact the admin.');
    }

    const openai = new OpenAI({ apiKey: openaiKey });
    const conditions = dietaryConditions || [];

    // Try RAG path if Spoonacular key is configured
    let prompt: string;
    let useRAG = false;

    if (spoonacularKey) {
      try {
        const searchResults = await searchSpoonacular(spoonacularKey, ingredients, 10);
        if (searchResults.length >= 5) {
          const topIds = searchResults.slice(0, 5).map((r) => r.id);
          const details = await getSpoonacularRecipeDetails(spoonacularKey, topIds);
          prompt = buildRAGPrompt(ingredients, conditions, timeRange, details);
          useRAG = true;
        } else {
          // Not enough Spoonacular results, fall back to pure GPT-4o
          prompt = buildRecipePrompt(ingredients, conditions, timeRange);
        }
      } catch (err) {
        // Spoonacular API failed, fall back gracefully
        console.warn('Spoonacular API failed, falling back to pure GPT-4o:', err);
        prompt = buildRecipePrompt(ingredients, conditions, timeRange);
      }
    } else {
      prompt = buildRecipePrompt(ingredients, conditions, timeRange);
    }

    try {
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
      return { recipes: parsed.recipes || [] };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate recipes';
      throw new HttpsError('internal', message);
    }
  }
);
