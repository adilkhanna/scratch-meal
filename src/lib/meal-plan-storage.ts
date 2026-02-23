import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { MealPlan, DayOfWeek, DayPlan, MealSlot } from '@/types';

const DAYS: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner'];

function emptyDayPlan(): DayPlan {
  return {
    breakfast: { recipeIds: [] },
    lunch: { recipeIds: [] },
    dinner: { recipeIds: [] },
  };
}

function emptyPlan(weekId: string): MealPlan {
  const days = {} as MealPlan['days'];
  for (const d of DAYS) {
    days[d] = emptyDayPlan();
  }
  return { weekId, days };
}

// Migrate old flat format { recipeIds: string[] } → new slotted format
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function migratePlan(raw: any, weekId: string): MealPlan {
  const plan = emptyPlan(weekId);
  if (raw?.days) {
    for (const d of DAYS) {
      const dayData = raw.days[d];
      if (!dayData) continue;
      // New format: has breakfast/lunch/dinner keys
      if (dayData.breakfast || dayData.lunch || dayData.dinner) {
        plan.days[d] = {
          breakfast: { recipeIds: dayData.breakfast?.recipeIds || [] },
          lunch: { recipeIds: dayData.lunch?.recipeIds || [] },
          dinner: { recipeIds: dayData.dinner?.recipeIds || [] },
        };
      } else if (Array.isArray(dayData.recipeIds)) {
        // Old flat format — move everything into lunch
        plan.days[d] = {
          breakfast: { recipeIds: [] },
          lunch: { recipeIds: dayData.recipeIds },
          dinner: { recipeIds: [] },
        };
      }
    }
  }
  return plan;
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
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
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
    return migratePlan(snap.data(), weekId);
  }
  return emptyPlan(weekId);
}

export async function saveMealPlan(userId: string, plan: MealPlan): Promise<void> {
  const ref = doc(db, 'users', userId, 'mealPlans', plan.weekId);
  await setDoc(ref, plan);
}

export async function addRecipeToSlot(
  userId: string,
  weekId: string,
  day: DayOfWeek,
  slot: MealSlot,
  recipeId: string
): Promise<MealPlan> {
  const plan = await loadMealPlan(userId, weekId);
  if (!plan.days[day][slot].recipeIds.includes(recipeId)) {
    plan.days[day][slot].recipeIds.push(recipeId);
  }
  await saveMealPlan(userId, plan);
  return plan;
}

export async function removeRecipeFromSlot(
  userId: string,
  weekId: string,
  day: DayOfWeek,
  slot: MealSlot,
  recipeId: string
): Promise<MealPlan> {
  const plan = await loadMealPlan(userId, weekId);
  plan.days[day][slot].recipeIds = plan.days[day][slot].recipeIds.filter((id) => id !== recipeId);
  await saveMealPlan(userId, plan);
  return plan;
}

export { SLOTS, DAYS };
