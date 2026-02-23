import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { MealPlan, DayOfWeek } from '@/types';

const DAYS: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

function emptyPlan(weekId: string): MealPlan {
  const days = {} as MealPlan['days'];
  for (const d of DAYS) {
    days[d] = { recipeIds: [] };
  }
  return { weekId, days };
}

export function getWeekId(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export function getWeekDates(weekId: string): { start: Date; end: Date } {
  const [yearStr, weekStr] = weekId.split('-W');
  const year = parseInt(yearStr);
  const week = parseInt(weekStr);
  // Jan 4 is always in week 1
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7; // Mon=1 ... Sun=7
  const mondayOfWeek1 = new Date(jan4);
  mondayOfWeek1.setDate(jan4.getDate() - dayOfWeek + 1);
  const start = new Date(mondayOfWeek1);
  start.setDate(mondayOfWeek1.getDate() + (week - 1) * 7);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end };
}

export async function loadMealPlan(userId: string, weekId: string): Promise<MealPlan> {
  const ref = doc(db, 'users', userId, 'mealPlans', weekId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return snap.data() as MealPlan;
  }
  return emptyPlan(weekId);
}

export async function saveMealPlan(userId: string, plan: MealPlan): Promise<void> {
  const ref = doc(db, 'users', userId, 'mealPlans', plan.weekId);
  await setDoc(ref, plan);
}

export async function addRecipeToDay(
  userId: string,
  weekId: string,
  day: DayOfWeek,
  recipeId: string
): Promise<MealPlan> {
  const plan = await loadMealPlan(userId, weekId);
  if (!plan.days[day].recipeIds.includes(recipeId)) {
    plan.days[day].recipeIds.push(recipeId);
  }
  await saveMealPlan(userId, plan);
  return plan;
}

export async function removeRecipeFromDay(
  userId: string,
  weekId: string,
  day: DayOfWeek,
  recipeId: string
): Promise<MealPlan> {
  const plan = await loadMealPlan(userId, weekId);
  plan.days[day].recipeIds = plan.days[day].recipeIds.filter((id) => id !== recipeId);
  await saveMealPlan(userId, plan);
  return plan;
}
