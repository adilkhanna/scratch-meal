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
import MomoLoader from '@/components/ui/MomoLoader';
import STEP_THEMES from '@/config/step-themes';
import StaggeredPageTitle from '@/components/ui/StaggeredPageTitle';

const theme = STEP_THEMES.general;

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
    <div
      className="min-h-screen animate-radial-glow flex items-center justify-center"
      style={{ background: theme.background, backgroundSize: '200% 200%' }}
    >
      <MomoLoader message="Loading recipes..." />
    </div>
  );

  return (
    <div
      className="min-h-screen animate-radial-glow"
      style={{ background: theme.background, backgroundSize: '200% 200%' }}
    >
      <div className="max-w-4xl mx-auto px-6 sm:px-8 pt-24 pb-16">
        <div className="space-y-6">
          <div>
            <StaggeredPageTitle
              text="my recipes."
              className="text-[clamp(36px,5.5vw,67px)] tracking-[-0.25px]"
            />
            <p className="text-center text-[12px] tracking-[1px] uppercase text-neutral-500 mt-3">
              {history.length === 0 ? 'No recipes yet. Start a new search to get cooking!' : `${history.length} recipes saved`}
            </p>
          </div>
          {history.length > 0 && (
            <>
              <div className="relative">
                <HiSearch className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input type="text" value={filters.searchQuery} onChange={(e) => setFilters((f) => ({ ...f, searchQuery: e.target.value }))} placeholder="Search recipes or ingredients..."
                  className="w-full pl-12 pr-6 py-3 rounded-[30px] border-[1.5px] border-black/20 bg-white/60 text-sm font-light text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-black/40" />
              </div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setFilters((f) => ({ ...f, favoritesOnly: !f.favoritesOnly }))}
                  className={clsx(
                    'flex items-center gap-1.5 px-4 py-2 rounded-[30px] text-[12px] font-medium uppercase tracking-[1px] border-[1.5px] transition-colors',
                    filters.favoritesOnly
                      ? 'bg-red-50 border-red-300 text-red-600'
                      : 'border-black/20 text-black/60 bg-transparent hover:bg-black hover:text-white hover:border-black'
                  )}>
                  <HiHeart className="w-3.5 h-3.5" />Favorites
                </button>
                {[3, 4, 5].map((rating) => (
                  <button key={rating} onClick={() => setFilters((f) => ({ ...f, minRating: f.minRating === rating ? 0 : rating }))}
                    className={clsx(
                      'flex items-center gap-1 px-4 py-2 rounded-[30px] text-[12px] font-medium uppercase tracking-[1px] border-[1.5px] transition-colors',
                      filters.minRating === rating
                        ? 'bg-amber-50 border-amber-300 text-amber-600'
                        : 'border-black/20 text-black/60 bg-transparent hover:bg-black hover:text-white hover:border-black'
                    )}>
                    <HiStar className="w-3.5 h-3.5" />{rating}+
                  </button>
                ))}
              </div>
              {groupedRecipes.length === 0 ? (
                <div className="text-center py-12"><p className="text-neutral-400 text-[12px] tracking-[1px] uppercase">No recipes match your filters.</p></div>
              ) : (
                <div className="space-y-8">
                  {groupedRecipes.map((group) => (
                    <div key={group.date}>
                      <h3 className="text-[12px] font-medium text-black/40 uppercase tracking-[1px] mb-3">{group.date}</h3>
                      <div className="space-y-3">
                        {group.recipes.map((recipe) => (
                          <div key={recipe.id} className="relative group">
                            <RecipeCard recipe={recipe} onRate={(rating) => updateRecipe(recipe.id, { rating })} onToggleFavorite={() => updateRecipe(recipe.id, { isFavorite: !recipe.isFavorite })} />
                            <div className="absolute top-3 right-14">
                              {deleteConfirm === recipe.id ? (
                                <div className="flex items-center gap-1 bg-white border-[1.5px] border-red-300 rounded-[20px] p-1 shadow-lg animate-fade-in">
                                  <button onClick={() => deleteRecipe(recipe.id)} className="text-[12px] tracking-[1px] uppercase text-red-600 font-medium px-2 py-1 hover:bg-red-50 rounded-[12px]">Delete</button>
                                  <button onClick={() => setDeleteConfirm(null)} className="text-[12px] tracking-[1px] uppercase text-neutral-400 px-2 py-1 hover:bg-neutral-50 rounded-[12px]">Cancel</button>
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
              <p className="text-neutral-500 text-[12px] tracking-[1px] uppercase mb-6">Your recipe history will appear here.</p>
              <a href="/" className="inline-block px-8 py-3 border-[1.5px] border-black rounded-[30px] bg-transparent text-black text-[14px] font-medium tracking-[1px] uppercase hover:bg-black hover:text-white transition-colors">Start Cooking</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
