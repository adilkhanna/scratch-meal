const HIGGSFIELD_BASE = 'https://platform.higgsfield.ai';
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 60; // 60 * 2s = 120s max wait per image

// Model endpoints to try in order (first available wins)
const TEXT2IMAGE_ENDPOINTS = [
  '/v1/flux-pro/kontext/max/text-to-image',  // Official SDK model
  '/v1/text2image/soul',                      // Legacy Soul model
];

interface HiggsFieldSubmitResponse {
  job_set_id: string;
}

interface HiggsFieldJob {
  status: string;
  results?: { raw?: { url?: string } };
  result?: { url?: string };
  output_url?: string;
}

interface HiggsFieldPollResponse {
  status: string;
  jobs?: HiggsFieldJob[];
  results?: { raw?: { url?: string } };
  result?: { url?: string };
  output_url?: string;
}

function buildHeaders(apiKey: string, secret: string): Record<string, string> {
  return {
    'hf-api-key': apiKey,
    'hf-secret': secret,
    'Content-Type': 'application/json',
  };
}

function buildPrompt(recipeName: string, description: string, keyIngredients: string[]): string {
  const ingList = keyIngredients.slice(0, 3).join(', ');
  return `Professional overhead food photography of ${recipeName}. ${description}. Featuring ${ingList}. Clean white plate, bright natural lighting, appetizing presentation, restaurant quality, Zomato style food thumbnail, minimal background, photorealistic.`;
}

// Build request body per endpoint — different models accept different params
function buildRequestBody(endpoint: string, prompt: string): object {
  if (endpoint.includes('flux-pro')) {
    // Official SDK format for Flux models
    return {
      params: {
        prompt,
        aspect_ratio: '1:1',
        safety_tolerance: 2,
      },
    };
  }
  // Soul model format
  return {
    params: {
      prompt,
      width_and_height: '1536x1536',
      quality: '720p',
      batch_size: 1,
      enhance_prompt: false,
    },
  };
}

async function submitGeneration(
  apiKey: string,
  secret: string,
  prompt: string
): Promise<string> {
  let lastError = '';

  for (const endpoint of TEXT2IMAGE_ENDPOINTS) {
    const body = buildRequestBody(endpoint, prompt);
    const res = await fetch(`${HIGGSFIELD_BASE}${endpoint}`, {
      method: 'POST',
      headers: buildHeaders(apiKey, secret),
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data: HiggsFieldSubmitResponse = await res.json();
      console.log(`Higgsfield submit success via ${endpoint}, job_set_id: ${data.job_set_id}`);
      return data.job_set_id;
    }

    const text = await res.text();
    lastError = `${endpoint} → ${res.status}: ${text}`;
    console.warn(`Higgsfield endpoint ${endpoint} failed (${res.status}): ${text}`);

    // If it's an auth error (401/403), don't try other endpoints — keys are wrong
    if (res.status === 401 || res.status === 403) {
      throw new Error(`Higgsfield auth failed (${res.status}): ${text}`);
    }
  }

  throw new Error(`All Higgsfield endpoints failed. Last: ${lastError}`);
}

function extractImageUrl(data: HiggsFieldPollResponse): string | null {
  // Try every known response shape from Higgsfield
  if (data.output_url) return data.output_url;
  if (data.results?.raw?.url) return data.results.raw.url;
  if (data.result?.url) return data.result.url;
  if (data.jobs && data.jobs.length > 0) {
    const job = data.jobs[0];
    if (job.output_url) return job.output_url;
    if (job.results?.raw?.url) return job.results.raw.url;
    if (job.result?.url) return job.result.url;
  }
  return null;
}

async function pollForResult(
  apiKey: string,
  secret: string,
  jobSetId: string
): Promise<string | null> {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

    const res = await fetch(`${HIGGSFIELD_BASE}/v1/job-sets/${jobSetId}`, {
      headers: {
        'hf-api-key': apiKey,
        'hf-secret': secret,
      },
    });

    if (!res.ok) {
      if (attempt === 0) console.warn(`Higgsfield poll failed for ${jobSetId}: ${res.status}`);
      continue;
    }

    const data: HiggsFieldPollResponse = await res.json();

    if (data.status === 'completed' || data.status === 'done') {
      const url = extractImageUrl(data);
      if (url) {
        console.log(`Higgsfield image ready for ${jobSetId}: ${url.slice(0, 80)}...`);
      } else {
        console.warn(`Higgsfield job ${jobSetId} completed but no URL found:`, JSON.stringify(data).slice(0, 500));
      }
      return url;
    }

    if (data.status === 'failed' || data.status === 'error' || data.status === 'nsfw') {
      console.error(`Higgsfield job ${jobSetId} ended with status "${data.status}":`, JSON.stringify(data).slice(0, 500));
      return null;
    }

    // Still in progress (queued, in_progress)
  }

  console.warn(`Higgsfield poll timed out for ${jobSetId} after ${MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS / 1000}s`);
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
    const jobSetId = await submitGeneration(apiKey, secret, prompt);
    return await pollForResult(apiKey, secret, jobSetId);
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
