'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { loadRecipes, updateRecipeInFirestore, deleteRecipeFromFirestore, migrateFromLocalStorage } from '@/lib/recipe-storage';
import { Recipe, RecipeFilter } from '@/types';
import RecipeCard from '@/components/recipes/RecipeCard';
import { HiSearch, HiHeart, HiStar, HiTrash } from 'react-icons/hi';
import clsx from 'clsx';
import { format } from 'date-fns';

export default function HistoryPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [history, setHistory] = useState<Recipe[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [filters, setFilters] = useState<RecipeFilter>({ favoritesOnly: false, minRating: 0, searchQuery: '' });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchRecipes = useCallback(async () => {
    if (!user?.uid) return;
    try {
      // Migrate localStorage data if any exists
      const migrated = await migrateFromLocalStorage(user.uid);
      if (migrated > 0) {
        addToast(`Migrated ${migrated} recipes to cloud storage!`, 'success');
      }

      const recipes = await loadRecipes(user.uid);
      setHistory(recipes);
    } catch (err) {
      console.error('Failed to load recipes:', err);
    } finally {
      setIsLoaded(true);
    }
  }, [user?.uid, addToast]);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  const filteredRecipes = useMemo(() => {
    return history.filter((r) => {
      if (filters.favoritesOnly && !r.isFavorite) return false;
      if (filters.minRating > 0 && r.rating < filters.minRating) return false;
      if (filters.searchQuery && !r.name.toLowerCase().includes(filters.searchQuery.toLowerCase()) && !r.searchedIngredients.some((i) => i.toLowerCase().includes(filters.searchQuery.toLowerCase()))) return false;
      return true;
    });
  }, [history, filters]);

  const updateRecipe = (id: string, updates: Partial<Recipe>) => {
    setHistory((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
    if (user?.uid) {
      updateRecipeInFirestore(user.uid, id, updates).catch(console.error);
    }
  };

  const deleteRecipe = (id: string) => {
    setHistory((prev) => prev.filter((r) => r.id !== id));
    setDeleteConfirm(null);
    if (user?.uid) {
      deleteRecipeFromFirestore(user.uid, id).catch(console.error);
    }
  };

  const groupedRecipes = useMemo(() => {
    const groups: { date: string; recipes: Recipe[] }[] = [];
    const dateMap = new Map<string, Recipe[]>();
    filteredRecipes.forEach((r) => { const dateKey = format(new Date(r.createdAt), 'MMM d, yyyy'); if (!dateMap.has(dateKey)) dateMap.set(dateKey, []); dateMap.get(dateKey)!.push(r); });
    dateMap.forEach((recipes, date) => { groups.push({ date, recipes }); });
    return groups;
  }, [filteredRecipes]);

  if (!isLoaded) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="text-4xl animate-pulse-soft">📖</div>
        <p className="text-sm text-neutral-400 font-light">Loading recipes...</p>
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in py-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-[family-name:var(--font-display)] text-neutral-900 mb-2">My Past Recipes</h1>
          <p className="text-neutral-500 text-sm font-light">{history.length === 0 ? 'No recipes yet. Start a new search to get cooking!' : `${history.length} recipes saved`}</p>
        </div>
        {history.length > 0 && (
          <>
            <div className="relative">
              <HiSearch className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input type="text" value={filters.searchQuery} onChange={(e) => setFilters((f) => ({ ...f, searchQuery: e.target.value }))} placeholder="Search recipes or ingredients..."
                className="w-full pl-12 pr-6 py-3 rounded-full border border-neutral-200 bg-white text-sm font-light text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10" />
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setFilters((f) => ({ ...f, favoritesOnly: !f.favoritesOnly }))}
                className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium uppercase tracking-wider border transition-colors', filters.favoritesOnly ? 'bg-red-50 border-red-200 text-red-600' : 'border-neutral-200 text-neutral-400 hover:bg-neutral-50')}>
                <HiHeart className="w-3.5 h-3.5" />Favorites
              </button>
              {[3, 4, 5].map((rating) => (
                <button key={rating} onClick={() => setFilters((f) => ({ ...f, minRating: f.minRating === rating ? 0 : rating }))}
                  className={clsx('flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium uppercase tracking-wider border transition-colors', filters.minRating === rating ? 'bg-amber-50 border-amber-200 text-amber-600' : 'border-neutral-200 text-neutral-400 hover:bg-neutral-50')}>
                  <HiStar className="w-3.5 h-3.5" />{rating}+
                </button>
              ))}
            </div>
            {groupedRecipes.length === 0 ? (
              <div className="text-center py-12"><p className="text-neutral-400 text-sm font-light">No recipes match your filters.</p></div>
            ) : (
              <div className="space-y-6">
                {groupedRecipes.map((group) => (
                  <div key={group.date}>
                    <h3 className="text-xs font-medium text-neutral-400 uppercase tracking-widest mb-3">{group.date}</h3>
                    <div className="space-y-3">
                      {group.recipes.map((recipe) => (
                        <div key={recipe.id} className="relative group">
                          <RecipeCard recipe={recipe} onRate={(rating) => updateRecipe(recipe.id, { rating })} onToggleFavorite={() => updateRecipe(recipe.id, { isFavorite: !recipe.isFavorite })} />
                          <div className="absolute top-3 right-14">
                            {deleteConfirm === recipe.id ? (
                              <div className="flex items-center gap-1 bg-white border border-red-200 rounded-lg p-1 shadow-lg animate-fade-in">
                                <button onClick={() => deleteRecipe(recipe.id)} className="text-xs text-red-600 font-medium px-2 py-1 hover:bg-red-50 rounded">Delete</button>
                                <button onClick={() => setDeleteConfirm(null)} className="text-xs text-neutral-400 px-2 py-1 hover:bg-neutral-50 rounded">Cancel</button>
                              </div>
                            ) : (
                              <button onClick={() => setDeleteConfirm(recipe.id)} className="p-1.5 text-neutral-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><HiTrash className="w-4 h-4" /></button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        {history.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📖</div>
            <p className="text-neutral-500 text-sm font-light mb-4">Your recipe history will appear here.</p>
            <a href="/" className="inline-block px-8 py-3 bg-neutral-900 text-white rounded-full text-xs font-medium uppercase tracking-widest hover:bg-neutral-700 transition-colors">Start Cooking</a>
          </div>
        )}
      </div>
    </div>
  );
}
