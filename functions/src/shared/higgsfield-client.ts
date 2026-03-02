const HIGGSFIELD_BASE = 'https://platform.higgsfield.ai';
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 40; // 40 * 3s = 120s max wait per image

interface HiggsFieldGenerationResponse {
  request_id: string;
}

interface HiggsFieldPollResponse {
  status: string;
  results?: { raw?: { url?: string } };
  jobs?: Array<{ results?: { raw?: { url?: string } } }>;
}

function buildAuthHeader(apiKey: string, secret: string): string {
  return `Key ${apiKey}:${secret}`;
}

function buildPrompt(recipeName: string, description: string, keyIngredients: string[]): string {
  const ingList = keyIngredients.slice(0, 3).join(', ');
  return `Professional overhead food photography of ${recipeName}. ${description}. Featuring ${ingList}. Clean white plate, bright natural lighting, appetizing presentation, restaurant quality, Zomato style food thumbnail, minimal background, photorealistic.`;
}

async function submitGeneration(
  apiKey: string,
  secret: string,
  prompt: string
): Promise<string> {
  const res = await fetch(`${HIGGSFIELD_BASE}/v1/generations`, {
    method: 'POST',
    headers: {
      'Authorization': buildAuthHeader(apiKey, secret),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'Soul',
      prompt,
      aspect_ratio: '1:1',
      width: 512,
      height: 512,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Higgsfield submit failed (${res.status}): ${text}`);
  }

  const data: HiggsFieldGenerationResponse = await res.json();
  return data.request_id;
}

async function pollForResult(
  apiKey: string,
  secret: string,
  requestId: string
): Promise<string | null> {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

    const res = await fetch(`${HIGGSFIELD_BASE}/v1/generations/${requestId}`, {
      headers: { 'Authorization': buildAuthHeader(apiKey, secret) },
    });

    if (!res.ok) continue;

    const data: HiggsFieldPollResponse = await res.json();

    if (data.status === 'completed') {
      return data.results?.raw?.url || data.jobs?.[0]?.results?.raw?.url || null;
    }

    if (data.status === 'failed' || data.status === 'error') {
      return null;
    }
  }

  return null; // Timed out
}

export async function generateRecipeImage(
  apiKey: string,
  secret: string,
  recipeName: string,
  description: string,
  keyIngredients: string[]
): Promise<string | null> {
  try {
    const prompt = buildPrompt(recipeName, description, keyIngredients);
    const requestId = await submitGeneration(apiKey, secret, prompt);
    return await pollForResult(apiKey, secret, requestId);
  } catch (err) {
    console.error(`Image generation failed for "${recipeName}":`, err);
    return null;
  }
}

export async function generateRecipeImages(
  apiKey: string,
  secret: string,
  recipes: Array<{ name: string; description: string; keyIngredients: string[] }>
): Promise<(string | null)[]> {
  const results = await Promise.allSettled(
    recipes.map((r) => generateRecipeImage(apiKey, secret, r.name, r.description, r.keyIngredients))
  );

  return results.map((r) => (r.status === 'fulfilled' ? r.value : null));
}
