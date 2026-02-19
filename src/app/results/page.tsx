'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useRecipeFlow } from '@/context/RecipeFlowContext';
import { useToast } from '@/context/ToastContext';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { generateRecipes as generateRecipesAI } from '@/lib/firebase-functions';
import StepIndicator from '@/components/layout/StepIndicator';
import RecipeCard from '@/components/recipes/RecipeCard';
import { Recipe } from '@/types';
import { DIETARY_CONDITIONS } from '@/config/dietary-conditions';

export default function ResultsPage() {
  const router = useRouter();
  const { ingredients, dietaryConditions, timeRange, resetFlow } = useRecipeFlow();
  const { addToast } = useToast();
  const { value: history, setValue: setHistory } = useLocalStorage<Recipe[]>('smm-history', []);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  const conditionLabels = dietaryConditions.map((id) => DIETARY_CONDITIONS.find((c) => c.id === id)?.label ?? id);

  const generateRecipes = useCallback(async () => {
    try {
      const rawRecipes = await generateRecipesAI(ingredients, conditionLabels, timeRange!);
      const recipesWithMeta: Recipe[] = (rawRecipes || []).map(
        (r: Omit<Recipe, 'id' | 'rating' | 'isFavorite' | 'createdAt' | 'searchedIngredients' | 'dietaryConditions' | 'requestedTimeRange'>) => ({
          ...r, id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, rating: 0, isFavorite: false,
          createdAt: new Date().toISOString(), searchedIngredients: ingredients, dietaryConditions: conditionLabels, requestedTimeRange: timeRange,
        })
      );
      setRecipes(recipesWithMeta);
      setHistory((prev: Recipe[]) => [...recipesWithMeta, ...prev]);
      addToast('Recipes generated and saved to history!', 'success');
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to generate recipes'); }
    finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ingredients, timeRange]);

  useEffect(() => {
    if (ingredients.length === 0 || !timeRange) { router.replace('/'); return; }
    if (!hasFetched) { setHasFetched(true); generateRecipes(); }
  }, [ingredients.length, timeRange, router, hasFetched, generateRecipes]);

  const updateRecipe = (id: string, updates: Partial<Recipe>) => {
    setRecipes((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
    setHistory((prev: Recipe[]) => prev.map((r: Recipe) => (r.id === id ? { ...r, ...updates } : r)));
  };

  const handleNewSearch = () => { resetFlow(); router.push('/'); };

  if (ingredients.length === 0 || !timeRange) return null;

  return (
    <div className="animate-fade-in">
      <StepIndicator currentStep={4} />
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#2d2d2a] font-[family-name:var(--font-serif)] mb-1">Your Recipes</h1>
          <p className="text-[#7a7568] text-sm">{loading ? 'Cooking up some ideas...' : `${recipes.length} recipes from ${ingredients.length} ingredients`}</p>
        </div>
        {loading && (
          <div className="flex flex-col items-center py-16 gap-4">
            <div className="text-5xl animate-pulse-soft">🍳</div>
            <div className="w-8 h-8 border-3 border-olive-500 border-t-transparent rounded-full" style={{ animation: 'spin 1s linear infinite' }} />
            <p className="text-sm text-[#7a7568]">Generating recipes with AI...</p>
            <p className="text-xs text-[#a89f94]">This may take 10-15 seconds</p>
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-6 text-center">
            <p className="text-red-600 font-medium text-sm">{error}</p>
            <div className="flex gap-3 justify-center mt-4">
              <button onClick={handleNewSearch} className="px-4 py-2 bg-white border border-cream-200 rounded-lg text-sm font-medium text-[#7a7568] hover:bg-cream-50">Start Over</button>
              <button onClick={() => { setError(null); setLoading(true); setHasFetched(false); }} className="px-4 py-2 bg-olive-600 text-white rounded-lg text-sm font-medium hover:bg-olive-700">Retry</button>
            </div>
          </div>
        )}
        {!loading && !error && recipes.length > 0 && (
          <div className="space-y-4">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} onRate={(rating) => updateRecipe(recipe.id, { rating })} onToggleFavorite={() => updateRecipe(recipe.id, { isFavorite: !recipe.isFavorite })} />
            ))}
          </div>
        )}
        <button onClick={handleNewSearch} className="w-full py-3.5 bg-olive-600 text-white rounded-xl font-semibold text-sm hover:bg-olive-700 transition-colors">Start New Search</button>
      </div>
    </div>
  );
}
