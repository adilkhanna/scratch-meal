'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useRecipeFlow } from '@/context/RecipeFlowContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { generateRecipes as generateRecipesAI } from '@/lib/firebase-functions';
import { saveRecipes, updateRecipeInFirestore } from '@/lib/recipe-storage';
import StepIndicator from '@/components/layout/StepIndicator';
import RecipeCard from '@/components/recipes/RecipeCard';
import { Recipe } from '@/types';
import { DIETARY_CONDITIONS } from '@/config/dietary-conditions';

export default function ResultsPage() {
  const router = useRouter();
  const { ingredients, dietaryConditions, timeRange, resetFlow } = useRecipeFlow();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  const conditionLabels = dietaryConditions.map((id) => DIETARY_CONDITIONS.find((c) => c.id === id)?.label ?? id);

  const generateRecipes = useCallback(async () => {
    try {
      // Merge pantry basics with user-entered ingredients
      let allIngredients = [...ingredients];
      if (user?.uid) {
        try {
          const userSnap = await getDoc(doc(db, 'users', user.uid));
          const pantryBasics: string[] = userSnap.data()?.pantryBasics || [];
          const lowerSet = new Set(allIngredients.map((i) => i.toLowerCase()));
          pantryBasics.forEach((b) => {
            if (!lowerSet.has(b.toLowerCase())) {
              allIngredients.push(b.toLowerCase());
            }
          });
        } catch {
          // Pantry fetch failed — continue with user ingredients only
        }
      }

      const rawRecipes = await generateRecipesAI(allIngredients, conditionLabels, timeRange!);
      const recipesWithMeta: Recipe[] = (rawRecipes || []).map(
        (r: Omit<Recipe, 'id' | 'rating' | 'isFavorite' | 'createdAt' | 'searchedIngredients' | 'dietaryConditions' | 'requestedTimeRange'>) => ({
          ...r, id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, rating: 0, isFavorite: false,
          createdAt: new Date().toISOString(), searchedIngredients: ingredients, dietaryConditions: conditionLabels, requestedTimeRange: timeRange,
        })
      );
      setRecipes(recipesWithMeta);

      // Save to Firestore
      if (user?.uid) {
        try {
          await saveRecipes(user.uid, recipesWithMeta);
        } catch (err) {
          console.error('Failed to save recipes to Firestore:', err);
        }
      }

      addToast('Recipes generated and saved!', 'success');
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to generate recipes'); }
    finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ingredients, timeRange, user?.uid]);

  useEffect(() => {
    if (ingredients.length === 0 || !timeRange) { router.replace('/'); return; }
    if (!hasFetched) { setHasFetched(true); generateRecipes(); }
  }, [ingredients.length, timeRange, router, hasFetched, generateRecipes]);

  const updateRecipe = (id: string, updates: Partial<Recipe>) => {
    setRecipes((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
    // Update in Firestore
    if (user?.uid) {
      updateRecipeInFirestore(user.uid, id, updates).catch(console.error);
    }
  };

  const handleNewSearch = () => { resetFlow(); router.push('/'); };

  if (ingredients.length === 0 || !timeRange) return null;

  return (
    <div className="animate-fade-in">
      <StepIndicator currentStep={4} />
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-[family-name:var(--font-display)] text-neutral-900 mb-2">Your Recipes</h1>
          <p className="text-neutral-500 text-sm font-light">{loading ? 'Cooking up some ideas...' : `${recipes.length} recipes from ${ingredients.length} ingredients`}</p>
        </div>
        {loading && (
          <div className="flex flex-col items-center py-16 gap-4">
            <div className="text-5xl animate-pulse-soft">🍳</div>
            <div className="w-8 h-8 border-3 border-[#0059FF] border-t-transparent rounded-full" style={{ animation: 'spin 1s linear infinite' }} />
            <p className="text-sm text-neutral-500 font-light">Generating recipes with AI...</p>
            <p className="text-xs text-neutral-400">This may take 10-15 seconds</p>
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center">
            <p className="text-red-600 font-medium text-sm">{error}</p>
            <div className="flex gap-3 justify-center mt-4">
              <button onClick={handleNewSearch} className="px-6 py-2.5 bg-white border border-neutral-200 rounded-full text-xs font-medium uppercase tracking-wider text-neutral-500 hover:bg-neutral-50">Start Over</button>
              <button onClick={() => { setError(null); setLoading(true); setHasFetched(false); }} className="px-6 py-2.5 bg-[#0059FF] text-white rounded-full text-xs font-medium uppercase tracking-wider hover:bg-[#0047CC]">Retry</button>
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
        <button onClick={handleNewSearch} className="w-full py-4 bg-[#0059FF] text-white rounded-full font-medium text-xs uppercase tracking-widest hover:bg-[#0047CC] transition-colors">Start New Search</button>
      </div>
    </div>
  );
}
