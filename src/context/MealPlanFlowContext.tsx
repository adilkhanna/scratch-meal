'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { BreakfastPreference } from '@/types';

interface MealPlanFlowState {
  ingredients: string[];
  dietaryConditions: string[];
  familySize: number;
  breakfastPreferences: BreakfastPreference[];
  lunchCuisines: string[];
  dinnerCuisines: string[];
  weeklyBudget: number | null;
  addIngredient: (ingredient: string) => void;
  addIngredients: (ingredients: string[]) => void;
  removeIngredient: (ingredient: string) => void;
  clearIngredients: () => void;
  setDietaryConditions: (conditions: string[]) => void;
  toggleDietaryCondition: (id: string) => void;
  setFamilySize: (size: number) => void;
  setBreakfastPreferences: (prefs: BreakfastPreference[]) => void;
  addBreakfastPreference: (pref: BreakfastPreference) => void;
  removeBreakfastPreference: (memberName: string) => void;
  setLunchCuisines: (cuisines: string[]) => void;
  toggleLunchCuisine: (id: string) => void;
  setDinnerCuisines: (cuisines: string[]) => void;
  toggleDinnerCuisine: (id: string) => void;
  setWeeklyBudget: (budget: number | null) => void;
  resetMealPlanFlow: () => void;
}

const MealPlanFlowContext = createContext<MealPlanFlowState | null>(null);

export function MealPlanFlowProvider({ children }: { children: ReactNode }) {
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [dietaryConditions, setDietaryConditionsState] = useState<string[]>([]);
  const [familySize, setFamilySizeState] = useState<number>(1);
  const [breakfastPreferences, setBreakfastPreferencesState] = useState<BreakfastPreference[]>([]);
  const [lunchCuisines, setLunchCuisinesState] = useState<string[]>([]);
  const [dinnerCuisines, setDinnerCuisinesState] = useState<string[]>([]);
  const [weeklyBudget, setWeeklyBudgetState] = useState<number | null>(null);

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

  const resetMealPlanFlow = useCallback(() => {
    setIngredients([]);
    setFamilySizeState(1);
    setBreakfastPreferencesState([]);
    setLunchCuisinesState([]);
    setDinnerCuisinesState([]);
    setWeeklyBudgetState(null);
    // Note: dietary conditions are NOT reset (they persist across sessions like RecipeFlowContext)
  }, []);

  return (
    <MealPlanFlowContext.Provider
      value={{
        ingredients,
        dietaryConditions,
        familySize,
        breakfastPreferences,
        lunchCuisines,
        dinnerCuisines,
        weeklyBudget,
        addIngredient,
        addIngredients,
        removeIngredient,
        clearIngredients,
        setDietaryConditions,
        toggleDietaryCondition,
        setFamilySize,
        setBreakfastPreferences,
        addBreakfastPreference,
        removeBreakfastPreference,
        setLunchCuisines,
        toggleLunchCuisine,
        setDinnerCuisines,
        toggleDinnerCuisine,
        setWeeklyBudget,
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
