'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { TimeRange } from '@/types';

interface RecipeFlowState {
  ingredients: string[];
  dietaryConditions: string[];
  timeRange: TimeRange | null;
  addIngredient: (ingredient: string) => void;
  addIngredients: (ingredients: string[]) => void;
  removeIngredient: (ingredient: string) => void;
  clearIngredients: () => void;
  setDietaryConditions: (conditions: string[]) => void;
  toggleDietaryCondition: (id: string) => void;
  setTimeRange: (range: TimeRange) => void;
  resetFlow: () => void;
}

const RecipeFlowContext = createContext<RecipeFlowState | null>(null);

export function RecipeFlowProvider({ children }: { children: ReactNode }) {
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [dietaryConditions, setDietaryConditionsState] = useState<string[]>([]);
  const [timeRange, setTimeRangeState] = useState<TimeRange | null>(null);

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

  const setTimeRange = useCallback((range: TimeRange) => {
    setTimeRangeState(range);
  }, []);

  const resetFlow = useCallback(() => {
    setIngredients([]);
    setTimeRangeState(null);
  }, []);

  return (
    <RecipeFlowContext.Provider
      value={{
        ingredients,
        dietaryConditions,
        timeRange,
        addIngredient,
        addIngredients,
        removeIngredient,
        clearIngredients,
        setDietaryConditions,
        toggleDietaryCondition,
        setTimeRange,
        resetFlow,
      }}
    >
      {children}
    </RecipeFlowContext.Provider>
  );
}

export function useRecipeFlow() {
  const ctx = useContext(RecipeFlowContext);
  if (!ctx) throw new Error('useRecipeFlow must be used within RecipeFlowProvider');
  return ctx;
}
