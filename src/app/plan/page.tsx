'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { loadRecipes } from '@/lib/recipe-storage';
import { loadMealPlan, saveMealPlan, getWeekId, getWeekDates, SLOTS } from '@/lib/meal-plan-storage';
import { Recipe, MealPlan, DayOfWeek, MealSlot } from '@/types';
import { HiChevronLeft, HiChevronRight, HiPlus, HiX, HiClock, HiOutlineShare } from 'react-icons/hi';
import { format } from 'date-fns';
import MomoLoader from '@/components/ui/MomoLoader';
import RecipeDetailModal from '@/components/recipes/RecipeDetailModal';
import STEP_THEMES from '@/config/step-themes';
import StaggeredPageTitle from '@/components/ui/StaggeredPageTitle';

const DAYS: { key: DayOfWeek; label: string }[] = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
];

const SLOT_META: Record<MealSlot, { label: string; emoji: string }> = {
  breakfast: { label: 'Breakfast', emoji: '☀️' },
  lunch: { label: 'Lunch', emoji: '🍽️' },
  dinner: { label: 'Dinner', emoji: '🌙' },
};

const theme = STEP_THEMES.general;

export default function MealPlanPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [currentWeekId, setCurrentWeekId] = useState(() => getWeekId(new Date()));
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickerTarget, setPickerTarget] = useState<{ day: DayOfWeek; slot: MealSlot } | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [showGroceryList, setShowGroceryList] = useState(false);
  const [bbMode, setBbMode] = useState(false);
  const [bbIndex, setBbIndex] = useState(0);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

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

  useEffect(() => { fetchData(); }, [fetchData]);

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

  const addRecipeToSlot = async (day: DayOfWeek, slot: MealSlot, recipeId: string) => {
    if (!user?.uid || !plan) return;
    const updatedDays = { ...plan.days };
    const dayPlan = { ...updatedDays[day] };
    const slotData = { ...dayPlan[slot] };
    if (!slotData.recipeIds.includes(recipeId)) {
      slotData.recipeIds = [...slotData.recipeIds, recipeId];
    }
    dayPlan[slot] = slotData;
    updatedDays[day] = dayPlan;
    const updatedPlan = { ...plan, days: updatedDays };
    setPlan(updatedPlan);
    setPickerTarget(null);
    setPickerSearch('');
    try {
      await saveMealPlan(user.uid, updatedPlan);
      const recipe = recipeMap.get(recipeId);
      addToast(`Added "${recipe?.name || 'Recipe'}" to ${DAYS.find((d) => d.key === day)?.label} ${SLOT_META[slot].label}!`, 'success');
    } catch {
      addToast('Failed to update meal plan.', 'error');
    }
  };

  const removeRecipeFromSlot = async (day: DayOfWeek, slot: MealSlot, recipeId: string) => {
    if (!user?.uid || !plan) return;
    const updatedDays = { ...plan.days };
    const dayPlan = { ...updatedDays[day] };
    const slotData = { ...dayPlan[slot] };
    slotData.recipeIds = slotData.recipeIds.filter((id) => id !== recipeId);
    dayPlan[slot] = slotData;
    updatedDays[day] = dayPlan;
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
      for (const slot of SLOTS) {
        for (const recipeId of plan.days[day.key][slot].recipeIds) {
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

  const totalPlannedMeals = plan
    ? DAYS.reduce((sum, d) => sum + SLOTS.reduce((s, slot) => s + plan.days[d.key][slot].recipeIds.length, 0), 0)
    : 0;

  if (loading) return (
    <div className="min-h-screen animate-radial-glow flex items-center justify-center" style={{ background: theme.background, backgroundSize: '200% 200%' }}>
      <MomoLoader message="Loading meal plan..." />
    </div>
  );

  return (
    <div className="min-h-screen animate-radial-glow" style={{ background: theme.background, backgroundSize: '200% 200%' }}>
      <div className="max-w-6xl mx-auto px-6 sm:px-8 pt-24 pb-16 space-y-6">
        {/* Header */}
        <div>
          <StaggeredPageTitle text="meal plan." className="text-[clamp(36px,5.5vw,67px)] tracking-[-0.25px]" />
          <p className="text-black/50 text-[12px] tracking-[1px] uppercase text-center mt-3">
            {totalPlannedMeals === 0 ? 'Plan your week! Add recipes to each meal slot.' : `${totalPlannedMeals} meals planned this week`}
          </p>
        </div>

        {/* Week Navigation */}
        <div className="flex items-center justify-between">
          <button onClick={() => navigateWeek(-1)} className="p-2 text-black/40 hover:text-black hover:bg-black/5 rounded-lg transition-colors">
            <HiChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <p className="text-[14px] font-medium text-black">{weekLabel}</p>
            {isCurrentWeek && <p className="text-[12px] tracking-[1px] uppercase text-black/40">This week</p>}
          </div>
          <button onClick={() => navigateWeek(1)} className="p-2 text-black/40 hover:text-black hover:bg-black/5 rounded-lg transition-colors">
            <HiChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Day Grid */}
        <div className="space-y-3">
          {DAYS.map((day) => (
            <div key={day.key} className="border-[1.5px] border-black/20 rounded-2xl bg-white/50 p-4">
              <h3 className="text-[12px] font-medium uppercase tracking-[1px] text-black mb-3">{day.label}</h3>

              <div className="space-y-3">
                {SLOTS.map((slot) => {
                  const slotRecipes = plan?.days[day.key][slot].recipeIds || [];
                  const meta = SLOT_META[slot];
                  const isPickerOpen = pickerTarget?.day === day.key && pickerTarget?.slot === slot;

                  return (
                    <div key={slot} className="pl-1">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[12px] tracking-[1px] uppercase text-black/50 font-medium flex items-center gap-1.5">
                          <span>{meta.emoji}</span> {meta.label}
                        </span>
                        <button
                          onClick={() => setPickerTarget(isPickerOpen ? null : { day: day.key, slot })}
                          className="flex items-center gap-0.5 px-2 py-0.5 text-[10px] text-black/40 hover:text-black hover:bg-black/5 rounded-full border-[1.5px] border-black/20 transition-colors"
                        >
                          <HiPlus className="w-3 h-3" /> Add
                        </button>
                      </div>

                      {slotRecipes.length === 0 ? (
                        <p className="text-[11px] text-black/20 font-light pl-6">—</p>
                      ) : (
                        <div className="space-y-1.5 pl-6">
                          {slotRecipes.map((recipeId) => {
                            const recipe = recipeMap.get(recipeId);
                            if (!recipe) return null;
                            return (
                              <div key={recipeId} className="flex items-center justify-between gap-2 bg-black/5 rounded-xl px-3 py-2">
                                <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setSelectedRecipe(recipe)}>
                                  <p className="text-sm font-medium text-black truncate">{recipe.name}</p>
                                  <p className="text-[12px] tracking-[1px] uppercase text-black/40 flex items-center gap-1">
                                    <HiClock className="w-3 h-3" />{recipe.cookTime}
                                  </p>
                                </div>
                                <button
                                  onClick={() => removeRecipeFromSlot(day.key, slot, recipeId)}
                                  className="p-1 text-black/30 hover:text-red-500 transition-colors shrink-0"
                                >
                                  <HiX className="w-4 h-4" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Recipe Picker */}
                      {isPickerOpen && (
                        <div className="mt-2 ml-6 border-t border-black/10 pt-2 animate-fade-in">
                          <input
                            type="text"
                            value={pickerSearch}
                            onChange={(e) => setPickerSearch(e.target.value)}
                            placeholder="Search your recipes..."
                            className="w-full px-4 py-2 rounded-full border-[1.5px] border-black/20 bg-white/50 text-sm font-light text-black placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-black/10 mb-2"
                          />
                          <div className="max-h-40 overflow-y-auto space-y-1">
                            {filteredPickerRecipes.length === 0 ? (
                              <p className="text-[12px] tracking-[1px] uppercase text-black/40 font-light py-2 text-center">
                                {allRecipes.length === 0 ? 'No recipes yet. Generate some first!' : 'No recipes match your search.'}
                              </p>
                            ) : (
                              filteredPickerRecipes.map((recipe) => (
                                <button
                                  key={recipe.id}
                                  onClick={() => addRecipeToSlot(day.key, slot, recipe.id)}
                                  className="w-full flex items-center justify-between px-3 py-2 text-left rounded-xl hover:bg-black/5 transition-colors"
                                >
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm text-black truncate">{recipe.name}</p>
                                    <p className="text-[12px] tracking-[1px] uppercase text-black/40">{recipe.cookTime} · {recipe.difficulty}</p>
                                  </div>
                                  <HiPlus className="w-4 h-4 text-black/40 shrink-0" />
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
            </div>
          ))}
        </div>

        {/* Grocery List Toggle */}
        {totalPlannedMeals > 0 && (
          <>
            <button
              onClick={() => { setShowGroceryList(!showGroceryList); setCheckedItems(new Set()); }}
              className="w-full py-4 border-[1.5px] border-black rounded-[30px] bg-black text-white text-[14px] font-medium tracking-[1px] uppercase hover:bg-black/80 transition-colors"
            >
              {showGroceryList ? 'Hide Grocery List' : 'Generate Grocery List'}
            </button>

            {showGroceryList && (
              <div className="border-[1.5px] border-black/20 rounded-2xl bg-white/50 p-5 space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h2 className="text-[12px] font-medium uppercase tracking-[1px] text-black">
                    Grocery List ({groceryItems.length} items)
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setBbMode(true); setBbIndex(0); }}
                      className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-[12px] tracking-[1px] uppercase text-black/40 hover:text-black hover:bg-black/5 rounded-full border-[1.5px] border-black/20 transition-colors"
                    >
                      🛒 BigBasket
                    </button>
                    <button
                      onClick={shareGroceryList}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] tracking-[1px] uppercase text-black/40 hover:text-black hover:bg-black/5 rounded-full border-[1.5px] border-black/20 transition-colors"
                    >
                      <HiOutlineShare className="w-3.5 h-3.5" /> Share
                    </button>
                  </div>
                </div>
                {groceryItems.length === 0 ? (
                  <p className="text-sm text-black/40 font-light">No ingredients to show.</p>
                ) : (
                  <ul className="space-y-1">
                    {groceryItems.map((item) => (
                      <li
                        key={item.name}
                        onClick={() => toggleCheck(item.name)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-colors ${
                          checkedItems.has(item.name) ? 'bg-green-50' : 'hover:bg-black/5'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                          checkedItems.has(item.name) ? 'bg-green-500 border-green-500' : 'border-black/30'
                        }`}>
                          {checkedItems.has(item.name) && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className={`text-sm flex-1 ${checkedItems.has(item.name) ? 'text-black/40 line-through' : 'text-black'}`}>
                          {item.quantity && <span className="font-medium">{item.quantity}{item.unit ? ` ${item.unit}` : ''} </span>}
                          {item.name}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* BigBasket Step-Through Flow (desktop only) */}
                {bbMode && groceryItems.length > 0 && (
                  <div className="hidden lg:block border-[1.5px] border-black/20 bg-black/5 rounded-2xl p-4 space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[12px] font-medium uppercase tracking-[1px] text-black">
                        🛒 Send to BigBasket
                      </h3>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            const unchecked = groceryItems.filter((item) => !checkedItems.has(item.name));
                            if (unchecked.length === 0) return;
                            unchecked.forEach((item, i) => {
                              setTimeout(() => {
                                window.open(`https://www.bigbasket.com/ps/?q=${encodeURIComponent(item.name)}`, `_bb_${i}`);
                              }, i * 300);
                            });
                            setBbMode(false);
                            setBbIndex(0);
                          }}
                          className="text-[12px] tracking-[1px] uppercase text-black font-medium hover:text-black/60 transition-colors"
                        >
                          Open {groceryItems.length - checkedItems.size > 0 ? `${groceryItems.length - checkedItems.size}` : 'All'} in Tabs
                        </button>
                        <span className="text-[12px] tracking-[1px] uppercase text-black/40">
                          Item {bbIndex + 1} of {groceryItems.length}
                        </span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-1.5 bg-black/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-black rounded-full transition-all duration-300"
                        style={{ width: `${((bbIndex + 1) / groceryItems.length) * 100}%` }}
                      />
                    </div>

                    {/* Current item */}
                    <div className="bg-white/50 rounded-xl border-[1.5px] border-black/20 p-4 text-center space-y-3">
                      <p className="text-lg font-medium text-black">
                        {groceryItems[bbIndex].name}
                      </p>
                      {groceryItems[bbIndex].quantity && (
                        <p className="text-sm text-black/40 font-light">
                          {groceryItems[bbIndex].quantity}{groceryItems[bbIndex].unit ? ` ${groceryItems[bbIndex].unit}` : ''}
                        </p>
                      )}
                      <a
                        href={`https://www.bigbasket.com/ps/?q=${encodeURIComponent(groceryItems[bbIndex].name)}`}
                        target="_bigbasket"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-[30px] text-[14px] font-medium tracking-[1px] uppercase hover:bg-black/80 transition-colors"
                      >
                        Open on BigBasket ↗
                      </a>
                    </div>

                    {/* Navigation buttons */}
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => setBbIndex((i) => Math.max(0, i - 1))}
                        disabled={bbIndex === 0}
                        className="px-4 py-2 text-[14px] font-medium tracking-[1px] uppercase border-[1.5px] border-black/20 text-black/40 rounded-[30px] hover:bg-black/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        ← Previous
                      </button>
                      {bbIndex < groceryItems.length - 1 ? (
                        <button
                          onClick={() => setBbIndex((i) => i + 1)}
                          className="px-4 py-2 text-[14px] font-medium tracking-[1px] uppercase bg-black text-white rounded-[30px] hover:bg-black/80 transition-colors"
                        >
                          Next Item →
                        </button>
                      ) : (
                        <button
                          onClick={() => { setBbMode(false); setBbIndex(0); }}
                          className="px-4 py-2 text-[14px] font-medium tracking-[1px] uppercase bg-green-500 text-white rounded-[30px] hover:bg-green-600 transition-colors"
                        >
                          ✓ Done
                        </button>
                      )}
                    </div>

                    {/* Close / skip all */}
                    <button
                      onClick={() => { setBbMode(false); setBbIndex(0); }}
                      className="w-full text-center text-[12px] tracking-[1px] uppercase text-black/40 hover:text-black/60 transition-colors py-1"
                    >
                      Close
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {selectedRecipe && (
        <RecipeDetailModal recipe={selectedRecipe} onClose={() => setSelectedRecipe(null)} />
      )}
    </div>
  );
}
