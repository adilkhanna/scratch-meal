import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { buildRecipePrompt } from '@/config/prompts';
import { TimeRange } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { ingredients, dietaryConditions, timeRange, apiKey } = await request.json();

    if (!apiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    if (!ingredients || ingredients.length === 0) {
      return NextResponse.json({ error: 'At least one ingredient is required' }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey });

    const prompt = buildRecipePrompt(
      ingredients as string[],
      dietaryConditions as string[],
      timeRange as TimeRange
    );

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

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
    }

    const parsed = JSON.parse(content);
    return NextResponse.json({ recipes: parsed.recipes || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to generate recipes';
    const isAuthError =
      error instanceof Error && (message.includes('API key') || message.includes('401'));
    return NextResponse.json(
      { error: isAuthError ? 'Invalid API key. Please check your settings.' : message },
      { status: isAuthError ? 401 : 500 }
    );
  }
}
