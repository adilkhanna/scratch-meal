'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
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
  updateMemberName: (index: number, newName: string) => void;
  updateMemberBreakfastPrefs: (index: number, preferences: string[]) => void;
  setWeeklyBudget: (budget: number | null) => void;
  setPlanDays: (days: number) => void;
  loadSavedMember: (member: { name: string; breakfastPreferences: string[]; dietaryConditions: string[] }) => void;
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

  // Auto-sync breakfastPreferences slots when familySize changes
  useEffect(() => {
    if (familySize <= 1) {
      // Single-person mode: clear member slots
      setBreakfastPreferencesState([]);
      setMemberDietaryConditionsState({});
      return;
    }

    setBreakfastPreferencesState((prev) => {
      if (prev.length === familySize) return prev;

      if (prev.length < familySize) {
        // Append new slots
        const newSlots: BreakfastPreference[] = [];
        for (let i = prev.length; i < familySize; i++) {
          newSlots.push({ memberName: `Person ${i + 1}`, preferences: [] });
        }
        return [...prev, ...newSlots];
      }

      // Truncate from end
      const truncated = prev.slice(0, familySize);
      // Clean up memberDietaryConditions for removed members
      const removedNames = prev.slice(familySize).map((p) => p.memberName);
      if (removedNames.length > 0) {
        setMemberDietaryConditionsState((prevDiet) => {
          const next = { ...prevDiet };
          removedNames.forEach((name) => delete next[name]);
          // Update shared union
          const union = new Set<string>();
          Object.values(next).forEach((conds) => conds.forEach((c) => union.add(c)));
          setDietaryConditionsState(Array.from(union));
          return next;
        });
      }
      return truncated;
    });
  }, [familySize]);

  const updateMemberName = useCallback((index: number, newName: string) => {
    setBreakfastPreferencesState((prev) => {
      if (index < 0 || index >= prev.length) return prev;
      const oldName = prev[index].memberName;
      const updated = [...prev];
      updated[index] = { ...updated[index], memberName: newName };

      // Migrate memberDietaryConditions key
      if (oldName !== newName) {
        setMemberDietaryConditionsState((prevDiet) => {
          if (!(oldName in prevDiet)) return prevDiet;
          const next = { ...prevDiet };
          next[newName] = next[oldName];
          delete next[oldName];
          return next;
        });
      }

      return updated;
    });
  }, []);

  const updateMemberBreakfastPrefs = useCallback((index: number, preferences: string[]) => {
    setBreakfastPreferencesState((prev) => {
      if (index < 0 || index >= prev.length) return prev;
      const updated = [...prev];
      updated[index] = { ...updated[index], preferences };
      return updated;
    });
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

  const loadSavedMember = useCallback((member: { name: string; breakfastPreferences: string[]; dietaryConditions: string[] }) => {
    // We need to atomically update prefs, familySize, and dietary so the
    // useEffect that auto-syncs slots sees them already in sync.
    // Strategy: read current prefs via updater, compute new array, then
    // set familySize to match so the useEffect is a no-op.
    setBreakfastPreferencesState((prev) => {
      // Skip if already loaded
      if (prev.some((p) => p.memberName === member.name)) return prev;

      // If there are generic placeholder slots (e.g. "Person N" with no prefs),
      // replace the first placeholder instead of appending
      const placeholderIdx = prev.findIndex(
        (p) => /^Person \d+$/i.test(p.memberName) && p.preferences.length === 0
      );

      let updated: BreakfastPreference[];
      if (placeholderIdx >= 0) {
        updated = [...prev];
        updated[placeholderIdx] = { memberName: member.name, preferences: member.breakfastPreferences };
        // familySize stays the same — we replaced a slot, didn't add one
      } else {
        updated = [...prev, { memberName: member.name, preferences: member.breakfastPreferences }];
        // Ensure familySize matches so useEffect won't pad
        setFamilySizeState(Math.max(2, updated.length));
      }
      return updated;
    });
    setMemberDietaryConditionsState((prev) => {
      const updated = { ...prev, [member.name]: member.dietaryConditions };
      // Recalculate shared union
      const union = new Set<string>();
      Object.values(updated).forEach((conds) => conds.forEach((c) => union.add(c)));
      setDietaryConditionsState(Array.from(union));
      return updated;
    });
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
        updateMemberName,
        updateMemberBreakfastPrefs,
        setLunchCuisines,
        toggleLunchCuisine,
        setDinnerCuisines,
        toggleDinnerCuisine,
        setDailyCuisines,
        setDayCuisine,
        setWeeklyBudget,
        setPlanDays,
        loadSavedMember,
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
