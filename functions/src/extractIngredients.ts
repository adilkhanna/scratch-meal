import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { getOpenAIClient } from './shared/openai-client';
import { extractIngredientsFromImage } from './shared/ingredient-extractor';

if (!admin.apps.length) admin.initializeApp();

export const extractIngredients = onCall(
  {
    maxInstances: 10,
    timeoutSeconds: 60,
    memory: '256MiB',
    enforceAppCheck: false,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be signed in.');
    }

    const { imageBase64 } = request.data;
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      throw new HttpsError('invalid-argument', 'imageBase64 is required.');
    }

    try {
      const { openai } = await getOpenAIClient();
      const ingredients = await extractIngredientsFromImage(openai, imageBase64);
      return { ingredients };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to analyze photo';
      if (message.includes('not configured')) {
        throw new HttpsError('failed-precondition', message);
      }
      throw new HttpsError('internal', message);
    }
  }
);
