import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { getOpenAIClient } from './shared/openai-client';
import { generateRecipesCore } from './shared/recipe-generator';

if (!admin.apps.length) admin.initializeApp();

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

    const { ingredients, dietaryConditions, timeRange, cuisines } = request.data;
    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      throw new HttpsError('invalid-argument', 'ingredients array is required.');
    }
    if (!timeRange) {
      throw new HttpsError('invalid-argument', 'timeRange is required.');
    }

    try {
      const { openai, spoonacularKey } = await getOpenAIClient();
      const result = await generateRecipesCore(
        openai,
        ingredients,
        dietaryConditions || [],
        timeRange,
        spoonacularKey,
        cuisines || []
      );
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate recipes';
      if (message === 'DIETARY_COMPLIANCE_FAILED') {
        throw new HttpsError('not-found',
          'We couldn\'t find enough recipes that meet your dietary conditions. Try adding more ingredients or adjusting your dietary preferences.');
      }
      if (message === 'NOT_ENOUGH_RECIPES') {
        throw new HttpsError('not-found',
          'We couldn\'t find enough recipes with these ingredients. Try adding more ingredients to work with.');
      }
      if (message === 'RECIPE_SOURCE_UNAVAILABLE' || message.includes('not configured')) {
        throw new HttpsError('failed-precondition',
          'Recipe service is temporarily unavailable. Please try again later.');
      }
      throw new HttpsError('internal', message);
    }
  }
);
