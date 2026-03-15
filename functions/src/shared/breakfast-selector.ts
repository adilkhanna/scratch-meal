/**
 * Deterministic breakfast selector — NO GPT involved.
 * Selects real recipes from the glossary based on user preferences.
 * Makes hallucination structurally impossible.
 *
 * Every breakfast = 3 components:
 *   1. MAIN dish (from glossary — eggs, poha, oats, dosa, etc.)
 *   2. FRUIT (seasonal, rotating)
 *   3. DRINK (smoothie, juice, tea, coffee, lassi, etc.)
 *
 * Balance-aware: prioritizes protein + fiber breakfasts.
 * Variety: no same main dish within a 3-day window per person.
 */

import { getBreakfastBalanceKeywords } from './balance-rules';

interface GlossaryRecipe {
  id?: string;
  name: string;
  description: string;
  cookTime: string;
  difficulty: string;
  ingredients: { name: string; quantity: string; unit?: string }[];
  instructions: string[];
  tips: string[];
  nutritionInfo?: {
    servings: number;
    calories: number;
    protein: string;
    carbs: string;
    fat: string;
  };
  cuisine: string[];
  dietaryTags: string[];
  mealTypes: string[];
  tags?: string[];
}

interface BreakfastPref {
  memberName: string;
  preferences: string[];
}

// ─── Curated Fruit & Drink Banks ─────────────────────────────────────

interface SimpleItem {
  name: string;
  calories: number;
  tags: string[]; // dietary tags: 'vegan', 'keto', 'low-sugar', etc.
}

const FRUIT_BANK: SimpleItem[] = [
  { name: 'Sliced Banana', calories: 90, tags: ['vegan', 'gluten-free'] },
  { name: 'Apple Slices', calories: 72, tags: ['vegan', 'gluten-free', 'low-sugar'] },
  { name: 'Papaya Cubes', calories: 60, tags: ['vegan', 'gluten-free'] },
  { name: 'Seasonal Fruit Bowl', calories: 80, tags: ['vegan', 'gluten-free'] },
  { name: 'Pomegranate Seeds', calories: 83, tags: ['vegan', 'gluten-free'] },
  { name: 'Guava Slices', calories: 68, tags: ['vegan', 'gluten-free', 'low-sugar'] },
  { name: 'Orange Segments', calories: 62, tags: ['vegan', 'gluten-free'] },
  { name: 'Watermelon Cubes', calories: 46, tags: ['vegan', 'gluten-free', 'low-sugar'] },
  { name: 'Mango Slices', calories: 99, tags: ['vegan', 'gluten-free'] },
  { name: 'Mixed Berries', calories: 70, tags: ['vegan', 'gluten-free', 'keto', 'low-sugar'] },
  { name: 'Pear Slices', calories: 57, tags: ['vegan', 'gluten-free', 'low-sugar'] },
  { name: 'Chiku (Sapota)', calories: 83, tags: ['vegan', 'gluten-free'] },
  { name: 'Grapes', calories: 62, tags: ['vegan', 'gluten-free'] },
  { name: 'Kiwi Slices', calories: 42, tags: ['vegan', 'gluten-free', 'keto', 'low-sugar'] },
];

const DRINK_BANK: SimpleItem[] = [
  // Teas
  { name: 'Masala Chai', calories: 50, tags: ['vegetarian', 'gluten-free'] },
  { name: 'Green Tea', calories: 2, tags: ['vegan', 'gluten-free', 'keto', 'low-sugar'] },
  { name: 'Ginger Lemon Tea', calories: 8, tags: ['vegan', 'gluten-free', 'keto', 'low-sugar'] },
  { name: 'Herbal Tea', calories: 2, tags: ['vegan', 'gluten-free', 'keto', 'low-sugar'] },
  // Coffees
  { name: 'Filter Coffee', calories: 60, tags: ['vegetarian', 'gluten-free'] },
  { name: 'Black Coffee', calories: 5, tags: ['vegan', 'gluten-free', 'keto', 'low-sugar'] },
  // Milk options
  { name: 'Warm Turmeric Milk (Haldi Doodh)', calories: 100, tags: ['vegetarian', 'gluten-free'] },
  { name: 'Glass of Warm Milk', calories: 100, tags: ['vegetarian', 'gluten-free'] },
  { name: 'Almond Milk', calories: 40, tags: ['vegan', 'gluten-free', 'dairy-free', 'keto'] },
  // Smoothies & Juices
  { name: 'Banana Smoothie', calories: 140, tags: ['vegetarian', 'gluten-free'] },
  { name: 'Mango Lassi', calories: 150, tags: ['vegetarian', 'gluten-free'] },
  { name: 'Sweet Lassi', calories: 120, tags: ['vegetarian', 'gluten-free'] },
  { name: 'Chaas (Buttermilk)', calories: 40, tags: ['vegetarian', 'gluten-free', 'low-sugar'] },
  { name: 'Mixed Fruit Smoothie', calories: 130, tags: ['vegetarian', 'gluten-free'] },
  { name: 'Fresh Orange Juice', calories: 90, tags: ['vegan', 'gluten-free'] },
  { name: 'ABC Juice (Apple Beetroot Carrot)', calories: 80, tags: ['vegan', 'gluten-free'] },
  { name: 'Coconut Water', calories: 46, tags: ['vegan', 'gluten-free', 'keto', 'low-sugar'] },
  { name: 'Amla Juice', calories: 30, tags: ['vegan', 'gluten-free', 'low-sugar'] },
  // Protein drinks
  { name: 'Sattu Drink', calories: 100, tags: ['vegan', 'gluten-free'] },
  { name: 'Ragi Malt', calories: 110, tags: ['vegan', 'gluten-free'] },
];

// Expensive fruits/drinks to filter on low budget
const EXPENSIVE_FRUIT = ['berry', 'berries', 'kiwi', 'avocado'];
const EXPENSIVE_DRINK = ['almond milk', 'smoothie'];

// ─── Expensive Ingredients (for main dish filtering) ─────────────────

const EXPENSIVE_INGREDIENTS = [
  'avocado', 'quinoa', 'salmon', 'prawn', 'shrimp',
  'pine nut', 'saffron', 'chia seed', 'blueberr',
  'asparagus', 'artichoke', 'macadamia', 'truffle',
  'almond butter', 'cashew butter', 'acai',
  'smoked salmon', 'maple syrup',
];

function hasExpensiveIngredients(recipe: GlossaryRecipe): boolean {
  const ingredientNames = recipe.ingredients.map((i) => i.name.toLowerCase());
  return ingredientNames.some((name) =>
    EXPENSIVE_INGREDIENTS.some((exp) => name.includes(exp))
  );
}

function filterByBudget(recipes: GlossaryRecipe[], weeklyBudget: number | null): GlossaryRecipe[] {
  if (!weeklyBudget || weeklyBudget > 3000) return recipes;
  if (weeklyBudget <= 1500) {
    const filtered = recipes.filter((r) => !hasExpensiveIngredients(r));
    return filtered.length >= 10 ? filtered : recipes.slice(0, 20);
  }
  const cheap = recipes.filter((r) => !hasExpensiveIngredients(r));
  const expensive = recipes.filter((r) => hasExpensiveIngredients(r));
  return [...cheap, ...expensive];
}

// ─── Scoring ─────────────────────────────────────────────────────────

function scoreRecipe(
  recipe: GlossaryRecipe,
  preferences: string[],
  balancePrefer: string[] = [],
  balanceAvoid: string[] = []
): number {
  let score = 0;
  const nameLower = recipe.name.toLowerCase();
  const ingredientNames = recipe.ingredients.map((i) => i.name.toLowerCase());
  const allText = [nameLower, ...ingredientNames].join(' ');

  for (const pref of preferences) {
    const prefLower = pref.toLowerCase().trim();
    if (!prefLower) continue;
    if (nameLower === prefLower) score += 5;
    else if (nameLower.includes(prefLower)) score += 3;
    else if (ingredientNames.some((ing) => ing.includes(prefLower))) score += 1;
  }

  for (const kw of balancePrefer) {
    if (allText.includes(kw.toLowerCase())) score += 1;
  }
  for (const kw of balanceAvoid) {
    if (allText.includes(kw.toLowerCase())) score -= 2;
  }

  return score;
}

function matchRecipesToPreferences(
  recipes: GlossaryRecipe[],
  preferences: string[],
  balancePrefer: string[] = [],
  balanceAvoid: string[] = []
): GlossaryRecipe[] {
  const scored = recipes.map((r) => ({
    recipe: r,
    score: scoreRecipe(r, preferences, balancePrefer, balanceAvoid),
  }));

  if (preferences.length === 0 && balancePrefer.length === 0) {
    return shuffleArray([...recipes]);
  }

  const matched = scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score);
  const unmatched = shuffleArray(scored.filter((s) => s.score <= 0));
  return [...matched.map((s) => s.recipe), ...unmatched.map((s) => s.recipe)];
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Component Builders ──────────────────────────────────────────────

function glossaryToMealComponent(recipe: GlossaryRecipe, familySize: number) {
  return {
    id: `comp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: recipe.name,
    description: recipe.description,
    cookTime: recipe.cookTime,
    difficulty: recipe.difficulty,
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
    tips: recipe.tips || [],
    nutritionInfo: recipe.nutritionInfo || null,
    estimatedCostPerServing: 0,
    servingsScaled: familySize,
    dietaryNotes: null,
    isFavorite: false,
  };
}

function simpleItemToComponent(item: SimpleItem) {
  return {
    id: `comp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: item.name,
    description: '',
    cookTime: '2 min',
    difficulty: 'Easy',
    ingredients: [{ name: item.name.toLowerCase(), quantity: '1', unit: 'serving' }],
    instructions: ['Prepare and serve fresh.'],
    tips: [],
    nutritionInfo: { servings: 1, calories: item.calories, protein: '1g', carbs: '15g', fat: '0g' },
    estimatedCostPerServing: 0,
    servingsScaled: 1,
    dietaryNotes: null,
    isFavorite: false,
  };
}

// ─── Fruit & Drink Pickers ──────────────────────────────────────────

function filterBank(bank: SimpleItem[], dietaryConditions: string[], weeklyBudget: number | null, expensiveKeywords: string[]): SimpleItem[] {
  let filtered = [...bank];

  // Budget filter
  if (weeklyBudget && weeklyBudget <= 1500) {
    filtered = filtered.filter((item) =>
      !expensiveKeywords.some((kw) => item.name.toLowerCase().includes(kw))
    );
  }

  // Dietary filter — only include items compatible with conditions
  const lower = dietaryConditions.map((c) => c.toLowerCase());
  if (lower.some((c) => c.includes('keto') || c.includes('low carb'))) {
    filtered = filtered.filter((item) => item.tags.includes('keto') || item.tags.includes('low-sugar'));
  }
  if (lower.some((c) => c.includes('diabetes'))) {
    filtered = filtered.filter((item) => item.tags.includes('low-sugar') || item.calories <= 80);
  }
  if (lower.some((c) => c.includes('vegan'))) {
    filtered = filtered.filter((item) => item.tags.includes('vegan'));
  }
  if (lower.some((c) => c.includes('dairy') || c.includes('lactose'))) {
    filtered = filtered.filter((item) => item.tags.includes('dairy-free') || item.tags.includes('vegan'));
  }

  return filtered.length > 0 ? filtered : bank.slice(0, 5); // fallback to at least some items
}

function pickFromBank(bank: SimpleItem[], usedNames: Set<string>): SimpleItem {
  // Prefer items not recently used
  const unused = bank.filter((item) => !usedNames.has(item.name));
  const pool = unused.length > 0 ? unused : bank;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── Variety Tracker ─────────────────────────────────────────────────

/**
 * Track what each member has had recently to prevent repeats.
 * Tracks main dishes within a 3-day sliding window.
 */
class VarietyTracker {
  private history: Map<string, string[]> = new Map(); // memberName → list of recent main dish names
  private window: number;

  constructor(windowSize: number = 3) {
    this.window = windowSize;
  }

  getRecent(memberName: string): string[] {
    return this.history.get(memberName) || [];
  }

  record(memberName: string, dishName: string): void {
    const recent = this.history.get(memberName) || [];
    recent.push(dishName);
    if (recent.length > this.window) recent.shift();
    this.history.set(memberName, recent);
  }

  isRecent(memberName: string, dishName: string): boolean {
    return this.getRecent(memberName).includes(dishName);
  }
}

// ─── Main Entry Point ────────────────────────────────────────────────

export function selectBreakfasts(
  glossaryRecipes: GlossaryRecipe[],
  breakfastPrefs: BreakfastPref[],
  familySize: number,
  numDays: number,
  dayNames: string[],
  calorieTarget: number | null,
  weeklyBudget: number | null,
  dietaryConditions: string[] = []
): {
  breakfastByDay: Record<string, unknown>;
  breakfastIngredientsByDay: Record<string, string[]>;
} {
  const breakfastByDay: Record<string, unknown> = {};
  const breakfastIngredientsByDay: Record<string, string[]> = {};

  // Guard: if no recipes available
  if (!glossaryRecipes || glossaryRecipes.length === 0) {
    console.warn('[breakfast-selector] No glossary recipes available — returning empty breakfasts');
    for (const day of dayNames) {
      breakfastByDay[day] = { mealType: 'breakfast', components: [], totalCalories: 0, totalCostPerServing: 0 };
      breakfastIngredientsByDay[day] = [];
    }
    return { breakfastByDay, breakfastIngredientsByDay };
  }

  // Step 0: Balance keywords
  const { preferKeywords: balancePrefer, avoidKeywords: balanceAvoid } = getBreakfastBalanceKeywords(dietaryConditions);

  // Step 1: Budget + calorie filtering on main dish pool
  let pool = filterByBudget(glossaryRecipes, weeklyBudget);
  if (calorieTarget && pool.length > 10) {
    const withinRange = pool.filter((r) => {
      const cal = r.nutritionInfo?.calories || 0;
      return cal > 0 && cal >= calorieTarget - 150 && cal <= calorieTarget + 150;
    });
    if (withinRange.length >= 8) pool = withinRange;
  }

  // Step 2: Filter fruit & drink banks for dietary compatibility
  const fruitPool = shuffleArray(filterBank(FRUIT_BANK, dietaryConditions, weeklyBudget, EXPENSIVE_FRUIT));
  const drinkPool = shuffleArray(filterBank(DRINK_BANK, dietaryConditions, weeklyBudget, EXPENSIVE_DRINK));

  console.log(`[breakfast-selector] Pool: ${pool.length} mains, ${fruitPool.length} fruits, ${drinkPool.length} drinks`);

  // Step 3: Build prefs for all members
  const isFamily = familySize > 1;
  const effectivePrefs: BreakfastPref[] = breakfastPrefs.length > 0
    ? breakfastPrefs
    : isFamily
      ? Array.from({ length: familySize }, (_, i) => ({ memberName: `Person ${i + 1}`, preferences: [] }))
      : [{ memberName: 'You', preferences: [] }];

  // Step 4: Variety trackers
  const mainTracker = new VarietyTracker(3);
  const fruitUsed = new Set<string>();
  const drinkUsed = new Set<string>();

  // Step 5: Select 3-component breakfasts
  if (isFamily) {
    // Family mode: per-member per-day
    for (const day of dayNames) {
      const memberBreakfasts = effectivePrefs.map((pref) => {
        const matched = matchRecipesToPreferences(pool, pref.preferences, balancePrefer, balanceAvoid);
        if (matched.length === 0) {
          return {
            memberName: pref.memberName,
            mealType: 'breakfast',
            components: [],
            totalCalories: 0,
            totalCostPerServing: 0,
          };
        }

        // Pick main dish with variety (skip any used in last 3 days by this member)
        let mainRecipe = matched[0];
        for (const recipe of matched) {
          if (!mainTracker.isRecent(pref.memberName, recipe.name)) {
            mainRecipe = recipe;
            break;
          }
        }
        mainTracker.record(pref.memberName, mainRecipe.name);

        // Pick fruit and drink (rotating, no immediate repeats)
        const fruit = pickFromBank(fruitPool, fruitUsed);
        fruitUsed.add(fruit.name);
        if (fruitUsed.size >= fruitPool.length) fruitUsed.clear(); // reset when exhausted

        const drink = pickFromBank(drinkPool, drinkUsed);
        drinkUsed.add(drink.name);
        if (drinkUsed.size >= drinkPool.length) drinkUsed.clear();

        const mainComp = glossaryToMealComponent(mainRecipe, 1);
        const fruitComp = simpleItemToComponent(fruit);
        const drinkComp = simpleItemToComponent(drink);

        const totalCal = (mainRecipe.nutritionInfo?.calories || 0) + fruit.calories + drink.calories;

        return {
          memberName: pref.memberName,
          mealType: 'breakfast',
          components: [mainComp, fruitComp, drinkComp],
          totalCalories: totalCal,
          totalCostPerServing: 0,
        };
      });

      breakfastByDay[day] = { memberBreakfasts };

      // Collect ingredients for cross-meal dedup
      const dayIngredients = new Set<string>();
      for (const mb of memberBreakfasts) {
        for (const comp of mb.components) {
          for (const ing of (comp.ingredients || [])) {
            dayIngredients.add(typeof ing === 'string' ? ing : ing.name.toLowerCase());
          }
        }
      }
      breakfastIngredientsByDay[day] = [...dayIngredients];
    }
  } else {
    // Single person: rotating templates with fruit + drink
    const prefs = effectivePrefs[0].preferences;
    const matched = matchRecipesToPreferences(pool, prefs, balancePrefer, balanceAvoid);
    const memberName = effectivePrefs[0].memberName;

    if (matched.length === 0) {
      for (const day of dayNames) {
        breakfastByDay[day] = { mealType: 'breakfast', components: [], totalCalories: 0, totalCostPerServing: 0 };
        breakfastIngredientsByDay[day] = [];
      }
      return { breakfastByDay, breakfastIngredientsByDay };
    }

    for (const day of dayNames) {
      // Pick main with variety
      let mainRecipe = matched[0];
      for (const recipe of matched) {
        if (!mainTracker.isRecent(memberName, recipe.name)) {
          mainRecipe = recipe;
          break;
        }
      }
      mainTracker.record(memberName, mainRecipe.name);

      const fruit = pickFromBank(fruitPool, fruitUsed);
      fruitUsed.add(fruit.name);
      if (fruitUsed.size >= fruitPool.length) fruitUsed.clear();

      const drink = pickFromBank(drinkPool, drinkUsed);
      drinkUsed.add(drink.name);
      if (drinkUsed.size >= drinkPool.length) drinkUsed.clear();

      const mainComp = glossaryToMealComponent(mainRecipe, familySize);
      const fruitComp = simpleItemToComponent(fruit);
      const drinkComp = simpleItemToComponent(drink);

      const totalCal = (mainRecipe.nutritionInfo?.calories || 0) + fruit.calories + drink.calories;

      breakfastByDay[day] = {
        mealType: 'breakfast',
        components: [mainComp, fruitComp, drinkComp],
        totalCalories: totalCal,
        totalCostPerServing: 0,
      };

      breakfastIngredientsByDay[day] = mainRecipe.ingredients.map((i) => i.name.toLowerCase());
    }
  }

  return { breakfastByDay, breakfastIngredientsByDay };
}

export { EXPENSIVE_INGREDIENTS };
