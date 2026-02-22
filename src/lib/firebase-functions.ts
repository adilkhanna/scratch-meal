'use client';

import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { TimeRange } from '@/types';

export async function extractIngredientsFromPhoto(imageBase64: string): Promise<string[]> {
  const fn = httpsCallable<{ imageBase64: string }, { ingredients: string[] }>(
    functions,
    'extractIngredients'
  );
  const result = await fn({ imageBase64 });
  return result.data.ingredients || [];
}

export async function generateRecipes(
  ingredients: string[],
  dietaryConditions: string[],
  timeRange: TimeRange
) {
  const fn = httpsCallable(functions, 'generateRecipes');
  const result = await fn({ ingredients, dietaryConditions, timeRange });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (result.data as any).recipes || [];
}

export async function deleteUserAccount(uid: string): Promise<{ success: boolean }> {
  const fn = httpsCallable<{ uid: string }, { success: boolean }>(
    functions,
    'deleteUser'
  );
  const result = await fn({ uid });
  return result.data;
}
