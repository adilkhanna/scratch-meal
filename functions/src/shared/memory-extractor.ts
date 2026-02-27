import OpenAI from 'openai';

export interface MemoryFact {
  id: string;
  fact: string;
  category: 'preference' | 'household' | 'health' | 'taste' | 'feedback';
  confidence: number;
  source: 'conversation' | 'rating' | 'profile';
  createdAt: string;
}

const MEMORY_EXTRACTION_PROMPT = `Analyze this conversation and extract key facts about the user that would be useful for future cooking conversations. Focus on:

1. Food preferences and dislikes (e.g., "loves spicy food", "doesn't eat mushrooms")
2. Household info (e.g., "cooking for a family of 4", "has a toddler")
3. Health/dietary facts (e.g., "lactose intolerant", "trying to eat less sugar")
4. Cooking habits (e.g., "usually cooks quick weeknight meals", "enjoys baking")
5. Recipe feedback (e.g., "loved the butter chicken recipe", "thought the pasta was too bland")

Return ONLY a JSON array of facts. Maximum 5 facts per conversation. Only include facts that are clearly stated or strongly implied:
[
  {"fact": "Description of the fact", "category": "preference|household|health|taste|feedback", "confidence": 0.9}
]

If no memorable facts, return an empty array: []`;

export async function extractMemoryFacts(
  openai: OpenAI,
  transcript: string,
  existingFacts: MemoryFact[]
): Promise<MemoryFact[]> {
  const existingContext = existingFacts.length > 0
    ? `\n\nALREADY KNOWN FACTS (do not repeat these):\n${existingFacts.map((f) => `- ${f.fact}`).join('\n')}`
    : '';

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: MEMORY_EXTRACTION_PROMPT + existingContext },
      { role: 'user', content: transcript },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 500,
    temperature: 0.3,
  });

  const content = response.choices?.[0]?.message?.content;
  if (!content) return [];

  try {
    const parsed = JSON.parse(content);
    const facts = Array.isArray(parsed) ? parsed : parsed.facts || [];
    const now = new Date().toISOString();

    return facts.map((f: { fact: string; category: string; confidence: number }) => ({
      id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      fact: f.fact,
      category: f.category as MemoryFact['category'],
      confidence: f.confidence || 0.7,
      source: 'conversation' as const,
      createdAt: now,
    }));
  } catch {
    return [];
  }
}
