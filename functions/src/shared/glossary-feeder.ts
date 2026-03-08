/**
 * Glossary feeder: auto-adds generated recipes to the recipe-glossary Firestore collection.
 * Called after both Quick Recipe and Weekly Meal Plan generation.
 */

import * as admin from 'firebase-admin';

interface GlossaryRecipeInput {
  name: string;
  description: string;
  cookTime: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
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
  region: string;
  source: 'spoonacular' | 'seed' | 'user-rated';
  spoonacularId?: number;
}

function generateGlossaryId(name: string, cuisine: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50);
  const cuisineSlug = cuisine.toLowerCase().replace(/\s+/g, '-').slice(0, 20);
  return `${slug}-${cuisineSlug}`;
}

/**
 * Feed recipes into the glossary collection.
 * Deduplicates by checking if a recipe with the same name+cuisine already exists.
 * Non-blocking — errors are logged but don't propagate.
 */
export async function feedToGlossary(recipes: GlossaryRecipeInput[]): Promise<number> {
  const db = admin.firestore();
  const glossaryCol = db.collection('recipe-glossary');
  let addedCount = 0;

  for (const recipe of recipes) {
    try {
      const primaryCuisine = recipe.cuisine[0] || 'Global';
      const id = generateGlossaryId(recipe.name, primaryCuisine);

      // Check for existing entry
      const existing = await glossaryCol.doc(id).get();
      if (existing.exists) {
        // Update usage stats
        const data = existing.data();
        await glossaryCol.doc(id).update({
          useCount: (data?.useCount || 0) + 1,
          lastUsedAt: new Date().toISOString(),
        });
        console.log(`[glossary-feed] Updated existing: ${recipe.name}`);
        continue;
      }

      // Add new entry
      const glossaryEntry = {
        id,
        name: recipe.name,
        description: recipe.description,
        cookTime: recipe.cookTime,
        difficulty: recipe.difficulty,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        tips: recipe.tips || [],
        nutritionInfo: recipe.nutritionInfo || null,
        cuisine: recipe.cuisine,
        dietaryTags: recipe.dietaryTags,
        mealTypes: recipe.mealTypes,
        region: recipe.region,
        source: recipe.source,
        spoonacularId: recipe.spoonacularId || null,
        useCount: 1,
        avgRating: 0,
        lastUsedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      await glossaryCol.doc(id).set(glossaryEntry);
      addedCount++;
      console.log(`[glossary-feed] Added new: ${recipe.name} (${id})`);
    } catch (err) {
      console.error(`[glossary-feed] Error adding ${recipe.name}:`, err);
    }
  }

  console.log(`[glossary-feed] Added ${addedCount} new recipes, updated ${recipes.length - addedCount} existing`);
  return addedCount;
}

/**
 * Infer region from cuisine names.
 */
export function inferRegion(cuisines: string[]): string {
  const c = cuisines.map((s) => s.toLowerCase());
  if (c.some((x) => ['indian', 'south asian', 'pakistani', 'bangladeshi', 'sri lankan', 'nepali'].includes(x))) return 'south-asian';
  if (c.some((x) => ['italian', 'french', 'spanish', 'greek', 'mediterranean', 'british', 'german'].includes(x))) return 'european';
  if (c.some((x) => ['american', 'mexican', 'brazilian', 'caribbean'].includes(x))) return 'american';
  if (c.some((x) => ['chinese', 'japanese', 'korean', 'thai', 'vietnamese', 'asian'].includes(x))) return 'east-asian';
  if (c.some((x) => ['middle eastern', 'turkish', 'lebanese', 'persian', 'arabic'].includes(x))) return 'middle-eastern';
  return 'global';
}

/**
 * Infer dietary tags from a list of dietary condition labels.
 */
export function inferDietaryTags(conditions: string[]): string[] {
  const tags: string[] = [];
  const lower = conditions.map((c) => c.toLowerCase());

  if (lower.some((c) => c.includes('vegan'))) tags.push('vegan');
  if (lower.some((c) => c.includes('vegetarian'))) tags.push('vegetarian');
  if (lower.some((c) => c.includes('gluten') || c.includes('celiac'))) tags.push('gluten-free');
  if (lower.some((c) => c.includes('dairy') || c.includes('lactose'))) tags.push('dairy-free');
  if (lower.some((c) => c.includes('nut'))) tags.push('nut-free');
  if (lower.some((c) => c.includes('egg'))) tags.push('egg-free');
  if (lower.some((c) => c.includes('keto') || c.includes('low carb'))) tags.push('low-carb');
  if (lower.some((c) => c.includes('halal'))) tags.push('halal');
  if (lower.some((c) => c.includes('kosher'))) tags.push('kosher');
  if (lower.some((c) => c.includes('jain'))) tags.push('jain');

  return tags;
}

/**
 * Map dietary/health conditions to recipe tags that should be excluded.
 * When a user has cardiovascular disease, for example, fried recipes are excluded.
 */
export function getExcludedTags(dietaryConditions: string[]): string[] {
  const excluded: Set<string> = new Set();
  const lower = dietaryConditions.map((c) => c.toLowerCase());

  // Fried items excluded for heart, liver, diabetes, weight-loss diets
  const excludeFried = lower.some((c) =>
    c.includes('cardiovascular') || c.includes('heart') ||
    c.includes('fatty liver') || c.includes('cholesterol') ||
    c.includes('diabetes') || c.includes('hypertension') ||
    c.includes('blood pressure') || c.includes('dash') ||
    c.includes('whole30') || c.includes('mediterranean') ||
    c.includes('gout')
  );
  if (excludeFried) excluded.add('fried');

  // High-sugar excluded for diabetes, keto, low-carb
  const excludeSugar = lower.some((c) =>
    c.includes('diabetes') || c.includes('keto') ||
    c.includes('low carb') || c.includes('whole30') ||
    c.includes('fatty liver')
  );
  if (excludeSugar) excluded.add('high-sugar');

  return Array.from(excluded);
}

/**
 * Query the glossary for recipes matching given criteria.
 * Used by generateWeeklyPlan to check if we have enough recipes to skip Spoonacular.
 */
export async function queryGlossaryForPlan(
  cuisines: string[],
  dietaryTags: string[],
  mealTypes: string[],
  minCount: number = 15,
  excludeTags: string[] = []
): Promise<{ recipes: GlossaryRecipeInput[]; hasEnough: boolean }> {
  const db = admin.firestore();
  const glossaryCol = db.collection('recipe-glossary');

  let q;
  if (cuisines.length > 0) {
    q = glossaryCol
      .where('cuisine', 'array-contains', cuisines[0])
      .orderBy('useCount', 'desc')
      .limit(50);
  } else if (mealTypes.length > 0) {
    q = glossaryCol
      .where('mealTypes', 'array-contains', mealTypes[0])
      .orderBy('useCount', 'desc')
      .limit(50);
  } else {
    q = glossaryCol.orderBy('useCount', 'desc').limit(50);
  }

  const snap = await q.get();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let results = snap.docs.map((d) => d.data() as GlossaryRecipeInput & { id: string; useCount: number; lastUsedAt: string; tags?: string[] });

  // Client-side filtering
  if (dietaryTags.length > 0) {
    results = results.filter((r) =>
      dietaryTags.every((tag) => r.dietaryTags?.includes(tag))
    );
  }

  if (mealTypes.length > 0) {
    results = results.filter((r) =>
      mealTypes.some((mt) => r.mealTypes?.includes(mt))
    );
  }

  // Additional cuisine filtering if multiple cuisines
  if (cuisines.length > 1) {
    results = results.filter((r) =>
      cuisines.some((c) => r.cuisine?.includes(c))
    );
  }

  // Exclude recipes with health-condition-conflicting tags (e.g., fried, high-sugar)
  if (excludeTags.length > 0) {
    results = results.filter((r) =>
      !excludeTags.some((tag) => (r.tags || []).includes(tag))
    );
  }

  return {
    recipes: results,
    hasEnough: results.length >= minCount,
  };
}
