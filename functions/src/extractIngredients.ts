import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import OpenAI from 'openai';

if (!admin.apps.length) admin.initializeApp();

const INGREDIENT_EXTRACTION_PROMPT = `You are an expert food recognition AI. Analyze this image and extract ALL visible food ingredients.

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

export const extractIngredients = onCall(
  {
    maxInstances: 10,
    timeoutSeconds: 60,
    memory: '256MiB',
    enforceAppCheck: false,
  },
  async (request) => {
    // Auth check
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be signed in.');
    }

    const { imageBase64 } = request.data;
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      throw new HttpsError('invalid-argument', 'imageBase64 is required.');
    }

    // Fetch API key from Firestore admin-config
    const configSnap = await admin.firestore().doc('admin-config/app').get();
    const openaiKey = configSnap.data()?.openaiApiKey;
    if (!openaiKey) {
      throw new HttpsError('failed-precondition', 'OpenAI API key not configured. Contact the admin.');
    }

    const openai = new OpenAI({ apiKey: openaiKey });

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: INGREDIENT_EXTRACTION_PROMPT },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
              },
            ],
          },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 500,
        temperature: 0.3,
      });

      const content = response.choices?.[0]?.message?.content;
      if (!content) throw new Error('No response from AI');

      const parsed = JSON.parse(content);
      return { ingredients: parsed.ingredients || [] };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to analyze photo';
      throw new HttpsError('internal', message);
    }
  }
);
