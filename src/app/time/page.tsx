'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRecipeFlow } from '@/context/RecipeFlowContext';
import StepIndicator from '@/components/layout/StepIndicator';
import StaggeredPageTitle from '@/components/ui/StaggeredPageTitle';
import { TIME_RANGES } from '@/config/time-ranges';
import STEP_THEMES from '@/config/step-themes';

const theme = STEP_THEMES.time;

export default function TimePage() {
  const router = useRouter();
  const { ingredients, timeRange, setTimeRange, weeklyBudget, setWeeklyBudget } = useRecipeFlow();
  const [budgetEnabled, setBudgetEnabled] = useState(weeklyBudget !== null);

  useEffect(() => { if (ingredients.length === 0) router.replace('/'); }, [ingredients.length, router]);

  const handleBudgetToggle = () => {
    if (budgetEnabled) {
      setBudgetEnabled(false);
      setWeeklyBudget(null);
    } else {
      setBudgetEnabled(true);
      setWeeklyBudget(2000);
    }
  };

  const handleGenerate = () => { if (timeRange) router.push('/results'); };

  if (ingredients.length === 0) return null;

  return (
    <div
      className="min-h-screen animate-radial-glow"
      style={{ background: theme.background, backgroundSize: '200% 200%' }}
    >

      <div className="max-w-3xl mx-auto px-6">
        <StepIndicator currentStep={4} />

        {/* Title — staggered animation */}
        <div className="text-center mb-8">
          <StaggeredPageTitle
            text="how much time?"
            className="text-[clamp(36px,5.5vw,67px)] tracking-[-0.25px]"
          />
        </div>

        {/* Time options — circle toggles, no emojis */}
        <div className="max-w-2xl mx-auto grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-4">
          {TIME_RANGES.map((range) => {
            const isSelected = timeRange === range.value;
            return (
              <button
                key={range.value}
                onClick={() => setTimeRange(range.value)}
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
                  {range.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Budget Section */}
        <div className="max-w-2xl mx-auto mt-8 border-[1.5px] border-black rounded-[30px] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[14px] font-medium tracking-[1px] uppercase text-black">Weekly Budget</h3>
              <p className="text-[12px] tracking-[0.5px] uppercase text-black/40 mt-0.5">Optional — filter recipes by cost</p>
            </div>
            <button
              onClick={handleBudgetToggle}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                budgetEnabled ? 'bg-black' : 'bg-black/20'
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                budgetEnabled ? 'translate-x-5' : ''
              }`} />
            </button>
          </div>
          {budgetEnabled && weeklyBudget !== null && (
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-[family-name:var(--font-onboarding)] text-black">
                  {'\u20B9'}{weeklyBudget.toLocaleString('en-IN')}
                  <span className="text-sm font-[family-name:var(--font-mono-option)] text-black/40 ml-1">/WEEK</span>
                </span>
                <span className="text-[12px] font-[family-name:var(--font-mono-option)] tracking-[0.5px] text-black/40">
                  ~{'\u20B9'}{Math.round(weeklyBudget / 21)}/MEAL
                </span>
              </div>
              <input
                type="range"
                min={500}
                max={5000}
                step={100}
                value={weeklyBudget}
                onChange={(e) => setWeeklyBudget(Number(e.target.value))}
                className="w-full accent-black h-1.5"
              />
              <div className="flex justify-between text-[10px] font-[family-name:var(--font-mono-option)] text-black/40">
                <span>{'\u20B9'}500</span>
                <span>{'\u20B9'}5,000</span>
              </div>
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-center gap-4 mt-8 mb-12">
          <button
            onClick={() => router.push('/cuisine')}
            className="px-8 py-3 text-[14px] font-medium tracking-[1px] uppercase border-[1.5px] border-black rounded-[30px] bg-transparent text-black hover:bg-black hover:text-white transition-all duration-200 inline-flex items-center gap-2"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            BACK
          </button>
          <button
            onClick={handleGenerate}
            disabled={!timeRange}
            className="px-8 py-3 text-[14px] font-medium tracking-[1px] uppercase border-[1.5px] border-black rounded-[30px] bg-transparent text-black hover:bg-black hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 inline-flex items-center gap-2"
          >
            GENERATE RECIPES
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
