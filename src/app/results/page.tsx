'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useRecipeFlow } from '@/context/RecipeFlowContext';
import { useToast } from '@/context/ToastContext';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { generateRecipes as generateRecipesAI } from '@/lib/openai-client';
import StepIndicator from '@/components/layout/StepIndicator';
import RecipeCard from '@/components/recipes/RecipeCard';
import { Recipe } from '@/types';
import { DIETARY_CONDITIONS } from '@/config/dietary-conditions';

export default function ResultsPage() {
  const router = useRouter();
  const { ingredients, dietaryConditions, timeRange, resetFlow } = useRecipeFlow();
  const { addToast } = useToast();
  const { value: apiKey, isLoaded: apiKeyLoaded } = useLocalStorage<string>('smm-api-key', '');
  const { value: history, setValue: setHistory } = useLocalStorage<Recipe[]>('smm-history', []);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  const conditionLabels = dietaryConditions.map(
    (id) => DIETARY_CONDITIONS.find((c) => c.id === id)?.label ?? id
  );

  const generateRecipes = useCallback(async () => {
    // Read directly from localStorage to avoid stale closure
    const currentKey = apiKey || (() => {
      try { return JSON.parse(window.localStorage.getItem('smm-api-key') || '""'); }
      catch { return ''; }
    })();

    if (!currentKey) {
      setError('Please set your OpenAI API key in Settings.');
      setLoading(false);
      return;
    }

    try {
      const rawRecipes = await generateRecipesAI(
        ingredients,
        conditionLabels,
        timeRange!,
        currentKey
      );

      const recipesWithMeta: Recipe[] = (rawRecipes || []).map(
        (r: Omit<Recipe, 'id' | 'rating' | 'isFavorite' | 'createdAt' | 'searchedIngredients' | 'dietaryConditions' | 'requestedTimeRange'>) => ({
          ...r,
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          rating: 0,
          isFavorite: false,
          createdAt: new Date().toISOString(),
          searchedIngredients: ingredients,
          dietaryConditions: conditionLabels,
          requestedTimeRange: timeRange,
        })
      );

      setRecipes(recipesWithMeta);
      // Auto-save to history
      setHistory((prev: Recipe[]) => [...recipesWithMeta, ...prev]);
      addToast('Recipes generated and saved to history!', 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate recipes');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, ingredients, timeRange]);

  useEffect(() => {
    if (ingredients.length === 0 || !timeRange) {
      router.replace('/');
      return;
    }
    // Wait for localStorage to load before fetching
    if (!apiKeyLoaded) return;
    if (!hasFetched) {
      setHasFetched(true);
      generateRecipes();
    }
  }, [ingredients.length, timeRange, router, hasFetched, generateRecipes, apiKeyLoaded]);

  const updateRecipe = (id: string, updates: Partial<Recipe>) => {
    setRecipes((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
    setHistory((prev: Recipe[]) =>
      prev.map((r: Recipe) => (r.id === id ? { ...r, ...updates } : r))
    );
  };

  const handleNewSearch = () => {
    resetFlow();
    router.push('/');
  };

  if (ingredients.length === 0 || !timeRange) return null;

  return (
    <div className="animate-fade-in">
      <StepIndicator currentStep={4} />

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 mb-1">Your Recipes</h1>
          <p className="text-stone-500 text-sm">
            {loading
              ? 'Cooking up some ideas...'
              : `${recipes.length} recipes from ${ingredients.length} ingredients`}
          </p>
        </div>

        {loading && (
          <div className="flex flex-col items-center py-16 gap-4">
            <div className="text-5xl animate-pulse-soft">🍳</div>
            <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full" style={{ animation: 'spin 1s linear infinite' }} />
            <p className="text-sm text-stone-500">Generating recipes with AI...</p>
            <p className="text-xs text-stone-400">This may take 10-15 seconds</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-6 text-center">
            <p className="text-red-600 font-medium text-sm">{error}</p>
            <div className="flex gap-3 justify-center mt-4">
              <button
                onClick={() => router.push('/settings')}
                className="px-4 py-2 bg-white border border-stone-200 rounded-lg text-sm font-medium text-stone-600 hover:bg-stone-50"
              >
                Go to Settings
              </button>
              <button
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  setHasFetched(false);
                }}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {!loading && !error && recipes.length > 0 && (
          <div className="space-y-4">
            {recipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onRate={(rating) => updateRecipe(recipe.id, { rating })}
                onToggleFavorite={() =>
                  updateRecipe(recipe.id, { isFavorite: !recipe.isFavorite })
                }
              />
            ))}
          </div>
        )}

        <button
          onClick={handleNewSearch}
          className="w-full py-3.5 bg-orange-500 text-white rounded-xl font-semibold text-sm
                     hover:bg-orange-600 transition-colors shadow-sm"
        >
          Start New Search
        </button>
      </div>
    </div>
  );
}
