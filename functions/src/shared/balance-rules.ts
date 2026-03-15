/**
 * Balanced Meal Scoring — inspired by Harvard Healthy Eating Plate + Indian Thali wisdom.
 *
 * Harvard plate: ½ vegetables+fruits, ¼ whole grains, ¼ protein, healthy oils in moderation.
 * Indian thali: dal (protein+fiber), 2+ sabzi (vegetables), roti/rice (whole grain), raita/curd (probiotics), salad (raw veg).
 * Japanese ichiju-sansai: soup + 3 sides (protein, 2 veg) + rice.
 * Mediterranean: protein + whole grain + salad/veg + olive oil.
 *
 * The scoring system classifies each meal component into food groups, then rates
 * how well the overall meal covers the plate model. Health conditions shift the
 * ideal ratios (e.g., diabetes → more protein/fiber, fewer carbs).
 */

// ─── Food Group Classification ───────────────────────────────────────

export type FoodGroup = 'protein' | 'grain' | 'vegetable' | 'fruit' | 'dairy' | 'fat_oil' | 'mixed';

const PROTEIN_KEYWORDS = [
  'chicken', 'fish', 'salmon', 'tuna', 'prawn', 'shrimp', 'egg', 'paneer',
  'tofu', 'tempeh', 'lamb', 'mutton', 'beef', 'pork', 'turkey', 'duck',
  'dal', 'daal', 'dhal', 'lentil', 'chana', 'chickpea', 'rajma', 'kidney bean',
  'black bean', 'edamame', 'moong', 'masoor', 'urad', 'toor', 'arhar',
  'sambar', 'sambhar', 'rasam', 'chole', 'lobhia', 'keema',
  'bean', 'legume', 'nut', 'almond', 'walnut', 'cashew', 'peanut',
  'soy', 'seitan', 'cottage cheese',
];

const GRAIN_KEYWORDS = [
  'rice', 'roti', 'chapati', 'naan', 'paratha', 'bread', 'pasta', 'noodle',
  'oats', 'oatmeal', 'porridge', 'quinoa', 'barley', 'millet', 'bajra',
  'jowar', 'ragi', 'wheat', 'couscous', 'bulgur', 'tortilla', 'pita',
  'dosa', 'idli', 'appam', 'uttapam', 'poha', 'upma', 'khichdi',
  'biryani', 'pulao', 'pilaf', 'risotto', 'sushi', 'congee',
  'pancake', 'waffle', 'crepe', 'cereal', 'granola', 'muesli',
  'bagel', 'toast', 'croissant', 'wrap', 'bun', 'roll',
];

const VEGETABLE_KEYWORDS = [
  'sabzi', 'sabji', 'subzi', 'salad', 'soup', 'stir fry', 'stir-fry',
  'spinach', 'palak', 'methi', 'bhindi', 'okra', 'gobi', 'cauliflower',
  'broccoli', 'carrot', 'gajar', 'beetroot', 'capsicum', 'bell pepper',
  'tomato', 'cucumber', 'onion', 'potato', 'aloo', 'lauki', 'turai',
  'karela', 'bitter gourd', 'pumpkin', 'kaddu', 'cabbage', 'lettuce',
  'kale', 'zucchini', 'eggplant', 'baingan', 'mushroom', 'peas',
  'matar', 'corn', 'asparagus', 'artichoke', 'celery', 'radish',
  'turnip', 'sweet potato', 'green bean', 'bok choy', 'sprout',
  'avial', 'kootu', 'poriyal', 'thoran', 'raita',
  'kimchi', 'coleslaw', 'slaw', 'ratatouille', 'caponata',
];

const FRUIT_KEYWORDS = [
  'fruit', 'apple', 'banana', 'mango', 'papaya', 'orange', 'berry',
  'strawberry', 'blueberry', 'raspberry', 'grape', 'melon', 'watermelon',
  'pineapple', 'pomegranate', 'guava', 'chiku', 'custard apple',
  'kiwi', 'peach', 'plum', 'pear', 'fig', 'date', 'smoothie',
  'fruit bowl', 'fruit salad', 'compote', 'jam',
];

const DAIRY_PROBIOTIC_KEYWORDS = [
  'yogurt', 'curd', 'dahi', 'lassi', 'chaas', 'buttermilk', 'raita',
  'kefir', 'cheese', 'paneer', 'milk', 'cream', 'ghee', 'butter',
  'miso', 'kimchi', 'kombucha', 'fermented',
];

/**
 * Classify a meal component (dish) into its primary food group.
 * Uses dish name + ingredient names for classification.
 */
export function classifyFoodGroup(dishName: string, ingredientNames: string[]): FoodGroup {
  const text = [dishName, ...ingredientNames].join(' ').toLowerCase();

  // Score each group
  const scores: Record<FoodGroup, number> = {
    protein: 0, grain: 0, vegetable: 0, fruit: 0, dairy: 0, fat_oil: 0, mixed: 0,
  };

  for (const kw of PROTEIN_KEYWORDS) {
    if (text.includes(kw)) scores.protein += 2;
  }
  for (const kw of GRAIN_KEYWORDS) {
    if (text.includes(kw)) scores.grain += 2;
  }
  for (const kw of VEGETABLE_KEYWORDS) {
    if (text.includes(kw)) scores.vegetable += 2;
  }
  for (const kw of FRUIT_KEYWORDS) {
    if (text.includes(kw)) scores.fruit += 2;
  }
  for (const kw of DAIRY_PROBIOTIC_KEYWORDS) {
    if (text.includes(kw)) scores.dairy += 1; // lower weight — dairy is usually a sub-component
  }

  // Find the dominant group
  const entries = Object.entries(scores).filter(([k]) => k !== 'mixed' && k !== 'fat_oil') as [FoodGroup, number][];
  entries.sort((a, b) => b[1] - a[1]);

  if (entries[0][1] === 0) return 'mixed'; // can't classify
  // If top two are close, it's a mixed dish (like khichdi = grain+protein)
  if (entries.length > 1 && entries[1][1] > 0 && entries[0][1] - entries[1][1] <= 2) return 'mixed';
  return entries[0][0];
}

// ─── Balance Scoring ─────────────────────────────────────────────────

/**
 * Ideal plate ratios — Harvard Healthy Eating Plate defaults.
 * Values represent ideal proportion of the plate (0-1, must sum to 1).
 */
interface PlateRatios {
  vegetable_fruit: number;  // Harvard: 0.50 (½ plate)
  grain: number;            // Harvard: 0.25 (¼ plate)
  protein: number;          // Harvard: 0.25 (¼ plate)
}

const DEFAULT_PLATE: PlateRatios = { vegetable_fruit: 0.50, grain: 0.25, protein: 0.25 };

/**
 * Get condition-adjusted plate ratios.
 * Certain health conditions shift the ideal proportions.
 */
export function getAdjustedPlate(dietaryConditions: string[]): PlateRatios {
  const lower = dietaryConditions.map((c) => c.toLowerCase());

  // Keto overrides everything — high fat/protein, minimal grain
  if (lower.some((c) => c.includes('keto'))) {
    return { vegetable_fruit: 0.40, grain: 0.05, protein: 0.55 };
  }

  // Start from Harvard defaults and adjust
  const plate = { ...DEFAULT_PLATE };

  // Diabetes / PCOS: more protein+veg, less grain (lower glycemic load)
  if (lower.some((c) => c.includes('diabetes') || c.includes('pcos') || c.includes('low carb'))) {
    plate.vegetable_fruit = 0.50;
    plate.grain = 0.15;
    plate.protein = 0.35;
  }

  // Cardiovascular / DASH / Hypertension: more veg+fruit, moderate grain, lean protein
  if (lower.some((c) => c.includes('cardiovascular') || c.includes('dash') || c.includes('hypertension') || c.includes('blood pressure'))) {
    plate.vegetable_fruit = 0.55;
    plate.grain = 0.25;
    plate.protein = 0.20;
  }

  // CKD: moderate protein (not excess), more grain+veg
  if (lower.some((c) => c.includes('kidney') || c.includes('ckd'))) {
    plate.vegetable_fruit = 0.50;
    plate.grain = 0.30;
    plate.protein = 0.20;
  }

  // Paleo: no grains, high protein + veg
  if (lower.some((c) => c.includes('paleo'))) {
    plate.vegetable_fruit = 0.55;
    plate.grain = 0.00;
    plate.protein = 0.45;
  }

  return plate;
}

// ─── Meal Balance Score ──────────────────────────────────────────────

export interface MealBalanceScore {
  score: number;          // 0-100 (100 = perfectly balanced)
  grade: 'A' | 'B' | 'C' | 'D';
  groups: FoodGroup[];    // food groups present in the meal
  missing: string[];      // what's underrepresented
  suggestion: string;     // short actionable tip
}

/**
 * Score a single meal's balance against the ideal plate.
 * Components = array of { name, ingredients: [{name}] }
 */
export function scoreMealBalance(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  components: any[],
  dietaryConditions: string[]
): MealBalanceScore {
  if (!components || components.length === 0) {
    return { score: 0, grade: 'D', groups: [], missing: ['protein', 'vegetables', 'grains'], suggestion: 'No components to score.' };
  }

  const plate = getAdjustedPlate(dietaryConditions);

  // Classify each component
  const groups: FoodGroup[] = components.map((comp) => {
    const ingredientNames = (comp.ingredients || []).map((i: { name?: string }) => (typeof i === 'string' ? i : i.name || ''));
    return classifyFoodGroup(comp.name || '', ingredientNames);
  });

  // Count how many components fall into each macro group
  const counts = {
    vegetable_fruit: groups.filter((g) => g === 'vegetable' || g === 'fruit').length,
    grain: groups.filter((g) => g === 'grain').length,
    protein: groups.filter((g) => g === 'protein').length,
    dairy: groups.filter((g) => g === 'dairy').length,
    mixed: groups.filter((g) => g === 'mixed').length,
  };

  // Mixed dishes contribute partially to multiple groups
  const total = components.length || 1;
  const actual = {
    vegetable_fruit: (counts.vegetable_fruit + counts.mixed * 0.3) / total,
    grain: (counts.grain + counts.mixed * 0.3) / total,
    protein: (counts.protein + counts.mixed * 0.4) / total,
  };

  // Score: how close actual ratios are to ideal (0-100)
  let score = 100;
  const missing: string[] = [];

  // Penalize for missing groups (heavy penalty)
  if (counts.vegetable_fruit === 0 && counts.mixed === 0) {
    score -= 30;
    missing.push('vegetables/fruits');
  }
  if (counts.protein === 0 && counts.mixed === 0) {
    score -= 25;
    missing.push('protein');
  }
  if (counts.grain === 0 && counts.mixed === 0 && plate.grain > 0.05) {
    score -= 20;
    missing.push('whole grains');
  }

  // Penalize for ratio deviation (lighter penalty)
  const vegDev = Math.abs(actual.vegetable_fruit - plate.vegetable_fruit);
  const grainDev = Math.abs(actual.grain - plate.grain);
  const proteinDev = Math.abs(actual.protein - plate.protein);
  score -= Math.round((vegDev + grainDev + proteinDev) * 40);

  // Bonus for having dairy/probiotic component (Indian thali wisdom — curd/raita)
  if (counts.dairy > 0) score += 5;

  // Bonus for 3+ components (thali-style completeness)
  if (components.length >= 3) score += 5;
  if (components.length >= 4) score += 3;

  score = Math.max(0, Math.min(100, score));

  const grade: 'A' | 'B' | 'C' | 'D' =
    score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D';

  // Build suggestion
  let suggestion = '';
  if (missing.length > 0) {
    suggestion = `Add ${missing.join(' and ')} for a balanced plate.`;
  } else if (score < 80) {
    suggestion = 'Adjust proportions — aim for ½ vegetables, ¼ protein, ¼ grains.';
  } else {
    suggestion = 'Well-balanced meal!';
  }

  return { score, grade, groups, missing, suggestion };
}

// ─── Daily Balance Score ─────────────────────────────────────────────

export interface DailyBalanceScore {
  overall: number;        // average of breakfast + lunch + dinner scores
  grade: 'A' | 'B' | 'C' | 'D';
  breakfast: MealBalanceScore;
  lunch: MealBalanceScore;
  dinner: MealBalanceScore;
  dailyTip: string;
}

/**
 * Score an entire day's nutrition balance.
 */
export function scoreDayBalance(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  breakfastComponents: any[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lunchComponents: any[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dinnerComponents: any[],
  dietaryConditions: string[]
): DailyBalanceScore {
  const breakfast = scoreMealBalance(breakfastComponents, dietaryConditions);
  const lunch = scoreMealBalance(lunchComponents, dietaryConditions);
  const dinner = scoreMealBalance(dinnerComponents, dietaryConditions);

  // Weighted average: breakfast 20%, lunch 40%, dinner 40%
  const overall = Math.round(breakfast.score * 0.20 + lunch.score * 0.40 + dinner.score * 0.40);
  const grade: 'A' | 'B' | 'C' | 'D' =
    overall >= 80 ? 'A' : overall >= 60 ? 'B' : overall >= 40 ? 'C' : 'D';

  // Cross-meal analysis: check if the day covers all groups across meals
  const allGroups = new Set([...breakfast.groups, ...lunch.groups, ...dinner.groups]);
  let dailyTip = '';
  if (!allGroups.has('vegetable') && !allGroups.has('fruit')) {
    dailyTip = 'This day is low on vegetables and fruits — try adding a salad or sabzi.';
  } else if (!allGroups.has('protein')) {
    dailyTip = 'This day needs more protein — add dal, beans, eggs, or lean meat.';
  } else if (overall >= 75) {
    dailyTip = 'Good nutritional balance across the day!';
  } else {
    dailyTip = 'Try varying food groups across meals for better balance.';
  }

  return { overall, grade, breakfast, lunch, dinner, dailyTip };
}

// ─── Prompt Builder Helpers ──────────────────────────────────────────

/**
 * Build the balanced plate instruction block for GPT prompts.
 * This encodes Harvard plate + Indian thali + cross-culture patterns.
 */
export function buildBalancedPlateInstructions(dietaryConditions: string[]): string {
  const plate = getAdjustedPlate(dietaryConditions);
  const lower = dietaryConditions.map((c) => c.toLowerCase());

  const vegPct = Math.round(plate.vegetable_fruit * 100);
  const grainPct = Math.round(plate.grain * 100);
  const proteinPct = Math.round(plate.protein * 100);

  let conditionNote = '';
  if (lower.some((c) => c.includes('diabetes') || c.includes('pcos'))) {
    conditionNote = '\n- DIABETES/PCOS ADJUSTMENT: Favor low-glycemic grains (brown rice, millets, oats over white rice/maida). Increase protein and fiber. Pair carbs with protein to slow glucose spikes.';
  }
  if (lower.some((c) => c.includes('cardiovascular') || c.includes('dash') || c.includes('hypertension'))) {
    conditionNote += '\n- HEART-HEALTHY ADJUSTMENT: Use olive oil/mustard oil over butter/ghee. Maximize vegetables. Choose lean proteins (fish, dal, chicken breast). Limit sodium — use herbs/spices instead of salt.';
  }
  if (lower.some((c) => c.includes('kidney') || c.includes('ckd'))) {
    conditionNote += '\n- CKD ADJUSTMENT: Moderate protein (don\'t overload). Limit high-potassium vegetables (tomato, potato, banana). Avoid processed foods high in phosphorus.';
  }
  if (lower.some((c) => c.includes('keto'))) {
    conditionNote += '\n- KETO ADJUSTMENT: Replace grains with additional vegetables (leafy greens, cauliflower). Heavy on protein + healthy fats. Minimal carbs.';
  }
  if (lower.some((c) => c.includes('gout'))) {
    conditionNote += '\n- GOUT ADJUSTMENT: Avoid high-purine proteins (organ meats, red meat, sardines). Prefer plant proteins (dal, tofu), eggs, dairy. Increase vegetables and hydration.';
  }
  if (lower.some((c) => c.includes('fatty liver'))) {
    conditionNote += '\n- FATTY LIVER ADJUSTMENT: Maximize vegetables and whole grains. Avoid refined carbs and added sugars. Moderate healthy fats (olive oil, nuts). Limit fried foods.';
  }

  return `
BALANCED PLATE RULES (Harvard Healthy Eating Plate + traditional home-cooking wisdom):
Every meal MUST be nutritionally balanced. Follow these proportions:
- ~${vegPct}% VEGETABLES & FRUITS: The largest share. Include at least 1 vegetable dish per meal (sabzi, salad, stir-fry, soup, poriyal, kimchi, etc.). Variety of colors = variety of nutrients. Potatoes do NOT count as vegetables.
- ~${proteinPct}% PROTEIN: Every meal needs a protein source — dal/lentils, beans, paneer, tofu, eggs, fish, chicken, or nuts. Prefer plant proteins and fish over red meat. AVOID processed meats (bacon, sausage, cold cuts).
- ~${grainPct}% WHOLE GRAINS: Prefer whole grains (brown rice, roti, millet, oats, quinoa, whole wheat pasta) over refined (white rice, maida, white bread).
- HEALTHY OILS: Use olive oil, mustard oil, or sesame oil. Avoid trans fats and excessive ghee/butter.
- PROBIOTIC/DAIRY: When possible, include a probiotic element — raita, curd, kimchi, miso, yogurt. Traditional Indian meals always include curd for gut health.

CROSS-CUISINE BALANCE PATTERNS (apply the right pattern for each cuisine):
- Indian meals: Must have dal/protein + sabzi/vegetable + roti/rice + raita/curd. This is the thali model — the world's most time-tested balanced meal format.
- East Asian meals: Rice/noodle + protein + 2 vegetable sides + soup (Japanese ichiju-sansai principle).
- Mediterranean meals: Protein + whole grain + generous salad/vegetables + olive oil.
- Mexican meals: Beans (protein) + rice/tortilla (grain) + vegetables + salsa.
- American/Western meals: Protein + starch + at least 1 substantial vegetable side.

DO NOT create meals that are:
- All carbs (e.g., rice + roti + naan with no protein or vegetables)
- All protein (e.g., chicken + eggs + paneer with no vegetables or grain)
- Missing vegetables entirely (every meal needs a vegetable component)
- Relying solely on potatoes or corn as the "vegetable" — include leafy greens or colored vegetables
${conditionNote}`;
}

/**
 * Build breakfast-specific balance guidance for the code selector.
 * Returns keywords to prioritize in breakfast selection.
 */
export function getBreakfastBalanceKeywords(dietaryConditions: string[]): {
  preferKeywords: string[];
  avoidKeywords: string[];
} {
  const lower = dietaryConditions.map((c) => c.toLowerCase());

  const preferKeywords: string[] = [];
  const avoidKeywords: string[] = [];

  // Universal: prefer breakfasts with protein + fiber (not just carbs)
  preferKeywords.push('oats', 'egg', 'dal', 'sprout', 'nut', 'seed', 'yogurt', 'curd');

  if (lower.some((c) => c.includes('diabetes') || c.includes('pcos') || c.includes('low carb'))) {
    preferKeywords.push('protein', 'egg', 'paneer', 'sprout', 'moong');
    avoidKeywords.push('sugar', 'syrup', 'jam', 'honey', 'white bread');
  }

  if (lower.some((c) => c.includes('cardiovascular') || c.includes('dash'))) {
    preferKeywords.push('oats', 'fruit', 'nut', 'flax', 'avocado');
    avoidKeywords.push('butter', 'cream', 'cheese', 'bacon', 'sausage');
  }

  if (lower.some((c) => c.includes('keto'))) {
    preferKeywords.push('egg', 'avocado', 'cheese', 'nut', 'seed');
    avoidKeywords.push('oats', 'bread', 'rice', 'cereal', 'granola', 'pancake');
  }

  return { preferKeywords, avoidKeywords };
}
