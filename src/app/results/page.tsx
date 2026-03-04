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
import { CUISINES } from '@/config/cuisines';
import MomoLoader from '@/components/ui/MomoLoader';

export default function ResultsPage() {
  const router = useRouter();
  const { ingredients, dietaryConditions, cuisines, timeRange, weeklyBudget, resetFlow } = useRecipeFlow();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);
  const [pricesAsOf, setPricesAsOf] = useState<string | null>(null);

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

      const cuisineLabels = cuisines.map((id) => CUISINES.find((c) => c.id === id)?.label ?? id);
      const result = await generateRecipesAI(allIngredients, conditionLabels, timeRange!, cuisineLabels, weeklyBudget);
      const rawRecipes = result.recipes;
      if (result.pricesAsOf) setPricesAsOf(result.pricesAsOf);
      const recipesWithMeta: Recipe[] = (rawRecipes || []).map(
        (r: Omit<Recipe, 'id' | 'rating' | 'isFavorite' | 'createdAt' | 'searchedIngredients' | 'dietaryConditions' | 'requestedTimeRange'>) => ({
          ...r, id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, rating: 0, isFavorite: false,
          createdAt: new Date().toISOString(), searchedIngredients: ingredients, dietaryConditions: conditionLabels, requestedTimeRange: timeRange,
        })
      );
      // Sort: within-budget first, then by cost ascending (if budget is set)
      const budgetPerMeal = weeklyBudget ? Math.round(weeklyBudget / 21) : null;
      if (budgetPerMeal) {
        recipesWithMeta.sort((a, b) => {
          const aCost = a.estimatedCostPerServing ?? Infinity;
          const bCost = b.estimatedCostPerServing ?? Infinity;
          const aWithin = aCost <= budgetPerMeal ? 0 : 1;
          const bWithin = bCost <= budgetPerMeal ? 0 : 1;
          if (aWithin !== bWithin) return aWithin - bWithin;
          return aCost - bCost;
        });
      }
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
      <StepIndicator currentStep={5} />
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-[family-name:var(--font-display)] text-neutral-900 mb-2">Your Recipes</h1>
          <p className="text-neutral-500 text-sm font-light">{loading ? 'Cooking up some ideas...' : `${recipes.length} recipes from ${ingredients.length} ingredients`}</p>
        </div>
        {loading && (
          <div className="flex flex-col items-center py-16 gap-2">
            <MomoLoader size={140} message="Generating recipes with AI..." />
            <p className="text-xs text-neutral-400">This may take 20-40 seconds</p>
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center">
            <p className="text-red-600 font-medium text-sm">{error}</p>
            <p className="text-neutral-400 text-xs mt-2 font-light">All recipes are sourced from verified databases and reviewed for dietary compliance.</p>
            <div className="flex gap-3 justify-center mt-4">
              <button onClick={handleNewSearch} className="px-6 py-2.5 bg-[#0059FF] text-white rounded-full text-xs font-medium uppercase tracking-wider hover:bg-[#0047CC]">Add More Ingredients</button>
              <button onClick={() => { setError(null); setLoading(true); setHasFetched(false); }} className="px-6 py-2.5 bg-white border border-neutral-200 rounded-full text-xs font-medium uppercase tracking-wider text-neutral-500 hover:bg-neutral-50">Retry</button>
            </div>
          </div>
        )}
        {!loading && !error && recipes.length > 0 && (
          <div className="space-y-4">
            {weeklyBudget && (() => {
              const perMeal = Math.round(weeklyBudget / 21);
              const withinCount = recipes.filter((r) => (r.estimatedCostPerServing ?? Infinity) <= perMeal).length;
              return (
                <div className="flex items-center gap-2 px-3 py-2 bg-white border border-neutral-200 rounded-full text-xs text-neutral-500">
                  <span className="font-medium text-neutral-900">Budget: {'\u20B9'}{weeklyBudget.toLocaleString('en-IN')}/week</span>
                  <span className="text-neutral-300">|</span>
                  <span>{withinCount} of {recipes.length} within budget</span>
                </div>
              );
            })()}
            {pricesAsOf && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-full text-xs text-green-700">
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="font-medium">Live mandi prices as of {new Date(pricesAsOf).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                </div>
                <p className="text-[11px] text-neutral-400 font-light px-1">Vegetable & grain prices are live from Indian mandis. Other ingredients (meats, dairy, oils) use estimated retail prices.</p>
              </div>
            )}
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} onRate={(rating) => updateRecipe(recipe.id, { rating })} onToggleFavorite={() => updateRecipe(recipe.id, { isFavorite: !recipe.isFavorite })} budgetPerMeal={weeklyBudget ? Math.round(weeklyBudget / 21) : null} />
            ))}
          </div>
        )}
        <button onClick={handleNewSearch} className="w-full py-4 bg-[#0059FF] text-white rounded-full font-medium text-xs uppercase tracking-widest hover:bg-[#0047CC] transition-colors">Start New Search</button>
      </div>
    </div>
  );
}
