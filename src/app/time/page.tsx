'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRecipeFlow } from '@/context/RecipeFlowContext';
import StepIndicator from '@/components/layout/StepIndicator';
import { TIME_RANGES } from '@/config/time-ranges';
import clsx from 'clsx';

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
    <div className="animate-fade-in">
      <StepIndicator currentStep={4} />
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-[family-name:var(--font-display)] text-neutral-900 mb-2">How Much Time<br />Do You Have?</h1>
          <p className="text-neutral-500 text-sm font-light">Select your available cooking time. We&apos;ll find recipes that fit.</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {TIME_RANGES.map((range) => (
            <button key={range.value} onClick={() => setTimeRange(range.value)}
              className={clsx('flex flex-col items-center gap-2 p-6 rounded-2xl border-2 transition-all',
                timeRange === range.value ? 'border-[#0059FF] bg-blue-50/50 shadow-sm' : 'border-neutral-200 bg-white hover:border-neutral-400 hover:bg-neutral-50/50')}>
              <span className="text-3xl">{range.icon}</span>
              <span className={clsx('font-medium text-sm', timeRange === range.value ? 'text-neutral-900' : 'text-neutral-700')}>{range.label}</span>
            </button>
          ))}
        </div>
        {/* Budget Section */}
        <div className="border border-neutral-200 rounded-2xl bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-sm text-neutral-900">Weekly Budget</h3>
              <p className="text-xs text-neutral-400">Optional — filter recipes by cost</p>
            </div>
            <button
              onClick={handleBudgetToggle}
              className={clsx(
                'relative w-11 h-6 rounded-full transition-colors',
                budgetEnabled ? 'bg-[#0059FF]' : 'bg-neutral-300'
              )}
            >
              <span className={clsx(
                'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
                budgetEnabled && 'translate-x-5'
              )} />
            </button>
          </div>
          {budgetEnabled && weeklyBudget !== null && (
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-semibold text-neutral-900">
                  {'\u20B9'}{weeklyBudget.toLocaleString('en-IN')}
                  <span className="text-sm font-normal text-neutral-400">/week</span>
                </span>
                <span className="text-xs text-neutral-400">
                  ~{'\u20B9'}{Math.round(weeklyBudget / 21)}/meal (21 meals)
                </span>
              </div>
              <input
                type="range"
                min={500}
                max={5000}
                step={100}
                value={weeklyBudget}
                onChange={(e) => setWeeklyBudget(Number(e.target.value))}
                className="w-full accent-[#0059FF] h-1.5"
              />
              <div className="flex justify-between text-[10px] text-neutral-400">
                <span>{'\u20B9'}500</span>
                <span>{'\u20B9'}5,000</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button onClick={() => router.push('/cuisine')} className="flex-1 py-3.5 border border-neutral-200 text-neutral-500 rounded-full font-medium text-xs uppercase tracking-widest hover:bg-neutral-50 transition-colors">Back</button>
          <button onClick={handleGenerate} disabled={!timeRange} className="flex-[2] py-3.5 bg-[#0059FF] text-white rounded-full font-medium text-xs uppercase tracking-widest hover:bg-[#0047CC] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Generate Recipes</button>
        </div>
      </div>
    </div>
  );
}
