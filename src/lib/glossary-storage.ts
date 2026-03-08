import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  getCountFromServer,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { GlossaryRecipe, MealSlot } from '@/types';

const GLOSSARY_COL = 'recipe-glossary';

function glossaryCol() {
  return collection(db, GLOSSARY_COL);
}

/** Query glossary recipes matching given criteria */
export async function queryGlossary(
  cuisines: string[],
  dietaryTags: string[],
  mealTypes: MealSlot[],
  maxResults: number = 30
): Promise<GlossaryRecipe[]> {
  // Firestore doesn't support array-contains on multiple fields simultaneously,
  // so we query by the most selective field and filter client-side
  let q;

  if (cuisines.length > 0) {
    // Query by first cuisine, filter rest client-side
    q = query(
      glossaryCol(),
      where('cuisine', 'array-contains', cuisines[0]),
      orderBy('useCount', 'desc'),
      limit(maxResults * 3) // overfetch to account for client-side filtering
    );
  } else if (mealTypes.length > 0) {
    q = query(
      glossaryCol(),
      where('mealTypes', 'array-contains', mealTypes[0]),
      orderBy('useCount', 'desc'),
      limit(maxResults * 3)
    );
  } else {
    q = query(
      glossaryCol(),
      orderBy('useCount', 'desc'),
      limit(maxResults * 3)
    );
  }

  const snap = await getDocs(q);
  let results = snap.docs.map((d) => d.data() as GlossaryRecipe);

  // Client-side filtering for additional criteria
  if (cuisines.length > 1) {
    results = results.filter((r) =>
      cuisines.some((c) => r.cuisine.includes(c))
    );
  }

  if (dietaryTags.length > 0) {
    results = results.filter((r) =>
      dietaryTags.every((tag) => r.dietaryTags.includes(tag))
    );
  }

  if (mealTypes.length > 0) {
    results = results.filter((r) =>
      mealTypes.some((mt) => r.mealTypes.includes(mt))
    );
  }

  // Deprioritize stale recipes (unused for 6+ months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const staleThreshold = sixMonthsAgo.toISOString();

  results.sort((a, b) => {
    const aStale = a.lastUsedAt < staleThreshold;
    const bStale = b.lastUsedAt < staleThreshold;
    if (aStale && !bStale) return 1;
    if (!aStale && bStale) return -1;
    return b.useCount - a.useCount;
  });

  return results.slice(0, maxResults);
}

/** Add a recipe to the glossary (dedupes by name + first cuisine) */
export async function addToGlossary(recipe: GlossaryRecipe): Promise<void> {
  const ref = doc(db, GLOSSARY_COL, recipe.id);
  await setDoc(ref, recipe);
}

/** Batch add recipes to the glossary */
export async function batchAddToGlossary(
  recipes: GlossaryRecipe[]
): Promise<void> {
  // Firestore batches limited to 500 writes
  const batchSize = 400;
  for (let i = 0; i < recipes.length; i += batchSize) {
    const batch = recipes.slice(i, i + batchSize);
    const promises = batch.map((r) => setDoc(doc(db, GLOSSARY_COL, r.id), r));
    await Promise.all(promises);
  }
}

/** Increment use count and update lastUsedAt */
export async function incrementUseCount(glossaryId: string): Promise<void> {
  const ref = doc(db, GLOSSARY_COL, glossaryId);
  await updateDoc(ref, {
    useCount: (await getDocs(query(glossaryCol(), limit(0)))).size, // just update fields
    lastUsedAt: new Date().toISOString(),
  });
}

/** Update use stats for a glossary recipe */
export async function updateGlossaryUsage(
  glossaryId: string,
  currentUseCount: number
): Promise<void> {
  const ref = doc(db, GLOSSARY_COL, glossaryId);
  await updateDoc(ref, {
    useCount: currentUseCount + 1,
    lastUsedAt: new Date().toISOString(),
  });
}

/** Get glossary statistics for admin panel */
export async function getGlossaryStats(): Promise<{
  total: number;
  byCuisine: Record<string, number>;
  byRegion: Record<string, number>;
  staleCount: number;
}> {
  const snap = await getDocs(glossaryCol());
  const recipes = snap.docs.map((d) => d.data() as GlossaryRecipe);

  const byCuisine: Record<string, number> = {};
  const byRegion: Record<string, number> = {};
  let staleCount = 0;

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const staleThreshold = sixMonthsAgo.toISOString();

  for (const r of recipes) {
    // Count by cuisine
    for (const c of r.cuisine) {
      byCuisine[c] = (byCuisine[c] || 0) + 1;
    }
    // Count by region
    byRegion[r.region] = (byRegion[r.region] || 0) + 1;
    // Count stale
    if (r.lastUsedAt < staleThreshold) staleCount++;
  }

  return {
    total: recipes.length,
    byCuisine,
    byRegion,
    staleCount,
  };
}

/** Check if a recipe with similar name already exists in glossary */
export async function findDuplicateInGlossary(
  name: string,
  cuisine: string
): Promise<GlossaryRecipe | null> {
  const normalizedName = name.trim().toLowerCase();
  const q = query(
    glossaryCol(),
    where('cuisine', 'array-contains', cuisine),
    limit(100)
  );
  const snap = await getDocs(q);
  const match = snap.docs.find(
    (d) => (d.data() as GlossaryRecipe).name.trim().toLowerCase() === normalizedName
  );
  return match ? (match.data() as GlossaryRecipe) : null;
}
