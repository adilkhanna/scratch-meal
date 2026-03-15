'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { BreakfastPreference } from '@/types';

// Per-member dietary conditions
export type MemberDietaryMap = Record<string, string[]>; // memberName → condition IDs

// Per-day cuisine selection
export interface DayCuisine {
  lunch: string;  // cuisine ID or '' for diverse
  dinner: string; // cuisine ID or '' for diverse
}
export type DailyCuisineMap = Record<string, DayCuisine>; // day name → cuisines

interface MealPlanFlowState {
  ingredients: string[];
  dietaryConditions: string[]; // legacy: shared conditions (union of all members)
  memberDietaryConditions: MemberDietaryMap; // per-person dietary
  familySize: number;
  breakfastPreferences: BreakfastPreference[];
  lunchCuisines: string[]; // legacy: global cuisines (fallback)
  dinnerCuisines: string[]; // legacy: global cuisines (fallback)
  dailyCuisines: DailyCuisineMap; // per-day cuisine selection
  weeklyBudget: number | null;
  planDays: number;
  addIngredient: (ingredient: string) => void;
  addIngredients: (ingredients: string[]) => void;
  removeIngredient: (ingredient: string) => void;
  clearIngredients: () => void;
  setDietaryConditions: (conditions: string[]) => void;
  toggleDietaryCondition: (id: string) => void;
  setMemberDietaryConditions: (conditions: MemberDietaryMap) => void;
  toggleMemberDietaryCondition: (memberName: string, conditionId: string) => void;
  setFamilySize: (size: number) => void;
  setBreakfastPreferences: (prefs: BreakfastPreference[]) => void;
  addBreakfastPreference: (pref: BreakfastPreference) => void;
  removeBreakfastPreference: (memberName: string) => void;
  setLunchCuisines: (cuisines: string[]) => void;
  toggleLunchCuisine: (id: string) => void;
  setDinnerCuisines: (cuisines: string[]) => void;
  toggleDinnerCuisine: (id: string) => void;
  setDailyCuisines: (cuisines: DailyCuisineMap) => void;
  setDayCuisine: (day: string, meal: 'lunch' | 'dinner', cuisineId: string) => void;
  setWeeklyBudget: (budget: number | null) => void;
  setPlanDays: (days: number) => void;
  resetMealPlanFlow: () => void;
}

const MealPlanFlowContext = createContext<MealPlanFlowState | null>(null);

export function MealPlanFlowProvider({ children }: { children: ReactNode }) {
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [dietaryConditions, setDietaryConditionsState] = useState<string[]>([]);
  const [memberDietaryConditions, setMemberDietaryConditionsState] = useState<MemberDietaryMap>({});
  const [familySize, setFamilySizeState] = useState<number>(1);
  const [breakfastPreferences, setBreakfastPreferencesState] = useState<BreakfastPreference[]>([]);
  const [lunchCuisines, setLunchCuisinesState] = useState<string[]>([]);
  const [dinnerCuisines, setDinnerCuisinesState] = useState<string[]>([]);
  const [dailyCuisines, setDailyCuisinesState] = useState<DailyCuisineMap>({});
  const [weeklyBudget, setWeeklyBudgetState] = useState<number | null>(null);
  const [planDays, setPlanDaysState] = useState<number>(3);

  const addIngredient = useCallback((ingredient: string) => {
    const trimmed = ingredient.trim().toLowerCase();
    if (!trimmed) return;
    setIngredients((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
  }, []);

  const addIngredients = useCallback((newIngredients: string[]) => {
    setIngredients((prev) => {
      const unique = new Set(prev);
      newIngredients.forEach((i) => {
        const trimmed = i.trim().toLowerCase();
        if (trimmed) unique.add(trimmed);
      });
      return Array.from(unique);
    });
  }, []);

  const removeIngredient = useCallback((ingredient: string) => {
    setIngredients((prev) => prev.filter((i) => i !== ingredient));
  }, []);

  const clearIngredients = useCallback(() => setIngredients([]), []);

  const setDietaryConditions = useCallback((conditions: string[]) => {
    setDietaryConditionsState(conditions);
  }, []);

  const toggleDietaryCondition = useCallback((id: string) => {
    setDietaryConditionsState((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }, []);

  const setFamilySize = useCallback((size: number) => {
    setFamilySizeState(Math.max(1, Math.min(10, size)));
  }, []);

  const setBreakfastPreferences = useCallback((prefs: BreakfastPreference[]) => {
    setBreakfastPreferencesState(prefs);
  }, []);

  const addBreakfastPreference = useCallback((pref: BreakfastPreference) => {
    setBreakfastPreferencesState((prev) => [...prev, pref]);
  }, []);

  const removeBreakfastPreference = useCallback((memberName: string) => {
    setBreakfastPreferencesState((prev) =>
      prev.filter((p) => p.memberName !== memberName)
    );
  }, []);

  const setLunchCuisines = useCallback((cuisines: string[]) => {
    setLunchCuisinesState(cuisines);
  }, []);

  const toggleLunchCuisine = useCallback((id: string) => {
    setLunchCuisinesState((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }, []);

  const setDinnerCuisines = useCallback((cuisines: string[]) => {
    setDinnerCuisinesState(cuisines);
  }, []);

  const toggleDinnerCuisine = useCallback((id: string) => {
    setDinnerCuisinesState((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }, []);

  const setWeeklyBudget = useCallback((budget: number | null) => {
    setWeeklyBudgetState(budget);
  }, []);

  const setPlanDays = useCallback((days: number) => {
    setPlanDaysState(days === 7 ? 7 : 3);
  }, []);

  const setMemberDietaryConditions = useCallback((conditions: MemberDietaryMap) => {
    setMemberDietaryConditionsState(conditions);
    // Also update the shared union for backward compat
    const union = new Set<string>();
    Object.values(conditions).forEach((conds) => conds.forEach((c) => union.add(c)));
    setDietaryConditionsState(Array.from(union));
  }, []);

  const toggleMemberDietaryCondition = useCallback((memberName: string, conditionId: string) => {
    setMemberDietaryConditionsState((prev) => {
      const memberConds = prev[memberName] || [];
      const updated = memberConds.includes(conditionId)
        ? memberConds.filter((c) => c !== conditionId)
        : [...memberConds, conditionId];
      const next = { ...prev, [memberName]: updated };
      // Update shared union
      const union = new Set<string>();
      Object.values(next).forEach((conds) => conds.forEach((c) => union.add(c)));
      setDietaryConditionsState(Array.from(union));
      return next;
    });
  }, []);

  const setDailyCuisines = useCallback((cuisines: DailyCuisineMap) => {
    setDailyCuisinesState(cuisines);
  }, []);

  const setDayCuisine = useCallback((day: string, meal: 'lunch' | 'dinner', cuisineId: string) => {
    setDailyCuisinesState((prev) => ({
      ...prev,
      [day]: { ...prev[day], [meal]: cuisineId },
    }));
  }, []);

  const resetMealPlanFlow = useCallback(() => {
    setIngredients([]);
    setFamilySizeState(1);
    setBreakfastPreferencesState([]);
    setLunchCuisinesState([]);
    setDinnerCuisinesState([]);
    setDailyCuisinesState({});
    setMemberDietaryConditionsState({});
    setWeeklyBudgetState(null);
    setPlanDaysState(3);
    // Note: dietary conditions are NOT reset (they persist across sessions like RecipeFlowContext)
  }, []);

  return (
    <MealPlanFlowContext.Provider
      value={{
        ingredients,
        dietaryConditions,
        memberDietaryConditions,
        familySize,
        breakfastPreferences,
        lunchCuisines,
        dinnerCuisines,
        dailyCuisines,
        weeklyBudget,
        planDays,
        addIngredient,
        addIngredients,
        removeIngredient,
        clearIngredients,
        setDietaryConditions,
        toggleDietaryCondition,
        setMemberDietaryConditions,
        toggleMemberDietaryCondition,
        setFamilySize,
        setBreakfastPreferences,
        addBreakfastPreference,
        removeBreakfastPreference,
        setLunchCuisines,
        toggleLunchCuisine,
        setDinnerCuisines,
        toggleDinnerCuisine,
        setDailyCuisines,
        setDayCuisine,
        setWeeklyBudget,
        setPlanDays,
        resetMealPlanFlow,
      }}
    >
      {children}
    </MealPlanFlowContext.Provider>
  );
}

export function useMealPlanFlow() {
  const ctx = useContext(MealPlanFlowContext);
  if (!ctx) throw new Error('useMealPlanFlow must be used within MealPlanFlowProvider');
  return ctx;
}
