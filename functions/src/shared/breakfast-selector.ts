/**
 * Deterministic breakfast selector — NO GPT involved.
 * Selects real recipes from the glossary based on user preferences.
 * Makes hallucination structurally impossible.
 */

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

// Expensive ingredients that should be filtered when budget is low
const EXPENSIVE_INGREDIENTS = [
  'avocado', 'quinoa', 'salmon', 'prawn', 'shrimp',
  'pine nut', 'saffron', 'chia seed', 'blueberr',
  'asparagus', 'artichoke', 'macadamia', 'truffle',
  'almond butter', 'cashew butter', 'acai',
  'smoked salmon', 'maple syrup',
];

/**
 * Check if a recipe contains expensive ingredients.
 */
function hasExpensiveIngredients(recipe: GlossaryRecipe): boolean {
  const ingredientNames = recipe.ingredients.map((i) => i.name.toLowerCase());
  return ingredientNames.some((name) =>
    EXPENSIVE_INGREDIENTS.some((exp) => name.includes(exp))
  );
}

/**
 * Filter recipes by budget tier.
 * Low (≤₹1500/week): exclude expensive ingredients
 * Medium (₹1500-3000): allow but deprioritize
 * High/none: no filter
 */
function filterByBudget(recipes: GlossaryRecipe[], weeklyBudget: number | null): GlossaryRecipe[] {
  if (!weeklyBudget || weeklyBudget > 3000) return recipes;

  if (weeklyBudget <= 1500) {
    // Low budget: remove expensive recipes entirely
    const filtered = recipes.filter((r) => !hasExpensiveIngredients(r));
    // If filtering removes too many, keep at least 10
    return filtered.length >= 10 ? filtered : recipes.slice(0, 20);
  }

  // Medium budget: put non-expensive first, then expensive
  const cheap = recipes.filter((r) => !hasExpensiveIngredients(r));
  const expensive = recipes.filter((r) => hasExpensiveIngredients(r));
  return [...cheap, ...expensive];
}

/**
 * Score a recipe against preference keywords.
 * Higher score = better match.
 */
function scoreRecipe(recipe: GlossaryRecipe, preferences: string[]): number {
  if (preferences.length === 0) return 0;

  let score = 0;
  const nameLower = recipe.name.toLowerCase();
  const ingredientNames = recipe.ingredients.map((i) => i.name.toLowerCase());

  for (const pref of preferences) {
    const prefLower = pref.toLowerCase().trim();
    if (!prefLower) continue;

    // Exact name match (highest)
    if (nameLower === prefLower) {
      score += 5;
    }
    // Name contains preference keyword
    else if (nameLower.includes(prefLower)) {
      score += 3;
    }
    // Any ingredient contains preference keyword
    else if (ingredientNames.some((ing) => ing.includes(prefLower))) {
      score += 1;
    }
  }

  return score;
}

/**
 * Match recipes to a member's preferences.
 * Returns sorted list (best matches first), with unmatched recipes after.
 */
function matchRecipesToPreferences(
  recipes: GlossaryRecipe[],
  preferences: string[]
): GlossaryRecipe[] {
  if (preferences.length === 0) {
    // No preferences: shuffle and return all
    return shuffleArray([...recipes]);
  }

  const scored = recipes.map((r) => ({ recipe: r, score: scoreRecipe(r, preferences) }));
  // Matched recipes (score > 0) sorted by score desc, then unmatched shuffled
  const matched = scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score);
  const unmatched = shuffleArray(scored.filter((s) => s.score === 0));

  return [...matched.map((s) => s.recipe), ...unmatched.map((s) => s.recipe)];
}

/**
 * Simple Fisher-Yates shuffle.
 */
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Convert a glossary recipe to a MealComponent.
 */
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
    estimatedCostPerServing: 0, // calculated later by cost estimation
    servingsScaled: familySize,
    dietaryNotes: null,
    isFavorite: false,
  };
}

/**
 * Main entry point: select breakfasts deterministically from glossary.
 * No GPT involved. Returns data in the same format the view page expects.
 */
export function selectBreakfasts(
  glossaryRecipes: GlossaryRecipe[],
  breakfastPrefs: BreakfastPref[],
  familySize: number,
  numDays: number,
  dayNames: string[],
  calorieTarget: number | null,
  weeklyBudget: number | null
): {
  breakfastByDay: Record<string, unknown>;
  breakfastIngredientsByDay: Record<string, string[]>;
} {
  // Step 1: Budget filtering
  let pool = filterByBudget(glossaryRecipes, weeklyBudget);

  // Step 2: Calorie filtering (if target set, prefer recipes within range)
  if (calorieTarget && pool.length > 10) {
    const withinRange = pool.filter((r) => {
      const cal = r.nutritionInfo?.calories || 0;
      return cal > 0 && cal >= calorieTarget - 150 && cal <= calorieTarget + 150;
    });
    // Only use calorie-filtered if we have enough
    if (withinRange.length >= 8) pool = withinRange;
  }

  const isFamily = familySize > 1;
  const breakfastByDay: Record<string, unknown> = {};
  const breakfastIngredientsByDay: Record<string, string[]> = {};

  if (isFamily && breakfastPrefs.length > 0) {
    // Family mode: per-member, per-day assignment
    for (const day of dayNames) {
      const memberBreakfasts = breakfastPrefs.map((pref) => {
        const matched = matchRecipesToPreferences(pool, pref.preferences);
        // Pick a recipe, avoiding recent picks for this member
        const recipe = pickWithVariety(matched, day, dayNames, pref.memberName, breakfastByDay);
        const component = glossaryToMealComponent(recipe, 1); // per-person serving
        return {
          memberName: pref.memberName,
          mealType: 'breakfast',
          components: [component],
          totalCalories: recipe.nutritionInfo?.calories || 0,
          totalCostPerServing: 0,
        };
      });

      breakfastByDay[day] = { memberBreakfasts };

      // Collect ingredients for cross-meal deduplication
      const dayIngredients = new Set<string>();
      for (const mb of memberBreakfasts) {
        for (const comp of mb.components) {
          for (const ing of (comp.ingredients || [])) {
            dayIngredients.add(ing.name.toLowerCase());
          }
        }
      }
      breakfastIngredientsByDay[day] = [...dayIngredients];
    }
  } else {
    // Single person or no prefs: rotating templates across days
    const prefs = breakfastPrefs.length > 0 ? breakfastPrefs[0].preferences : [];
    const matched = matchRecipesToPreferences(pool, prefs);

    // Pick unique recipes for rotation (at most 5 templates)
    const templateCount = Math.min(5, matched.length);
    const templates = matched.slice(0, templateCount);

    // Assign templates to days in round-robin
    for (let i = 0; i < dayNames.length; i++) {
      const day = dayNames[i];
      const recipe = templates[i % templateCount];
      const component = glossaryToMealComponent(recipe, familySize);

      breakfastByDay[day] = {
        mealType: 'breakfast',
        components: [component],
        totalCalories: recipe.nutritionInfo?.calories || 0,
        totalCostPerServing: 0,
      };

      // Collect ingredients for cross-meal dedup
      breakfastIngredientsByDay[day] = recipe.ingredients.map((i) => i.name.toLowerCase());
    }
  }

  return { breakfastByDay, breakfastIngredientsByDay };
}

/**
 * Pick a recipe for a member on a given day, ensuring variety
 * (no same recipe on consecutive days for the same member).
 */
function pickWithVariety(
  matchedRecipes: GlossaryRecipe[],
  currentDay: string,
  dayNames: string[],
  memberName: string,
  breakfastByDay: Record<string, unknown>
): GlossaryRecipe {
  // Find what this member had on the previous day
  const dayIndex = dayNames.indexOf(currentDay);
  let previousRecipeName: string | null = null;

  if (dayIndex > 0) {
    const prevDay = dayNames[dayIndex - 1];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prevDayData = breakfastByDay[prevDay] as any;
    if (prevDayData?.memberBreakfasts) {
      const prevMember = prevDayData.memberBreakfasts.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mb: any) => mb.memberName === memberName
      );
      if (prevMember?.components?.[0]?.name) {
        previousRecipeName = prevMember.components[0].name;
      }
    }
  }

  // Pick first recipe that isn't the same as yesterday
  for (const recipe of matchedRecipes) {
    if (recipe.name !== previousRecipeName) {
      return recipe;
    }
  }

  // Fallback: just pick the first one
  return matchedRecipes[0];
}

/**
 * Get the list of expensive ingredients (exported for use in prompts).
 */
export { EXPENSIVE_INGREDIENTS };
