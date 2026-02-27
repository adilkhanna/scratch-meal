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

    const { ingredients, dietaryConditions, timeRange } = request.data;
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
        spoonacularKey
      );
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate recipes';
      if (message.includes('not configured')) {
        throw new HttpsError('failed-precondition', message);
      }
      throw new HttpsError('internal', message);
    }
  }
);
