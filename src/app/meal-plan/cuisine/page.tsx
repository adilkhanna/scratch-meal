'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMealPlanFlow } from '@/context/MealPlanFlowContext';
import StepIndicator from '@/components/layout/StepIndicator';
import StaggeredPageTitle from '@/components/ui/StaggeredPageTitle';
import { CUISINES } from '@/config/cuisines';
import STEP_THEMES from '@/config/step-themes';

const theme = STEP_THEMES.mealplan;

export default function MealPlanCuisinePage() {
  const router = useRouter();
  const {
    lunchCuisines, dinnerCuisines,
    toggleLunchCuisine, setLunchCuisines,
    toggleDinnerCuisine, setDinnerCuisines,
    weeklyBudget, setWeeklyBudget,
  } = useMealPlanFlow();
  const [budgetOpen, setBudgetOpen] = useState(weeklyBudget !== null);

  const BUDGET_OPTIONS = [500, 1000, 1500, 2000, 3000, 5000];

  return (
    <div
      className="min-h-screen flex flex-col animate-radial-glow"
      style={{ background: theme.background, backgroundSize: '200% 200%' }}
    >
      <div className="max-w-3xl mx-auto px-6 pt-16">
        <StepIndicator currentStep={3} variant="meal-plan" />

        <div className="text-center mb-8">
          <StaggeredPageTitle
            text="cuisine & budget."
            className="text-[clamp(36px,5.5vw,67px)] tracking-[-0.25px]"
          />
        </div>

        {/* Lunch cuisines */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="glass-panel p-6">
            <h3 className="text-[14px] font-medium tracking-[1px] uppercase text-black mb-4">
              Lunch Cuisines
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-4">
              {CUISINES.map((cuisine) => {
                const isSelected = lunchCuisines.includes(cuisine.id);
                return (
                  <button
                    key={cuisine.id}
                    onClick={() => toggleLunchCuisine(cuisine.id)}
                    className="flex items-center gap-2.5 text-left group transition-colors"
                  >
                    <span
                      className={`w-[10px] h-[10px] rounded-full border-[1.5px] shrink-0 transition-all ${
                        isSelected
                          ? 'bg-black border-black'
                          : 'border-black/40 group-hover:bg-black group-hover:border-black'
                      }`}
                    />
                    <span className="text-[14px] font-[family-name:var(--font-mono-option)] tracking-[0.5px] uppercase text-black">
                      {cuisine.label}
                    </span>
                  </button>
                );
              })}
            </div>
            {lunchCuisines.length > 0 && (
              <div className="mt-4 flex items-center justify-between">
                <span className="text-[12px] tracking-[1px] uppercase text-black/50">
                  {lunchCuisines.length} selected
                </span>
                <button
                  onClick={() => setLunchCuisines([])}
                  className="text-[12px] tracking-[1px] uppercase text-black/40 hover:text-black transition-colors"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Dinner cuisines */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="glass-panel p-6">
            <h3 className="text-[14px] font-medium tracking-[1px] uppercase text-black mb-4">
              Dinner Cuisines
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-4">
              {CUISINES.map((cuisine) => {
                const isSelected = dinnerCuisines.includes(cuisine.id);
                return (
                  <button
                    key={cuisine.id}
                    onClick={() => toggleDinnerCuisine(cuisine.id)}
                    className="flex items-center gap-2.5 text-left group transition-colors"
                  >
                    <span
                      className={`w-[10px] h-[10px] rounded-full border-[1.5px] shrink-0 transition-all ${
                        isSelected
                          ? 'bg-black border-black'
                          : 'border-black/40 group-hover:bg-black group-hover:border-black'
                      }`}
                    />
                    <span className="text-[14px] font-[family-name:var(--font-mono-option)] tracking-[0.5px] uppercase text-black">
                      {cuisine.label}
                    </span>
                  </button>
                );
              })}
            </div>
            {dinnerCuisines.length > 0 && (
              <div className="mt-4 flex items-center justify-between">
                <span className="text-[12px] tracking-[1px] uppercase text-black/50">
                  {dinnerCuisines.length} selected
                </span>
                <button
                  onClick={() => setDinnerCuisines([])}
                  className="text-[12px] tracking-[1px] uppercase text-black/40 hover:text-black transition-colors"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-[12px] tracking-[1px] uppercase text-black/40 mb-6">
          Skip cuisines for diverse results
        </p>

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
