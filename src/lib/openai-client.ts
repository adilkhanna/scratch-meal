'use client';

import { INGREDIENT_EXTRACTION_PROMPT, buildRecipePrompt } from '@/config/prompts';
import { TimeRange } from '@/types';

// Call OpenAI directly from the browser — no server-side API route needed.
// The API key is the user's own key stored in their localStorage.

export async function extractIngredientsFromPhoto(
  imageBase64: string,
  apiKey: string
): Promise<string[]> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
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
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 401) throw new Error('Invalid API key. Please check your settings.');
    throw new Error(err?.error?.message || 'Failed to analyze photo');
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('No response from AI');

  const parsed = JSON.parse(content);
  return parsed.ingredients || [];
}

export async function generateRecipes(
  ingredients: string[],
  dietaryConditions: string[],
  timeRange: TimeRange,
  apiKey: string
) {
  const prompt = buildRecipePrompt(ingredients, dietaryConditions, timeRange);

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
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
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 401) throw new Error('Invalid API key. Please check your settings.');
    throw new Error(err?.error?.message || 'Failed to generate recipes');
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('No response from AI');

  const parsed = JSON.parse(content);
  return parsed.recipes || [];
}
