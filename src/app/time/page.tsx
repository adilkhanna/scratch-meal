'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRecipeFlow } from '@/context/RecipeFlowContext';
import StepIndicator from '@/components/layout/StepIndicator';
import { TIME_RANGES } from '@/config/time-ranges';
import clsx from 'clsx';

export default function TimePage() {
  const router = useRouter();
  const { ingredients, timeRange, setTimeRange } = useRecipeFlow();

  useEffect(() => {
    if (ingredients.length === 0) {
      router.replace('/');
    }
  }, [ingredients.length, router]);

  const handleGenerate = () => {
    if (timeRange) {
      router.push('/results');
    }
  };

  if (ingredients.length === 0) return null;

  return (
    <div className="animate-fade-in">
      <StepIndicator currentStep={3} />

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#f5f5f5] font-[family-name:var(--font-serif)] mb-1">
            How much time do you have?
          </h1>
          <p className="text-[#a0a0a0] text-sm">
            Select your available cooking time. We&apos;ll find recipes that fit.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {TIME_RANGES.map((range) => (
            <button
              key={range.value}
              onClick={() => setTimeRange(range.value)}
              className={clsx(
                'flex flex-col items-center gap-2 p-6 rounded-xl border-2 transition-all',
                timeRange === range.value
                  ? 'border-amber-500/50 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                  : 'border-white/[0.08] bg-white/[0.05] hover:border-amber-500/30 hover:bg-amber-500/[0.05]'
              )}
            >
              <span className="text-3xl">{range.icon}</span>
              <span
                className={clsx(
                  'font-semibold text-sm',
                  timeRange === range.value ? 'text-amber-300' : 'text-[#d4d4d4]'
                )}
              >
                {range.label}
              </span>
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => router.push('/dietary')}
            className="flex-1 py-3.5 border border-white/[0.1] text-[#a0a0a0] rounded-xl font-semibold text-sm
                       hover:bg-white/[0.05] transition-all"
          >
            Back
          </button>
          <button
            onClick={handleGenerate}
            disabled={!timeRange}
            className="flex-[2] py-3.5 bg-amber-600 text-white rounded-xl font-semibold text-sm
                       hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed
                       transition-all shadow-[0_0_20px_rgba(245,158,11,0.15)]"
          >
            Generate Recipes
          </button>
        </div>
      </div>
    </div>
  );
}
