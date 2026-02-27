import * as admin from 'firebase-admin';
import OpenAI from 'openai';

let cachedKey: string | null = null;

export async function getOpenAIClient(): Promise<{ openai: OpenAI; spoonacularKey?: string }> {
  const configSnap = await admin.firestore().doc('admin-config/app').get();
  const configData = configSnap.data();
  const openaiKey = configData?.openaiApiKey;
  const spoonacularKey = configData?.spoonacularApiKey || undefined;

  if (!openaiKey) {
    throw new Error('OpenAI API key not configured. Contact the admin.');
  }

  cachedKey = openaiKey;
  return { openai: new OpenAI({ apiKey: openaiKey }), spoonacularKey };
}
