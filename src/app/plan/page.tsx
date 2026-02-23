'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { loadRecipes } from '@/lib/recipe-storage';
import { loadMealPlan, saveMealPlan, getWeekId, getWeekDates } from '@/lib/meal-plan-storage';
import { Recipe, MealPlan, DayOfWeek } from '@/types';
import { HiChevronLeft, HiChevronRight, HiPlus, HiX, HiClock, HiOutlineShare } from 'react-icons/hi';
import { format } from 'date-fns';

const DAYS: { key: DayOfWeek; label: string; short: string }[] = [
  { key: 'mon', label: 'Monday', short: 'Mon' },
  { key: 'tue', label: 'Tuesday', short: 'Tue' },
  { key: 'wed', label: 'Wednesday', short: 'Wed' },
  { key: 'thu', label: 'Thursday', short: 'Thu' },
  { key: 'fri', label: 'Friday', short: 'Fri' },
  { key: 'sat', label: 'Saturday', short: 'Sat' },
  { key: 'sun', label: 'Sunday', short: 'Sun' },
];

export default function MealPlanPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [currentWeekId, setCurrentWeekId] = useState(() => getWeekId(new Date()));
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickerDay, setPickerDay] = useState<DayOfWeek | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [showGroceryList, setShowGroceryList] = useState(false);

  const weekDates = useMemo(() => getWeekDates(currentWeekId), [currentWeekId]);
  const weekLabel = `${format(weekDates.start, 'MMM d')} – ${format(weekDates.end, 'MMM d, yyyy')}`;
  const isCurrentWeek = currentWeekId === getWeekId(new Date());

  const fetchData = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const [mealPlan, recipes] = await Promise.all([
        loadMealPlan(user.uid, currentWeekId),
        allRecipes.length > 0 ? Promise.resolve(allRecipes) : loadRecipes(user.uid),
      ]);
      setPlan(mealPlan);
      if (allRecipes.length === 0) setAllRecipes(recipes);
    } catch (err) {
      console.error('Failed to load meal plan:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.uid, currentWeekId, allRecipes]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const recipeMap = useMemo(() => {
    const map = new Map<string, Recipe>();
    allRecipes.forEach((r) => map.set(r.id, r));
    return map;
  }, [allRecipes]);

  const navigateWeek = (dir: -1 | 1) => {
    const d = new Date(weekDates.start);
    d.setDate(d.getDate() + dir * 7);
    setCurrentWeekId(getWeekId(d));
  };

  const addRecipeToDay = async (day: DayOfWeek, recipeId: string) => {
    if (!user?.uid || !plan) return;
    const updatedDays = { ...plan.days };
    if (!updatedDays[day].recipeIds.includes(recipeId)) {
      updatedDays[day] = { recipeIds: [...updatedDays[day].recipeIds, recipeId] };
    }
    const updatedPlan = { ...plan, days: updatedDays };
    setPlan(updatedPlan);
    setPickerDay(null);
    setPickerSearch('');
    try {
      await saveMealPlan(user.uid, updatedPlan);
      const recipe = recipeMap.get(recipeId);
      addToast(`Added "${recipe?.name || 'Recipe'}" to ${DAYS.find((d) => d.key === day)?.label}!`, 'success');
    } catch {
      addToast('Failed to update meal plan.', 'error');
    }
  };

  const removeRecipeFromDay = async (day: DayOfWeek, recipeId: string) => {
    if (!user?.uid || !plan) return;
    const updatedDays = { ...plan.days };
    updatedDays[day] = { recipeIds: updatedDays[day].recipeIds.filter((id) => id !== recipeId) };
    const updatedPlan = { ...plan, days: updatedDays };
    setPlan(updatedPlan);
    try {
      await saveMealPlan(user.uid, updatedPlan);
    } catch {
      addToast('Failed to update meal plan.', 'error');
    }
  };

  const filteredPickerRecipes = useMemo(() => {
    if (!pickerSearch) return allRecipes;
    const q = pickerSearch.toLowerCase();
    return allRecipes.filter((r) =>
      r.name.toLowerCase().includes(q) || r.keyIngredients.some((i) => i.toLowerCase().includes(q))
    );
  }, [allRecipes, pickerSearch]);

  // --- Grocery List ---
  const groceryItems = useMemo(() => {
    if (!plan) return [];
    const ingredientMap = new Map<string, { quantity: string; unit: string; count: number }>();

    for (const day of DAYS) {
      for (const recipeId of plan.days[day.key].recipeIds) {
        const recipe = recipeMap.get(recipeId);
        if (!recipe) continue;
        for (const ing of recipe.ingredients) {
          const key = ing.name.toLowerCase().trim();
          const existing = ingredientMap.get(key);
          if (existing) {
            existing.count++;
          } else {
            ingredientMap.set(key, { quantity: ing.quantity, unit: ing.unit || '', count: 1 });
          }
        }
      }
    }

    return Array.from(ingredientMap.entries()).map(([name, data]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      quantity: data.count > 1 ? `${data.quantity} x${data.count}` : data.quantity,
      unit: data.unit,
    }));
  }, [plan, recipeMap]);

  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const toggleCheck = (name: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const shareGroceryList = async () => {
    const lines: string[] = [];
    lines.push(`🛒 Grocery List — ${weekLabel}`);
    lines.push('━━━━━━━━━━━━━━━━');
    groceryItems.forEach((item) => {
      const qty = item.quantity ? `${item.quantity}${item.unit ? ` ${item.unit}` : ''}` : '';
      lines.push(`□ ${qty ? `${qty} ` : ''}${item.name}`);
    });
    lines.push('');
    lines.push('🔗 Made with Good Meals Co.');
    const text = lines.join('\n');

    try {
      if (navigator.share) {
        await navigator.share({ title: 'Grocery List', text });
      } else {
        await navigator.clipboard.writeText(text);
        addToast('Grocery list copied to clipboard!', 'success');
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(text);
          addToast('Grocery list copied to clipboard!', 'success');
        } catch {
          addToast('Failed to share grocery list.', 'error');
        }
      }
    }
  };

  const totalPlannedMeals = plan ? DAYS.reduce((sum, d) => sum + plan.days[d.key].recipeIds.length, 0) : 0;

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="text-4xl animate-pulse-soft">📅</div>
        <p className="text-sm text-neutral-400 font-light">Loading meal plan...</p>
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in py-6">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl sm:text-4xl font-[family-name:var(--font-display)] text-neutral-900 mb-2">Meal Plan</h1>
          <p className="text-neutral-500 text-sm font-light">
            {totalPlannedMeals === 0 ? 'Plan your week! Add recipes from your history to each day.' : `${totalPlannedMeals} meals planned this week`}
          </p>
        </div>

        {/* Week Navigation */}
        <div className="flex items-center justify-between">
          <button onClick={() => navigateWeek(-1)} className="p-2 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors">
            <HiChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <p className="text-sm font-medium text-neutral-900">{weekLabel}</p>
            {isCurrentWeek && <p className="text-xs text-neutral-400 font-light">This week</p>}
          </div>
          <button onClick={() => navigateWeek(1)} className="p-2 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors">
            <HiChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Day Grid */}
        <div className="space-y-3">
          {DAYS.map((day) => {
            const dayRecipes = plan?.days[day.key].recipeIds || [];
            return (
              <div key={day.key} className="border border-neutral-200 rounded-2xl bg-white p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-medium uppercase tracking-widest text-neutral-900">{day.label}</h3>
                  <button
                    onClick={() => setPickerDay(pickerDay === day.key ? null : day.key)}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs text-neutral-400 hover:text-neutral-900 hover:bg-neutral-50 rounded-full border border-neutral-200 transition-colors"
                  >
                    <HiPlus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>

                {dayRecipes.length === 0 ? (
                  <p className="text-xs text-neutral-300 font-light py-2">No meals planned</p>
                ) : (
                  <div className="space-y-2">
                    {dayRecipes.map((recipeId) => {
                      const recipe = recipeMap.get(recipeId);
                      if (!recipe) return null;
                      return (
                        <div key={recipeId} className="flex items-center justify-between gap-2 bg-neutral-50 rounded-xl px-3 py-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-neutral-900 truncate">{recipe.name}</p>
                            <p className="text-xs text-neutral-400 flex items-center gap-1">
                              <HiClock className="w-3 h-3" />{recipe.cookTime}
                            </p>
                          </div>
                          <button
                            onClick={() => removeRecipeFromDay(day.key, recipeId)}
                            className="p-1 text-neutral-300 hover:text-red-500 transition-colors shrink-0"
                          >
                            <HiX className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Recipe Picker for this day */}
                {pickerDay === day.key && (
                  <div className="mt-3 border-t border-neutral-100 pt-3 animate-fade-in">
                    <input
                      type="text"
                      value={pickerSearch}
                      onChange={(e) => setPickerSearch(e.target.value)}
                      placeholder="Search your recipes..."
                      className="w-full px-4 py-2 rounded-full border border-neutral-200 bg-white text-sm font-light text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 mb-2"
                    />
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {filteredPickerRecipes.length === 0 ? (
                        <p className="text-xs text-neutral-400 font-light py-2 text-center">
                          {allRecipes.length === 0 ? 'No recipes yet. Generate some first!' : 'No recipes match your search.'}
                        </p>
                      ) : (
                        filteredPickerRecipes.map((recipe) => (
                          <button
                            key={recipe.id}
                            onClick={() => addRecipeToDay(day.key, recipe.id)}
                            className="w-full flex items-center justify-between px-3 py-2 text-left rounded-xl hover:bg-neutral-50 transition-colors"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-neutral-900 truncate">{recipe.name}</p>
                              <p className="text-xs text-neutral-400">{recipe.cookTime} · {recipe.difficulty}</p>
                            </div>
                            <HiPlus className="w-4 h-4 text-neutral-400 shrink-0" />
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Grocery List Toggle */}
        {totalPlannedMeals > 0 && (
          <>
            <button
              onClick={() => { setShowGroceryList(!showGroceryList); setCheckedItems(new Set()); }}
              className="w-full py-4 bg-neutral-900 text-white rounded-full font-medium text-xs uppercase tracking-widest hover:bg-neutral-700 transition-colors"
            >
              {showGroceryList ? 'Hide Grocery List' : 'Generate Grocery List'}
            </button>

            {showGroceryList && (
              <div className="border border-neutral-200 rounded-2xl bg-white p-5 space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-medium uppercase tracking-widest text-neutral-900">
                    Grocery List ({groceryItems.length} items)
                  </h2>
                  <button
                    onClick={shareGroceryList}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-400 hover:text-neutral-900 hover:bg-neutral-50 rounded-full border border-neutral-200 transition-colors"
                  >
                    <HiOutlineShare className="w-3.5 h-3.5" /> Share
                  </button>
                </div>
                {groceryItems.length === 0 ? (
                  <p className="text-sm text-neutral-400 font-light">No ingredients to show.</p>
                ) : (
                  <ul className="space-y-1">
                    {groceryItems.map((item) => (
                      <li
                        key={item.name}
                        onClick={() => toggleCheck(item.name)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-colors ${
                          checkedItems.has(item.name) ? 'bg-green-50' : 'hover:bg-neutral-50'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                          checkedItems.has(item.name) ? 'bg-green-500 border-green-500' : 'border-neutral-300'
                        }`}>
                          {checkedItems.has(item.name) && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className={`text-sm flex-1 ${checkedItems.has(item.name) ? 'text-neutral-400 line-through' : 'text-neutral-900'}`}>
                          {item.quantity && <span className="font-medium">{item.quantity}{item.unit ? ` ${item.unit}` : ''} </span>}
                          {item.name}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
