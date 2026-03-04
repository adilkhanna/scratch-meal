import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { getOpenAIClient } from './shared/openai-client';
import { generateRecipesCore } from './shared/recipe-generator';
import { generateRecipeImages } from './shared/higgsfield-client';

if (!admin.apps.length) admin.initializeApp();

export const generateRecipes = onCall(
  {
    maxInstances: 10,
    timeoutSeconds: 300,
    memory: '512MiB',
    enforceAppCheck: false,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be signed in.');
    }

    const { ingredients, dietaryConditions, timeRange, cuisines, weeklyBudget } = request.data;
    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      throw new HttpsError('invalid-argument', 'ingredients array is required.');
    }
    if (!timeRange) {
      throw new HttpsError('invalid-argument', 'timeRange is required.');
    }

    try {
      const { openai, spoonacularKey, higgsFieldApiKey, higgsFieldSecret, higgsFieldEnabled } = await getOpenAIClient();
      const result = await generateRecipesCore(
        openai,
        ingredients,
        dietaryConditions || [],
        timeRange,
        spoonacularKey,
        cuisines || []
      );

      // Image generation (graceful degradation)
      if (higgsFieldEnabled && higgsFieldApiKey && higgsFieldSecret && result.recipes.length > 0) {
        try {
          const imageUrls = await generateRecipeImages(
            higgsFieldApiKey,
            higgsFieldSecret,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            result.recipes.map((r: any) => ({
              name: r.name,
              description: r.description,
              keyIngredients: r.keyIngredients || [],
            }))
          );

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          result.recipes = result.recipes.map((recipe: any, i: number) => ({
            ...recipe,
            imageUrl: imageUrls[i] || undefined,
          }));
        } catch (imgErr) {
          console.error('Image generation batch failed (non-blocking):', imgErr);
        }
      }

      return result;
    } catch (err: unknown) {
      console.error('generateRecipes error:', err);
      const message = err instanceof Error ? err.message : 'Failed to generate recipes';
      if (message === 'DIETARY_COMPLIANCE_FAILED') {
        throw new HttpsError('not-found',
          'We couldn\'t find enough recipes that meet your dietary conditions. Try adding more ingredients or adjusting your dietary preferences.');
      }
      if (message === 'NOT_ENOUGH_RECIPES') {
        throw new HttpsError('not-found',
          'We couldn\'t find enough recipes with these ingredients. Try adding more ingredients to work with.');
      }
      if (message === 'SPOONACULAR_QUOTA_EXCEEDED') {
        throw new HttpsError('resource-exhausted',
          'Daily recipe limit reached. The recipe database resets every 24 hours — please try again tomorrow!');
      }
      if (message === 'RECIPE_SOURCE_UNAVAILABLE' || message.includes('not configured')) {
        throw new HttpsError('failed-precondition',
          'Recipe service is temporarily unavailable. Please try again later.');
      }
      throw new HttpsError('internal', message);
    }
  }
);
