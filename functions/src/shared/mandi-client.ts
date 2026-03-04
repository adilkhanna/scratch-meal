// data.gov.in Mandi Commodity Prices API client
// Fetches daily wholesale prices for vegetables, grains, and spices from Indian mandis.
// Proteins, dairy, and oils are NOT available from mandis — those stay hardcoded.

const DATA_GOV_BASE = 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070';
const DEFAULT_STATE = 'Delhi'; // Azadpur (Delhi) is India's largest mandi — national benchmark

export interface MandiRecord {
  state: string;
  district: string;
  market: string;
  commodity: string;
  variety: string;
  arrival_date: string;
  min_price: string; // comes as string from API
  max_price: string;
  modal_price: string;
}

interface MandiApiResponse {
  count: number;
  records: MandiRecord[];
}

// Maps hardcoded ingredient keywords → data.gov.in commodity names
// Only items actually available in mandis are listed here.
export const MANDI_COMMODITY_MAP: Record<string, string> = {
  // Vegetables
  'onion': 'Onion',
  'tomato': 'Tomato',
  'potato': 'Potato',
  'garlic': 'Garlic',
  'ginger': 'Ginger',
  'carrot': 'Carrot',
  'capsicum': 'Capsicum',
  'bell pepper': 'Capsicum',
  'spinach': 'Spinach',
  'palak': 'Spinach',
  'cauliflower': 'Cauliflower',
  'cabbage': 'Cabbage',
  'green chili': 'Green Chilli',
  'green chilli': 'Green Chilli',
  'coriander': 'Coriander(Leaves)',
  'cucumber': 'Cucumber(Kheera)',
  'brinjal': 'Brinjal',
  'eggplant': 'Brinjal',
  'peas': 'Peas(Green)',

  // Grains (limited mandi availability)
  'rice': 'Rice',

  // Lentils & legumes
  'dal': 'Arhar Dal(Tur Dal)',
  'lentil': 'Masur Dal',
  'chickpea': 'Gram Dal',
  'chana': 'Bengal Gram(Gram)(Whole)',
  'rajma': 'Rajma',

  // Other
  'sugar': 'Sugar',
  'lemon': 'Lemon',
  'lime': 'Lime',
};

/**
 * Convert data.gov.in commodity name to a normalized Firestore document key.
 * e.g., "Peas(Green)" → "peas-green", "Coriander(Leaves)" → "coriander-leaves"
 */
export function commodityToKey(commodity: string): string {
  return commodity
    .toLowerCase()
    .replace(/[()]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Convert price from per-quintal (100 kg) to per-kg, rounded.
 */
export function quintalToKg(quintalPrice: number): number {
  return Math.round(quintalPrice / 100);
}

/**
 * Get unique API commodity names we need to look for.
 */
export function getTargetCommodities(): Set<string> {
  return new Set(Object.values(MANDI_COMMODITY_MAP));
}

/**
 * Fetch mandi prices for all mapped commodities from a specific state.
 * Strategy: fetch all records for the state, filter client-side for our commodities.
 * This uses 1-2 API calls max (cost-conscious).
 *
 * @returns Map of commodity name → MandiRecord (first/most recent match per commodity)
 */
export async function fetchMandiPrices(
  apiKey: string,
  state: string = DEFAULT_STATE
): Promise<Map<string, MandiRecord>> {
  const targetCommodities = getTargetCommodities();
  const results = new Map<string, MandiRecord>();
  let offset = 0;
  const limit = 500;

  console.log(`[mandi] Fetching prices for ${targetCommodities.size} commodities from ${state}...`);

  while (true) {
    const url = `${DATA_GOV_BASE}?api-key=${encodeURIComponent(apiKey)}&format=json&limit=${limit}&offset=${offset}&filters[state]=${encodeURIComponent(state)}`;

    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      console.error(`[mandi] API failed (${res.status}): ${text}`);
      throw new Error(`Mandi API failed: ${res.status}`);
    }

    const data: MandiApiResponse = await res.json();
    console.log(`[mandi] Page offset=${offset}: ${data.records?.length || 0} records (total count: ${data.count})`);

    if (!data.records || data.records.length === 0) break;

    for (const record of data.records) {
      // Only keep first match per commodity (most recent in the response)
      if (targetCommodities.has(record.commodity) && !results.has(record.commodity)) {
        results.set(record.commodity, record);
      }
    }

    // Check if we've found all commodities or exhausted pages
    if (results.size >= targetCommodities.size) break;
    if (data.records.length < limit) break;
    offset += limit;
    if (offset > 2000) break; // Safety limit
  }

  const found = [...results.keys()];
  const missing = [...targetCommodities].filter((c) => !results.has(c));
  console.log(`[mandi] Found ${found.length} commodities: ${found.join(', ')}`);
  if (missing.length > 0) {
    console.log(`[mandi] Missing ${missing.length} commodities: ${missing.join(', ')}`);
  }

  return results;
}
