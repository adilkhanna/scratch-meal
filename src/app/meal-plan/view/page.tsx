'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { loadGeneratedPlan, loadLatestPlan, toggleComponentFavorite } from '@/lib/weekly-plan-storage';
import MealComponentCard from '@/components/meals/MealComponentCard';
import GroceryList from '@/components/meals/GroceryList';
import MomoLoader from '@/components/ui/MomoLoader';
import StaggeredPageTitle from '@/components/ui/StaggeredPageTitle';
import STEP_THEMES from '@/config/step-themes';
import {
  GeneratedWeeklyPlan,
  GeneratedDayPlan,
  GeneratedMeal,
  isBreakfastByMember,
  isBreakfastOptions,
  RecipeIngredient,
  GroceryItem,
  GrocerySection,
} from '@/types';

const theme = STEP_THEMES.mealplan;

const DAY_LABELS: Record<string, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed',
  thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
};

type ViewTab = 'plan' | 'grocery';

function inferSection(ingredientName: string): GrocerySection {
  const n = ingredientName.toLowerCase();
  if (/chicken|mutton|lamb|fish|prawn|shrimp|egg|paneer|tofu|pork|beef|turkey/.test(n)) return 'proteins';
  if (/milk|cream|yogurt|curd|dahi|butter|cheese|ghee/.test(n)) return 'dairy';
  if (/rice|wheat|flour|atta|bread|pasta|noodle|oat|roti|maida|sooji|poha|semolina/.test(n)) return 'grains';
  if (/cumin|turmeric|coriander|pepper|chili|chilli|cinnamon|cardamom|clove|mustard seed|fenugreek|garam masala|salt|bay leaf/.test(n)) return 'spices';
  if (/oil|vinegar|soy sauce|ketchup|mayonnaise|honey|sugar|jaggery/.test(n)) return 'oils_condiments';
  if (/onion|tomato|potato|garlic|ginger|spinach|carrot|pea|bean|capsicum|broccoli|cabbage|cauliflower|cucumber|lemon|lime|mango|banana|apple|coconut|lettuce|zucchini|eggplant|beet/.test(n)) return 'produce';
  return 'other';
}

function getDayCalories(day: GeneratedDayPlan): { breakfast: number; lunch: number; dinner: number; total: number } {
  let bfCal = 0;
  if (isBreakfastByMember(day.breakfast)) {
    // Average across members for the per-person daily total
    const memberCals = day.breakfast.memberBreakfasts.map((mb) => mb.totalCalories);
    bfCal = memberCals.length > 0 ? Math.round(memberCals.reduce((a, b) => a + b, 0) / memberCals.length) : 0;
  } else if (isBreakfastOptions(day.breakfast)) {
    bfCal = Math.round(day.breakfast.options.reduce((sum, o) => sum + o.totalCalories, 0) / Math.max(day.breakfast.options.length, 1));
  } else {
    bfCal = day.breakfast.totalCalories;
  }
  return {
    breakfast: bfCal,
    lunch: day.lunch.totalCalories,
    dinner: day.dinner.totalCalories,
    total: bfCal + day.lunch.totalCalories + day.dinner.totalCalories,
  };
}

function calorieColor(actual: number, target: number): string {
  if (actual === 0) return 'text-black/30';
  const ratio = actual / target;
  if (ratio >= 0.85 && ratio <= 1.15) return 'text-green-600';
  if (ratio >= 0.7 && ratio <= 1.3) return 'text-amber-600';
  return 'text-red-500';
}

function buildGroceryList(plan: GeneratedWeeklyPlan): GroceryItem[] {
  const map = new Map<string, { quantity: number; unit: string; section: GrocerySection }>();

  function addIngredient(ing: RecipeIngredient) {
    const key = ing.name.toLowerCase().trim();
    const existing = map.get(key);
    const qty = parseFloat(ing.quantity) || 1;
    if (existing) {
      existing.quantity += qty;
    } else {
      map.set(key, { quantity: qty, unit: ing.unit || '', section: inferSection(key) });
    }
  }

  function processMeal(meal: GeneratedMeal) {
    meal.components.forEach((c) => c.ingredients.forEach(addIngredient));
  }

  plan.days.forEach((day) => {
    if (isBreakfastByMember(day.breakfast)) {
      day.breakfast.memberBreakfasts.forEach((mb) =>
        mb.components.forEach((c) => c.ingredients.forEach(addIngredient))
      );
    } else if (isBreakfastOptions(day.breakfast)) {
      day.breakfast.options.forEach(processMeal);
    } else {
      processMeal(day.breakfast as GeneratedMeal);
    }
    processMeal(day.lunch);
    processMeal(day.dinner);
  });

  return Array.from(map.entries()).map(([name, info]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    quantity: String(Math.round(info.quantity * 10) / 10),
    unit: info.unit,
    section: info.section,
    checked: false,
  }));
}

export default function MealPlanViewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center animate-radial-glow" style={{ background: theme.background, backgroundSize: '200% 200%' }}>
        <MomoLoader size={120} message="Loading..." />
      </div>
    }>
      <MealPlanViewContent />
    </Suspense>
  );
}

function MealPlanViewContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [plan, setPlan] = useState<GeneratedWeeklyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ViewTab>('plan');
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>([]);

  useEffect(() => {
    if (!user) { router.replace('/login'); return; }
    const planId = params.get('id');

    (async () => {
      try {
        const loaded = planId
          ? await loadGeneratedPlan(user.uid, planId)
          : await loadLatestPlan(user.uid);

        if (!loaded) {
          addToast('No meal plan found. Generate one first!', 'info');
          router.replace('/meal-plan');
          return;
        }

        setPlan(loaded);
        setGroceryItems(buildGroceryList(loaded));
      } catch (err) {
        console.error('Failed to load plan:', err);
        addToast('Failed to load meal plan.', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, [user, params, router, addToast]);

  const handleToggleFavorite = useCallback(async (
    dayIndex: number,
    mealType: 'breakfast' | 'lunch' | 'dinner',
    componentIndex: number
  ) => {
    if (!user || !plan) return;
    try {
      const newState = await toggleComponentFavorite(
        user.uid, plan.id, dayIndex, mealType, componentIndex
      );
      // Update local state
      setPlan((prev) => {
        if (!prev) return prev;
        const updated = JSON.parse(JSON.stringify(prev)) as GeneratedWeeklyPlan;
        const meal = updated.days[dayIndex][mealType];
        if ('components' in meal) {
          meal.components[componentIndex].isFavorite = newState;
        }
        return updated;
      });
      addToast(newState ? 'Added to favorites!' : 'Removed from favorites.', 'success');
    } catch {
      addToast('Failed to update favorite.', 'error');
    }
  }, [user, plan, addToast]);

  const toggleGroceryItem = (index: number) => {
    setGroceryItems((prev) =>
      prev.map((item, i) => i === index ? { ...item, checked: !item.checked } : item)
    );
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center animate-radial-glow"
        style={{ background: theme.background, backgroundSize: '200% 200%' }}
      >
        <MomoLoader size={120} message="Loading your meal plan..." />
      </div>
    );
  }

  if (!plan) return null;

  const activeDay: GeneratedDayPlan = plan.days[activeDayIdx];

  return (
    <div
      className="min-h-screen flex flex-col animate-radial-glow"
      style={{ background: theme.background, backgroundSize: '200% 200%' }}
    >
      <div className="max-w-3xl mx-auto px-6 pt-16 w-full pb-12">
        <div className="text-center mb-6">
          <StaggeredPageTitle
            text="your meal plan."
            className="text-[clamp(32px,5vw,56px)] tracking-[-0.25px]"
          />
          <p className="text-[12px] font-[family-name:var(--font-mono-option)] tracking-[0.5px] uppercase text-black/40 mt-2">
            {plan.planDays}-day plan &middot; {plan.familySize} {plan.familySize === 1 ? 'person' : 'people'}
            {plan.totalWeeklyCost != null && (
              <> &middot; Est. {'\u20B9'}{Math.round(plan.totalWeeklyCost).toLocaleString()} total</>
            )}
          </p>
          <p className="text-[10px] font-[family-name:var(--font-mono-option)] tracking-[0.5px] uppercase text-black/30 mt-1">
            All nutrition values are per person, per serving
          </p>
          {plan.dailyCaloricTarget && activeDay && (() => {
            const dayCals = getDayCalories(activeDay);
            return (
              <div className="flex items-center justify-center gap-2 mt-3">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/40 border-[1.5px] border-black/10 rounded-full">
                  <span className="text-[10px] tracking-[1px] uppercase text-black/40">Per person</span>
                  <span className={`text-[12px] font-medium ${calorieColor(dayCals.total, plan.dailyCaloricTarget!)}`}>
                    {dayCals.total} / {plan.dailyCaloricTarget} cal/day
                  </span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Tabs: Plan / Grocery */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {(['plan', 'grocery'] as ViewTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-full text-[12px] font-medium tracking-[1px] uppercase border-[1.5px] transition-all ${
                activeTab === tab
                  ? 'bg-black text-white border-black'
                  : 'bg-transparent text-black border-black/20 hover:border-black'
              }`}
            >
              {tab === 'plan' ? 'MEAL PLAN' : 'GROCERY LIST'}
            </button>
          ))}
        </div>

        {activeTab === 'plan' ? (
          <>
            {/* Day tabs */}
            <div className="flex items-center justify-center gap-2 mb-6 overflow-x-auto">
              {plan.days.map((day, idx) => (
                <button
                  key={day.day}
                  onClick={() => setActiveDayIdx(idx)}
                  className={`px-4 py-2 rounded-full text-[12px] font-medium tracking-[1px] uppercase border-[1.5px] transition-all whitespace-nowrap ${
                    activeDayIdx === idx
                      ? 'bg-black text-white border-black'
                      : 'bg-transparent text-black border-black/20 hover:border-black'
                  }`}
                >
                  {DAY_LABELS[day.day] || day.day}
                </button>
              ))}
            </div>

            {/* Day meals */}
            {activeDay && (
              <div className="space-y-8">
                {/* Breakfast */}
                <section>
                  <h3 className="text-[12px] font-medium tracking-[1px] uppercase text-black/50 mb-3">
                    Breakfast
                    {(() => {
                      const dayCals = getDayCalories(activeDay);
                      return dayCals.breakfast > 0 ? (
                        <span className={`ml-2 ${plan.dailyCaloricTarget
                          ? calorieColor(dayCals.breakfast, Math.round(plan.dailyCaloricTarget * 0.25))
                          : 'text-black/30'}`}>
                          ~{dayCals.breakfast} cal/pp
                          {plan.dailyCaloricTarget && <> / {Math.round(plan.dailyCaloricTarget * 0.25)}</>}
                        </span>
                      ) : null;
                    })()}
                  </h3>
                  {isBreakfastByMember(activeDay.breakfast) ? (
                    <div className="space-y-4">
                      {activeDay.breakfast.memberBreakfasts.map((mb, mbIdx) => (
                        <div key={mbIdx} className="space-y-2">
                          <p className="text-[11px] font-medium tracking-[1px] uppercase text-black/40">
                            {mb.memberName}
                            {mb.totalCalories > 0 && (
                              <span className="ml-1 text-black/25">~{mb.totalCalories} cal</span>
                            )}
                          </p>
                          {mb.components.map((comp) => (
                            <MealComponentCard key={comp.id} component={comp} />
                          ))}
                        </div>
                      ))}
                    </div>
                  ) : isBreakfastOptions(activeDay.breakfast) ? (
                    <div className="space-y-4">
                      <p className="text-[11px] font-[family-name:var(--font-mono-option)] tracking-[0.5px] uppercase text-black/30 mb-2">
                        {activeDay.breakfast.options.length} options for your family
                      </p>
                      {activeDay.breakfast.options.map((option, optIdx) => (
                        <div key={optIdx} className="space-y-2">
                          <p className="text-[11px] font-medium tracking-[1px] uppercase text-black/40">
                            Option {optIdx + 1}
                          </p>
                          {option.components.map((comp) => (
                            <MealComponentCard key={comp.id} component={comp} />
                          ))}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(activeDay.breakfast as GeneratedMeal).components.map((comp, compIdx) => (
                        <MealComponentCard
                          key={comp.id}
                          component={comp}
                          onToggleFavorite={() => handleToggleFavorite(activeDayIdx, 'breakfast', compIdx)}
                        />
                      ))}
                    </div>
                  )}
                </section>

                {/* Lunch */}
                <section>
                  <h3 className="text-[12px] font-medium tracking-[1px] uppercase text-black/50 mb-3">
                    Lunch
                    {activeDay.lunch.totalCalories > 0 && (
                      <span className={`ml-2 ${plan.dailyCaloricTarget
                        ? calorieColor(activeDay.lunch.totalCalories, Math.round(plan.dailyCaloricTarget * 0.40))
                        : 'text-black/30'}`}>
                        ~{activeDay.lunch.totalCalories} cal/pp
                        {plan.dailyCaloricTarget && <> / {Math.round(plan.dailyCaloricTarget * 0.40)}</>}
                      </span>
                    )}
                  </h3>
                  <div className="space-y-2">
                    {activeDay.lunch.components.map((comp, compIdx) => (
                      <MealComponentCard
                        key={comp.id}
                        component={comp}
                        onToggleFavorite={() => handleToggleFavorite(activeDayIdx, 'lunch', compIdx)}
                      />
                    ))}
                  </div>
                </section>

                {/* Dinner */}
                <section>
                  <h3 className="text-[12px] font-medium tracking-[1px] uppercase text-black/50 mb-3">
                    Dinner
                    {activeDay.dinner.totalCalories > 0 && (
                      <span className={`ml-2 ${plan.dailyCaloricTarget
                        ? calorieColor(activeDay.dinner.totalCalories, Math.round(plan.dailyCaloricTarget * 0.35))
                        : 'text-black/30'}`}>
                        ~{activeDay.dinner.totalCalories} cal/pp
                        {plan.dailyCaloricTarget && <> / {Math.round(plan.dailyCaloricTarget * 0.35)}</>}
                      </span>
                    )}
                  </h3>
                  <div className="space-y-2">
                    {activeDay.dinner.components.map((comp, compIdx) => (
                      <MealComponentCard
                        key={comp.id}
                        component={comp}
                        onToggleFavorite={() => handleToggleFavorite(activeDayIdx, 'dinner', compIdx)}
                      />
                    ))}
                  </div>
                </section>
              </div>
            )}
          </>
        ) : (
          <GroceryList items={groceryItems} onToggle={toggleGroceryItem} />
        )}

        {/* Actions */}
        <div className="flex items-center justify-center gap-4 mt-10">
          <button
            onClick={() => router.push('/meal-plan')}
            className="px-6 py-3 text-[14px] font-medium tracking-[1px] uppercase border-[1.5px] border-black rounded-[30px] bg-transparent text-black hover:bg-black hover:text-white transition-all duration-200"
          >
            NEW PLAN
          </button>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 text-[14px] font-medium tracking-[1px] uppercase border-[1.5px] border-black rounded-[30px] bg-transparent text-black hover:bg-black hover:text-white transition-all duration-200"
          >
            HOME
          </button>
        </div>
      </div>

      {/* Brand footer */}
      <div className="mt-auto text-center select-none overflow-hidden">
        <span className="font-[family-name:var(--font-brand)] text-[clamp(80px,15vw,225px)] font-normal text-black leading-none tracking-[-0.25px] block">
          GOOD MEALS CO.
        </span>
      </div>
    </div>
  );
}
