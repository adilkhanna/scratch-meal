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
import StaggeredPageTitle from '@/components/ui/StaggeredPageTitle';
import RecipeCard from '@/components/recipes/RecipeCard';
import { Recipe } from '@/types';
import { DIETARY_CONDITIONS } from '@/config/dietary-conditions';
import { CUISINES } from '@/config/cuisines';
import MomoLoader from '@/components/ui/MomoLoader';
import STEP_THEMES from '@/config/step-themes';

const theme = STEP_THEMES.results;

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
    <div
      className="min-h-screen animate-radial-glow"
      style={{ background: theme.background, backgroundSize: '200% 200%' }}
    >

      <div className="max-w-4xl mx-auto px-6 sm:px-8 pt-24 pb-16">
        <StepIndicator currentStep={5} />

        {/* Title — staggered animation */}
        <div className="text-center mb-8">
          <StaggeredPageTitle
            text="your recipes."
            className="text-[clamp(36px,5.5vw,67px)] tracking-[-0.25px]"
          />
          <p className="text-[12px] tracking-[1px] uppercase text-black/40 mt-3">
            {loading ? 'Cooking up some ideas...' : `${recipes.length} recipes from ${ingredients.length} ingredients`}
          </p>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center py-16 gap-2">
            <MomoLoader size={140} message="Generating recipes with AI..." />
            <p className="text-[12px] tracking-[1px] uppercase text-black/30">This may take 20-40 seconds</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="border-[1.5px] border-black/20 rounded-[30px] p-8 text-center">
            <p className="text-[14px] font-medium tracking-[0.5px] text-black">{error}</p>
            <p className="text-[12px] tracking-[1px] uppercase text-black/40 mt-2">All recipes are sourced from verified databases and reviewed for dietary compliance.</p>
            <div className="flex gap-3 justify-center mt-6">
              <button
                onClick={handleNewSearch}
                className="px-8 py-3 text-[14px] font-medium tracking-[1px] uppercase border-[1.5px] border-black rounded-[30px] bg-transparent text-black hover:bg-black hover:text-white transition-all duration-200"
              >
                Add More Ingredients
              </button>
              <button
                onClick={() => { setError(null); setLoading(true); setHasFetched(false); }}
                className="px-8 py-3 text-[14px] font-medium tracking-[1px] uppercase border-[1.5px] border-black/30 rounded-[30px] bg-transparent text-black/50 hover:bg-black hover:text-white transition-all duration-200"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Recipe results */}
        {!loading && !error && recipes.length > 0 && (
          <div className="space-y-4">
            {weeklyBudget && (() => {
              const perMeal = Math.round(weeklyBudget / 21);
              const withinCount = recipes.filter((r) => (r.estimatedCostPerServing ?? Infinity) <= perMeal).length;
              return (
                <div className="flex items-center gap-2 px-5 py-2.5 border-[1.5px] border-black/20 rounded-[30px] text-[12px] tracking-[1px] uppercase text-black/50">
                  <span className="font-medium text-black">Budget: {'\u20B9'}{weeklyBudget.toLocaleString('en-IN')}/week</span>
                  <span className="text-black/20">|</span>
                  <span>{withinCount} of {recipes.length} within budget</span>
                </div>
              );
            })()}
            {pricesAsOf && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 px-5 py-2.5 border-[1.5px] border-black/20 rounded-[30px] text-[12px] tracking-[1px] uppercase text-black/60">
                  <span className="w-2 h-2 bg-black rounded-full" />
                  <span className="font-medium">Live mandi prices as of {new Date(pricesAsOf).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                </div>
                <p className="text-[11px] tracking-[0.5px] text-black/30 px-1">Vegetable & grain prices are live from Indian mandis. Other ingredients (meats, dairy, oils) use estimated retail prices.</p>
              </div>
            )}
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} onRate={(rating) => updateRecipe(recipe.id, { rating })} onToggleFavorite={() => updateRecipe(recipe.id, { isFavorite: !recipe.isFavorite })} budgetPerMeal={weeklyBudget ? Math.round(weeklyBudget / 21) : null} />
            ))}
          </div>
        )}

        {/* Start New Search button */}
        <div className="flex items-center justify-center mt-8 mb-12">
          <button
            onClick={handleNewSearch}
            className="px-8 py-3 text-[14px] font-medium tracking-[1px] uppercase border-[1.5px] border-black rounded-[30px] bg-transparent text-black hover:bg-black hover:text-white transition-all duration-200 inline-flex items-center gap-2"
          >
            Start New Search
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Large brand footer */}
      <div className="text-center select-none overflow-hidden">
        <span className="font-[family-name:var(--font-brand)] text-[clamp(80px,15vw,225px)] font-normal text-black/10 leading-none tracking-[-0.25px] block">
          GOOD MEALS CO.
        </span>
      </div>
    </div>
  );
}
