import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { INGREDIENT_EXTRACTION_PROMPT } from '@/config/prompts';

export async function POST(request: NextRequest) {
  try {
    const { imageBase64, apiKey } = await request.json();

    if (!apiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    if (!imageBase64) {
      return NextResponse.json({ error: 'Image data is required' }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey });

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

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
    }

    const parsed = JSON.parse(content);
    return NextResponse.json({ ingredients: parsed.ingredients || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to extract ingredients';
    const isAuthError =
      error instanceof Error && (message.includes('API key') || message.includes('401'));
    return NextResponse.json(
      { error: isAuthError ? 'Invalid API key. Please check your settings.' : message },
      { status: isAuthError ? 401 : 500 }
    );
  }
}
