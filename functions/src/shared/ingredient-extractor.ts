import OpenAI from 'openai';

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

export async function extractIngredientsFromImage(
  openai: OpenAI,
  imageBase64: string
): Promise<string[]> {
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
  return parsed.ingredients || [];
}
