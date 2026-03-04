// Hardcoded Indian grocery prices (approximate retail, March 2026).
// Phase 2 will replace vegetable prices with live mandi data from data.gov.in.

interface PriceEntry {
  keyword: string;
  pricePerUnit: number; // INR
  unitType: 'kg' | 'litre' | 'unit';
}

const INGREDIENT_PRICES: PriceEntry[] = [
  // Vegetables
  { keyword: 'onion', pricePerUnit: 40, unitType: 'kg' },
  { keyword: 'tomato', pricePerUnit: 40, unitType: 'kg' },
  { keyword: 'potato', pricePerUnit: 30, unitType: 'kg' },
  { keyword: 'garlic', pricePerUnit: 200, unitType: 'kg' },
  { keyword: 'ginger', pricePerUnit: 200, unitType: 'kg' },
  { keyword: 'carrot', pricePerUnit: 50, unitType: 'kg' },
  { keyword: 'capsicum', pricePerUnit: 80, unitType: 'kg' },
  { keyword: 'bell pepper', pricePerUnit: 80, unitType: 'kg' },
  { keyword: 'spinach', pricePerUnit: 40, unitType: 'kg' },
  { keyword: 'palak', pricePerUnit: 40, unitType: 'kg' },
  { keyword: 'cauliflower', pricePerUnit: 40, unitType: 'kg' },
  { keyword: 'cabbage', pricePerUnit: 30, unitType: 'kg' },
  { keyword: 'green chili', pricePerUnit: 80, unitType: 'kg' },
  { keyword: 'coriander', pricePerUnit: 60, unitType: 'kg' },
  { keyword: 'cucumber', pricePerUnit: 40, unitType: 'kg' },
  { keyword: 'brinjal', pricePerUnit: 40, unitType: 'kg' },
  { keyword: 'eggplant', pricePerUnit: 40, unitType: 'kg' },
  { keyword: 'peas', pricePerUnit: 80, unitType: 'kg' },

  // Proteins
  { keyword: 'chicken', pricePerUnit: 250, unitType: 'kg' },
  { keyword: 'paneer', pricePerUnit: 400, unitType: 'kg' },
  { keyword: 'egg', pricePerUnit: 7, unitType: 'unit' },
  { keyword: 'fish', pricePerUnit: 350, unitType: 'kg' },
  { keyword: 'mutton', pricePerUnit: 800, unitType: 'kg' },
  { keyword: 'prawn', pricePerUnit: 500, unitType: 'kg' },
  { keyword: 'shrimp', pricePerUnit: 500, unitType: 'kg' },
  { keyword: 'tofu', pricePerUnit: 300, unitType: 'kg' },

  // Dairy
  { keyword: 'milk', pricePerUnit: 60, unitType: 'litre' },
  { keyword: 'curd', pricePerUnit: 60, unitType: 'litre' },
  { keyword: 'yogurt', pricePerUnit: 60, unitType: 'litre' },
  { keyword: 'butter', pricePerUnit: 550, unitType: 'kg' },
  { keyword: 'cream', pricePerUnit: 350, unitType: 'litre' },
  { keyword: 'cheese', pricePerUnit: 500, unitType: 'kg' },
  { keyword: 'coconut milk', pricePerUnit: 150, unitType: 'litre' },

  // Grains & staples
  { keyword: 'rice', pricePerUnit: 60, unitType: 'kg' },
  { keyword: 'flour', pricePerUnit: 40, unitType: 'kg' },
  { keyword: 'atta', pricePerUnit: 45, unitType: 'kg' },
  { keyword: 'bread', pricePerUnit: 45, unitType: 'unit' },
  { keyword: 'pasta', pricePerUnit: 150, unitType: 'kg' },
  { keyword: 'noodle', pricePerUnit: 30, unitType: 'unit' },

  // Lentils & legumes
  { keyword: 'dal', pricePerUnit: 120, unitType: 'kg' },
  { keyword: 'lentil', pricePerUnit: 120, unitType: 'kg' },
  { keyword: 'chickpea', pricePerUnit: 120, unitType: 'kg' },
  { keyword: 'chana', pricePerUnit: 100, unitType: 'kg' },
  { keyword: 'rajma', pricePerUnit: 140, unitType: 'kg' },

  // Oils & condiments
  { keyword: 'oil', pricePerUnit: 180, unitType: 'litre' },
  { keyword: 'ghee', pricePerUnit: 600, unitType: 'litre' },
  { keyword: 'soy sauce', pricePerUnit: 200, unitType: 'litre' },
  { keyword: 'lemon', pricePerUnit: 5, unitType: 'unit' },
  { keyword: 'lime', pricePerUnit: 5, unitType: 'unit' },
  { keyword: 'sugar', pricePerUnit: 45, unitType: 'kg' },
  { keyword: 'honey', pricePerUnit: 400, unitType: 'kg' },
];

// Sorted by keyword length descending for longest-match-first
const SORTED_PRICES = [...INGREDIENT_PRICES].sort((a, b) => b.keyword.length - a.keyword.length);

const DEFAULT_PRICE = 15; // INR per unmatched ingredient

const UNIT_TO_KG: Record<string, number> = {
  kg: 1, g: 0.001, gram: 0.001, grams: 0.001,
  lb: 0.453, pound: 0.453, oz: 0.028, ounce: 0.028,
};

const UNIT_TO_LITRE: Record<string, number> = {
  litre: 1, liter: 1, l: 1, ml: 0.001,
  cup: 0.24, cups: 0.24,
  tbsp: 0.015, tablespoon: 0.015, tablespoons: 0.015,
  tsp: 0.005, teaspoon: 0.005, teaspoons: 0.005,
};

const COUNT_UNITS = new Set([
  '', 'unit', 'units', 'piece', 'pieces', 'whole', 'large', 'medium', 'small', 'slice', 'slices',
]);

interface RecipeIngredient {
  name: string;
  quantity: string;
  unit?: string;
}

function findPriceEntry(name: string): PriceEntry | null {
  const lower = name.toLowerCase();
  return SORTED_PRICES.find((e) => lower.includes(e.keyword)) || null;
}

function parseQuantity(qty: string): number {
  if (!qty || qty.trim() === '') return 1;
  const t = qty.trim();
  // "1 1/2" style
  const mixed = t.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return parseInt(mixed[1]) + parseInt(mixed[2]) / parseInt(mixed[3]);
  // "1/2" style
  const frac = t.match(/^(\d+)\/(\d+)$/);
  if (frac) return parseInt(frac[1]) / parseInt(frac[2]);
  const n = parseFloat(t);
  return isNaN(n) ? 1 : n;
}

function estimateIngredientCost(ing: RecipeIngredient): number {
  const entry = findPriceEntry(ing.name);
  if (!entry) return DEFAULT_PRICE;

  const qty = parseQuantity(ing.quantity);
  const unit = (ing.unit || '').toLowerCase().trim();

  if (entry.unitType === 'unit') {
    return qty * entry.pricePerUnit;
  }

  if (entry.unitType === 'kg') {
    if (UNIT_TO_KG[unit] !== undefined) return qty * UNIT_TO_KG[unit] * entry.pricePerUnit;
    if (UNIT_TO_LITRE[unit] !== undefined) return qty * UNIT_TO_LITRE[unit] * 0.8 * entry.pricePerUnit;
    if (COUNT_UNITS.has(unit)) return qty * 0.2 * entry.pricePerUnit;
    return qty > 10 ? (qty / 1000) * entry.pricePerUnit : qty * entry.pricePerUnit;
  }

  if (entry.unitType === 'litre') {
    if (UNIT_TO_LITRE[unit] !== undefined) return qty * UNIT_TO_LITRE[unit] * entry.pricePerUnit;
    if (UNIT_TO_KG[unit] !== undefined) return qty * UNIT_TO_KG[unit] * entry.pricePerUnit;
    if (COUNT_UNITS.has(unit)) return qty * 0.24 * entry.pricePerUnit;
    return qty > 10 ? (qty / 1000) * entry.pricePerUnit : qty * entry.pricePerUnit;
  }

  return DEFAULT_PRICE;
}

export function estimateRecipeCost(ingredients: RecipeIngredient[], servings: number): number {
  const total = ingredients.reduce((sum, ing) => sum + estimateIngredientCost(ing), 0);
  const perServing = total / Math.max(servings, 1);
  return Math.round(perServing / 5) * 5; // Round to nearest 5
}
