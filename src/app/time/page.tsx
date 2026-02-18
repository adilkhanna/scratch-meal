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
          <h1 className="text-2xl font-bold text-stone-900 mb-1">How much time do you have?</h1>
          <p className="text-stone-500 text-sm">
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
                  ? 'border-orange-500 bg-orange-50 shadow-sm'
                  : 'border-stone-200 bg-white hover:border-orange-300 hover:bg-orange-50/50'
              )}
            >
              <span className="text-3xl">{range.icon}</span>
              <span
                className={clsx(
                  'font-semibold text-sm',
                  timeRange === range.value ? 'text-orange-700' : 'text-stone-700'
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
            className="flex-1 py-3.5 border border-stone-200 text-stone-600 rounded-xl font-semibold text-sm
                       hover:bg-stone-50 transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleGenerate}
            disabled={!timeRange}
            className="flex-[2] py-3.5 bg-orange-500 text-white rounded-xl font-semibold text-sm
                       hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed
                       transition-colors shadow-sm"
          >
            Generate Recipes
          </button>
        </div>
      </div>
    </div>
  );
}
