import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import { GeneratedWeeklyPlan, MealComponent } from '@/types';

function weeklyPlansCol(userId: string) {
  return collection(db, 'users', userId, 'weeklyPlans');
}

export async function saveGeneratedPlan(
  userId: string,
  plan: GeneratedWeeklyPlan
): Promise<void> {
  const ref = doc(db, 'users', userId, 'weeklyPlans', plan.id);
  await setDoc(ref, plan);
}

export async function loadGeneratedPlan(
  userId: string,
  planId: string
): Promise<GeneratedWeeklyPlan | null> {
  const ref = doc(db, 'users', userId, 'weeklyPlans', planId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return snap.data() as GeneratedWeeklyPlan;
  }
  return null;
}

export async function loadLatestPlan(
  userId: string
): Promise<GeneratedWeeklyPlan | null> {
  const q = query(weeklyPlansCol(userId), orderBy('createdAt', 'desc'), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data() as GeneratedWeeklyPlan;
}

export async function loadAllPlans(
  userId: string
): Promise<GeneratedWeeklyPlan[]> {
  const q = query(weeklyPlansCol(userId), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as GeneratedWeeklyPlan);
}

export async function updateMealComponent(
  userId: string,
  planId: string,
  dayIndex: number,
  mealType: 'breakfast' | 'lunch' | 'dinner',
  componentIndex: number,
  newComponent: MealComponent
): Promise<void> {
  const plan = await loadGeneratedPlan(userId, planId);
  if (!plan) throw new Error('Plan not found');

  const day = plan.days[dayIndex];
  if (!day) throw new Error('Day not found');

  const meal = day[mealType];
  if ('options' in meal) {
    // BreakfastOptions — can't directly swap a single component
    throw new Error('Use updateBreakfastOption for family breakfast options');
  }

  if (componentIndex < 0 || componentIndex >= meal.components.length) {
    throw new Error('Component index out of range');
  }

  meal.components[componentIndex] = newComponent;
  await saveGeneratedPlan(userId, plan);
}

export async function toggleComponentFavorite(
  userId: string,
  planId: string,
  dayIndex: number,
  mealType: 'breakfast' | 'lunch' | 'dinner',
  componentIndex: number
): Promise<boolean> {
  const plan = await loadGeneratedPlan(userId, planId);
  if (!plan) throw new Error('Plan not found');

  const day = plan.days[dayIndex];
  if (!day) throw new Error('Day not found');

  const meal = day[mealType];
  if ('options' in meal) {
    throw new Error('Use specific option index for family breakfast');
  }

  const component = meal.components[componentIndex];
  if (!component) throw new Error('Component not found');

  component.isFavorite = !component.isFavorite;
  await saveGeneratedPlan(userId, plan);
  return component.isFavorite;
}

export async function deleteGeneratedPlan(
  userId: string,
  planId: string
): Promise<void> {
  const ref = doc(db, 'users', userId, 'weeklyPlans', planId);
  await deleteDoc(ref);
}
