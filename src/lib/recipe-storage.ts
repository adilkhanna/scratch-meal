import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, query, orderBy, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { Recipe } from '@/types';

function recipesCol(userId: string) {
  return collection(db, 'users', userId, 'recipes');
}

export async function saveRecipes(userId: string, recipes: Recipe[]): Promise<void> {
  const batch = writeBatch(db);
  for (const recipe of recipes) {
    const ref = doc(db, 'users', userId, 'recipes', recipe.id);
    batch.set(ref, recipe);
  }
  await batch.commit();
}

export async function loadRecipes(userId: string): Promise<Recipe[]> {
  const q = query(recipesCol(userId), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Recipe);
}

export async function updateRecipeInFirestore(
  userId: string,
  recipeId: string,
  updates: Partial<Recipe>
): Promise<void> {
  const ref = doc(db, 'users', userId, 'recipes', recipeId);
  await updateDoc(ref, updates);
}

export async function deleteRecipeFromFirestore(
  userId: string,
  recipeId: string
): Promise<void> {
  const ref = doc(db, 'users', userId, 'recipes', recipeId);
  await deleteDoc(ref);
}

export async function migrateFromLocalStorage(userId: string): Promise<number> {
  const raw = localStorage.getItem('smm-history');
  if (!raw) return 0;

  try {
    const recipes: Recipe[] = JSON.parse(raw);
    if (!Array.isArray(recipes) || recipes.length === 0) return 0;

    // Check if user already has recipes in Firestore
    const existing = await loadRecipes(userId);
    if (existing.length > 0) {
      // Already migrated or has cloud data — clear localStorage
      localStorage.removeItem('smm-history');
      return 0;
    }

    await saveRecipes(userId, recipes);
    localStorage.removeItem('smm-history');
    return recipes.length;
  } catch {
    return 0;
  }
}
