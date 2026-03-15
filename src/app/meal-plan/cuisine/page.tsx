'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMealPlanFlow } from '@/context/MealPlanFlowContext';
import StepIndicator from '@/components/layout/StepIndicator';
import StaggeredPageTitle from '@/components/ui/StaggeredPageTitle';
import { CUISINES } from '@/config/cuisines';
import STEP_THEMES from '@/config/step-themes';

const theme = STEP_THEMES.mealplan;
const DAY_LABELS: Record<string, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed',
  thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
};
const DAYS_3 = ['monday', 'tuesday', 'wednesday'];
const DAYS_7 = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function MealPlanCuisinePage() {
  const router = useRouter();
  const {
    dailyCuisines, setDayCuisine,
    weeklyBudget, setWeeklyBudget,
    planDays, setPlanDays,
  } = useMealPlanFlow();
  const [budgetOpen, setBudgetOpen] = useState(weeklyBudget !== null);

  const dayNames = planDays === 7 ? DAYS_7 : DAYS_3;
  const BUDGET_OPTIONS = [500, 1000, 1500, 2000, 3000, 5000];

  // Helper: get cuisine for a day+meal, default to ''
  const getCuisine = (day: string, meal: 'lunch' | 'dinner') =>
    dailyCuisines[day]?.[meal] || '';

  // Apply same cuisine to all days for a meal
  const applyToAll = (meal: 'lunch' | 'dinner', cuisineId: string) => {
    for (const day of dayNames) {
      setDayCuisine(day, meal, cuisineId);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col animate-radial-glow"
      style={{ background: theme.background, backgroundSize: '200% 200%' }}
    >
      <div className="max-w-3xl mx-auto px-6 pt-16">
        <StepIndicator currentStep={3} variant="meal-plan" />

        <div className="text-center mb-6">
          <StaggeredPageTitle
            text="cuisine & schedule."
            className="text-[clamp(36px,5.5vw,67px)] tracking-[-0.25px]"
          />
        </div>

        {/* Plan duration */}
        <div className="max-w-2xl mx-auto mb-6">
          <div className="glass-panel p-5">
            <h3 className="text-[14px] font-medium tracking-[1px] uppercase text-black mb-3">
              Plan Duration
            </h3>
            <div className="flex gap-3">
              {[3, 7].map((d) => (
                <button
                  key={d}
                  onClick={() => setPlanDays(d)}
                  className={`px-5 py-2 rounded-full text-[12px] font-[family-name:var(--font-mono-option)] tracking-[0.5px] uppercase border-[1.5px] transition-all ${
                    planDays === d
                      ? 'bg-black text-white border-black'
                      : 'bg-transparent text-black border-black/20 hover:border-black'
                  }`}
                >
                  {d} Days
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Per-day cuisine grid */}
        <div className="max-w-2xl mx-auto mb-6">
          <div className="glass-panel p-5">
            <h3 className="text-[14px] font-medium tracking-[1px] uppercase text-black mb-1">
              Cuisine Per Day
            </h3>
            <p className="text-[11px] tracking-[0.5px] uppercase text-black/40 mb-4">
              Pick a cuisine for each meal. Leave blank for diverse.
            </p>

            {/* Header row */}
            <div className="grid grid-cols-[60px_1fr_1fr] gap-2 mb-2">
              <div />
              <span className="text-[11px] font-medium tracking-[1px] uppercase text-black/60 text-center">Lunch</span>
              <span className="text-[11px] font-medium tracking-[1px] uppercase text-black/60 text-center">Dinner</span>
            </div>

            {/* Day rows */}
            {dayNames.map((day) => (
              <div key={day} className="grid grid-cols-[60px_1fr_1fr] gap-2 mb-2">
                <span className="text-[13px] font-[family-name:var(--font-mono-option)] tracking-[0.5px] uppercase text-black self-center">
                  {DAY_LABELS[day]}
                </span>
                <select
                  value={getCuisine(day, 'lunch')}
                  onChange={(e) => setDayCuisine(day, 'lunch', e.target.value)}
                  className="w-full px-3 py-2 rounded-full text-[12px] font-[family-name:var(--font-mono-option)] tracking-[0.5px] uppercase border-[1.5px] border-black/20 bg-white/60 text-black focus:border-black outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="">Diverse</option>
                  {CUISINES.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
                <select
                  value={getCuisine(day, 'dinner')}
                  onChange={(e) => setDayCuisine(day, 'dinner', e.target.value)}
                  className="w-full px-3 py-2 rounded-full text-[12px] font-[family-name:var(--font-mono-option)] tracking-[0.5px] uppercase border-[1.5px] border-black/20 bg-white/60 text-black focus:border-black outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="">Diverse</option>
                  {CUISINES.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>
            ))}

            {/* Quick-fill buttons */}
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="text-[11px] tracking-[0.5px] uppercase text-black/40 self-center mr-1">Quick fill:</span>
              {CUISINES.slice(0, 6).map((c) => (
                <button
                  key={c.id}
                  onClick={() => { applyToAll('lunch', c.id); applyToAll('dinner', c.id); }}
                  className="px-3 py-1 rounded-full text-[11px] font-[family-name:var(--font-mono-option)] tracking-[0.5px] uppercase border border-black/15 text-black/60 hover:border-black hover:text-black transition-all"
                >
                  All {c.label}
                </button>
              ))}
              <button
                onClick={() => { applyToAll('lunch', ''); applyToAll('dinner', ''); }}
                className="px-3 py-1 rounded-full text-[11px] font-[family-name:var(--font-mono-option)] tracking-[0.5px] uppercase border border-black/15 text-black/60 hover:border-black hover:text-black transition-all"
              >
                All Diverse
              </button>
            </div>
          </div>
        </div>

        {/* Weekly budget (optional) */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="glass-panel p-6">
            <button
              onClick={() => {
                if (budgetOpen && weeklyBudget !== null) setWeeklyBudget(null);
                setBudgetOpen(!budgetOpen);
              }}
              className="w-full flex items-center justify-between"
            >
              <h3 className="text-[14px] font-medium tracking-[1px] uppercase text-black">
                Weekly Budget
                {weeklyBudget !== null && (
                  <span className="ml-2 text-black/40">({'\u20B9'}{weeklyBudget.toLocaleString()})</span>
                )}
              </h3>
              <span className="text-[12px] tracking-[1px] uppercase text-black/40">
                {budgetOpen ? 'HIDE' : 'OPTIONAL'}
              </span>
            </button>

            {budgetOpen && (
              <div className="mt-4 flex flex-wrap gap-2 animate-fade-in">
                {BUDGET_OPTIONS.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setWeeklyBudget(weeklyBudget === amount ? null : amount)}
                    className={`px-4 py-2 rounded-full text-[12px] font-[family-name:var(--font-mono-option)] tracking-[0.5px] uppercase border-[1.5px] transition-all ${
                      weeklyBudget === amount
                        ? 'bg-black text-white border-black'
                        : 'bg-transparent text-black border-black/20 hover:border-black'
                    }`}
                  >
                    {'\u20B9'}{amount.toLocaleString()}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-center gap-4 mt-4 mb-12">
          <button
            onClick={() => router.push('/meal-plan/dietary')}
            className="px-8 py-3 text-[14px] font-medium tracking-[1px] uppercase border-[1.5px] border-black rounded-[30px] bg-transparent text-black hover:bg-black hover:text-white transition-all duration-200 inline-flex items-center gap-2"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            BACK
          </button>
          <button
            onClick={() => router.push('/meal-plan/generate')}
            className="px-8 py-3 text-[14px] font-medium tracking-[1px] uppercase border-[1.5px] border-black rounded-[30px] bg-transparent text-black hover:bg-black hover:text-white transition-all duration-200 inline-flex items-center gap-2"
          >
            GENERATE
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
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
