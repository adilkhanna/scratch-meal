// Higgsfield AI V2 API — text-to-image generation
// Docs: https://github.com/higgsfield-ai/higgsfield-js (official SDK source)
// Auth: Authorization: Key {apiKey}:{secret}
// Submit: POST /{model-endpoint} → { request_id, status_url }
// Poll: GET /requests/{request_id}/status → { status, images: [{ url }] }

const HIGGSFIELD_BASE = 'https://platform.higgsfield.ai';
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 40; // 40 * 3s = 120s max wait per image

// V2 model endpoint (no /v1/ prefix)
const MODEL_ENDPOINT = 'flux-pro/kontext/max/text-to-image';

interface SubmitResponse {
  request_id: string;
  status_url?: string;
}

interface PollResponse {
  status: string;
  request_id?: string;
  images?: Array<{ url: string }>;
  // Fallback shapes in case API returns differently
  output_url?: string;
  result?: { url?: string };
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
  const url = `${HIGGSFIELD_BASE}/${MODEL_ENDPOINT}`;
  const body = {
    input: {
      prompt,
      aspect_ratio: '1:1',
      safety_tolerance: 2,
    },
  };

  console.log(`[higgsfield] Submitting to ${MODEL_ENDPOINT}...`);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': buildAuthHeader(apiKey, secret),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`[higgsfield] Submit failed (${res.status}): ${text}`);
    throw new Error(`Higgsfield submit failed (${res.status}): ${text}`);
  }

  const data: SubmitResponse = await res.json();
  console.log(`[higgsfield] Submit success, request_id: ${data.request_id}`);
  return data.request_id;
}

function extractImageUrl(data: PollResponse): string | null {
  // V2 format: images array
  if (data.images && data.images.length > 0 && data.images[0].url) {
    return data.images[0].url;
  }
  // Fallbacks
  if (data.output_url) return data.output_url;
  if (data.result?.url) return data.result.url;
  return null;
}

async function pollForResult(
  apiKey: string,
  secret: string,
  requestId: string
): Promise<string | null> {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

    const res = await fetch(`${HIGGSFIELD_BASE}/requests/${requestId}/status`, {
      headers: {
        'Authorization': buildAuthHeader(apiKey, secret),
      },
    });

    if (!res.ok) {
      if (attempt === 0) console.warn(`[higgsfield] Poll failed for ${requestId}: ${res.status}`);
      continue;
    }

    const data: PollResponse = await res.json();

    if (data.status === 'completed' || data.status === 'done') {
      const url = extractImageUrl(data);
      if (url) {
        console.log(`[higgsfield] Image ready for ${requestId}: ${url.slice(0, 80)}...`);
      } else {
        console.warn(`[higgsfield] Job ${requestId} completed but no URL found:`, JSON.stringify(data).slice(0, 500));
      }
      return url;
    }

    if (data.status === 'failed' || data.status === 'error' || data.status === 'nsfw') {
      console.error(`[higgsfield] Job ${requestId} ended with status "${data.status}":`, JSON.stringify(data).slice(0, 500));
      return null;
    }

    // Still in progress (queued, in_progress) — keep polling
    if (attempt === 0) {
      console.log(`[higgsfield] Polling ${requestId} (status: ${data.status})...`);
    }
  }

  console.warn(`[higgsfield] Poll timed out for ${requestId} after ${MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS / 1000}s`);
  return null;
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
    console.error(`[higgsfield] Image generation failed for "${recipeName}":`, err);
    return null;
  }
}

export async function generateRecipeImages(
  apiKey: string,
  secret: string,
  recipes: Array<{ name: string; description: string; keyIngredients: string[] }>
): Promise<(string | null)[]> {
  console.log(`[higgsfield] Generating images for ${recipes.length} recipes...`);
  const results = await Promise.allSettled(
    recipes.map((r) => generateRecipeImage(apiKey, secret, r.name, r.description, r.keyIngredients))
  );

  const urls = results.map((r) => (r.status === 'fulfilled' ? r.value : null));
  const successCount = urls.filter(Boolean).length;
  console.log(`[higgsfield] Done: ${successCount}/${recipes.length} images generated`);
  return urls;
}
