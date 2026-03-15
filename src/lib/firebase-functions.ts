'use client';

import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { TimeRange, GeneratedWeeklyPlan, BreakfastPreference } from '@/types';

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
  timeRange: TimeRange,
  cuisines: string[] = [],
  weeklyBudget: number | null = null
) {
  const fn = httpsCallable(functions, 'generateRecipes');
  const result = await fn({ ingredients, dietaryConditions, timeRange, cuisines, weeklyBudget });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = result.data as any;
  return { recipes: data.recipes || [], pricesAsOf: data.pricesAsOf || null };
}

export async function generateWeeklyPlan(
  ingredients: string[] = [],
  dietaryConditions: string[],
  familySize: number,
  lunchCuisines: string[],
  dinnerCuisines: string[],
  weeklyBudget: number | null = null,
  breakfastPreferences: BreakfastPreference[] = [],
  planDays: number = 3,
  dailyCaloricTarget: number | null = null,
  memberDietaryConditions: Record<string, string[]> = {},
  dailyCuisines: Record<string, { lunch: string; dinner: string }> = {}
): Promise<{ plan: GeneratedWeeklyPlan; pricesAsOf: string | null }> {
  const fn = httpsCallable(functions, 'generateWeeklyPlan');
  const result = await fn({
    ingredients,
    dietaryConditions,
    familySize,
    lunchCuisines,
    dinnerCuisines,
    weeklyBudget,
    breakfastPreferences,
    planDays,
    dailyCaloricTarget,
    memberDietaryConditions,
    dailyCuisines,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = result.data as any;
  return { plan: data.plan, pricesAsOf: data.pricesAsOf || null };
}

export async function seedRecipeGlossary(): Promise<{ added: number; skipped: number; total: number }> {
  const fn = httpsCallable(functions, 'seedRecipeGlossary');
  const result = await fn({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return result.data as any;
}

export async function migrateUserRecipesToGlossary(): Promise<{ added: number; skipped: number; errors: number; totalUsers: number }> {
  const fn = httpsCallable(functions, 'migrateUserRecipesToGlossary');
  const result = await fn({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return result.data as any;
}

export async function deleteUserAccount(uid: string): Promise<{ success: boolean }> {
  const fn = httpsCallable<{ uid: string }, { success: boolean }>(
    functions,
    'deleteUser'
  );
  const result = await fn({ uid });
  return result.data;
}
