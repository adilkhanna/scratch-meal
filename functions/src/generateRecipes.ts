import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import OpenAI from 'openai';

if (!admin.apps.length) admin.initializeApp();

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

export const generateRecipes = onCall(
  {
    maxInstances: 10,
    timeoutSeconds: 120,
    memory: '256MiB',
    enforceAppCheck: false,
  },
  async (request) => {
    // Auth check
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

    // Fetch API key from Firestore admin-config
    const configSnap = await admin.firestore().doc('admin-config/app').get();
    const openaiKey = configSnap.data()?.openaiApiKey;
    if (!openaiKey) {
      throw new HttpsError('failed-precondition', 'OpenAI API key not configured. Contact the admin.');
    }

    const openai = new OpenAI({ apiKey: openaiKey });
    const prompt = buildRecipePrompt(ingredients, dietaryConditions || [], timeRange);

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a professional chef and recipe developer. Always respond with valid JSON.',
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
