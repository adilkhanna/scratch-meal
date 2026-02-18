'use client';

import { useState, useMemo } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Recipe, RecipeFilter } from '@/types';
import RecipeCard from '@/components/recipes/RecipeCard';
import { HiSearch, HiHeart, HiStar, HiTrash } from 'react-icons/hi';
import clsx from 'clsx';
import { format } from 'date-fns';

export default function HistoryPage() {
  const { value: history, setValue: setHistory, isLoaded } = useLocalStorage<Recipe[]>(
    'smm-history',
    []
  );
  const [filters, setFilters] = useState<RecipeFilter>({
    favoritesOnly: false,
    minRating: 0,
    searchQuery: '',
  });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filteredRecipes = useMemo(() => {
    return history.filter((r) => {
      if (filters.favoritesOnly && !r.isFavorite) return false;
      if (filters.minRating > 0 && r.rating < filters.minRating) return false;
      if (
        filters.searchQuery &&
        !r.name.toLowerCase().includes(filters.searchQuery.toLowerCase()) &&
        !r.searchedIngredients.some((i) =>
          i.toLowerCase().includes(filters.searchQuery.toLowerCase())
        )
      )
        return false;
      return true;
    });
  }, [history, filters]);

  const updateRecipe = (id: string, updates: Partial<Recipe>) => {
    setHistory((prev: Recipe[]) =>
      prev.map((r: Recipe) => (r.id === id ? { ...r, ...updates } : r))
    );
  };

  const deleteRecipe = (id: string) => {
    setHistory((prev: Recipe[]) => prev.filter((r: Recipe) => r.id !== id));
    setDeleteConfirm(null);
  };

  // Group recipes by date
  const groupedRecipes = useMemo(() => {
    const groups: { date: string; recipes: Recipe[] }[] = [];
    const dateMap = new Map<string, Recipe[]>();

    filteredRecipes.forEach((r) => {
      const dateKey = format(new Date(r.createdAt), 'MMM d, yyyy');
      if (!dateMap.has(dateKey)) dateMap.set(dateKey, []);
      dateMap.get(dateKey)!.push(r);
    });

    dateMap.forEach((recipes, date) => {
      groups.push({ date, recipes });
    });

    return groups;
  }, [filteredRecipes]);

  if (!isLoaded) return null;

  return (
    <div className="animate-fade-in py-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 mb-1">My Past Recipes</h1>
          <p className="text-stone-500 text-sm">
            {history.length === 0
              ? 'No recipes yet. Start a new search to get cooking!'
              : `${history.length} recipes saved`}
          </p>
        </div>

        {history.length > 0 && (
          <>
            {/* Search */}
            <div className="relative">
              <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                value={filters.searchQuery}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, searchQuery: e.target.value }))
                }
                placeholder="Search recipes or ingredients..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 bg-white text-sm
                           placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() =>
                  setFilters((f) => ({ ...f, favoritesOnly: !f.favoritesOnly }))
                }
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                  filters.favoritesOnly
                    ? 'bg-red-50 border-red-200 text-red-600'
                    : 'border-stone-200 text-stone-500 hover:bg-stone-50'
                )}
              >
                <HiHeart className="w-3.5 h-3.5" />
                Favorites
              </button>
              {[3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  onClick={() =>
                    setFilters((f) => ({
                      ...f,
                      minRating: f.minRating === rating ? 0 : rating,
                    }))
                  }
                  className={clsx(
                    'flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                    filters.minRating === rating
                      ? 'bg-amber-50 border-amber-200 text-amber-600'
                      : 'border-stone-200 text-stone-500 hover:bg-stone-50'
                  )}
                >
                  <HiStar className="w-3.5 h-3.5" />
                  {rating}+
                </button>
              ))}
            </div>

            {/* Recipe list */}
            {groupedRecipes.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-stone-400 text-sm">No recipes match your filters.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {groupedRecipes.map((group) => (
                  <div key={group.date}>
                    <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">
                      {group.date}
                    </h3>
                    <div className="space-y-3">
                      {group.recipes.map((recipe) => (
                        <div key={recipe.id} className="relative group">
                          <RecipeCard
                            recipe={recipe}
                            onRate={(rating) => updateRecipe(recipe.id, { rating })}
                            onToggleFavorite={() =>
                              updateRecipe(recipe.id, { isFavorite: !recipe.isFavorite })
                            }
                          />
                          {/* Delete button */}
                          <div className="absolute top-3 right-14">
                            {deleteConfirm === recipe.id ? (
                              <div className="flex items-center gap-1 bg-white border border-red-200 rounded-lg p-1 shadow-lg animate-fade-in">
                                <button
                                  onClick={() => deleteRecipe(recipe.id)}
                                  className="text-xs text-red-600 font-medium px-2 py-1 hover:bg-red-50 rounded"
                                >
                                  Delete
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm(null)}
                                  className="text-xs text-stone-400 px-2 py-1 hover:bg-stone-50 rounded"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirm(recipe.id)}
                                className="p-1.5 text-stone-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                              >
                                <HiTrash className="w-4 h-4" />
                              </button>
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
            <p className="text-stone-500 text-sm mb-4">Your recipe history will appear here.</p>
            <a
              href="/"
              className="inline-block px-6 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors"
            >
              Start Cooking
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
