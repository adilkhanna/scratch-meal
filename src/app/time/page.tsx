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

  useEffect(() => { if (ingredients.length === 0) router.replace('/'); }, [ingredients.length, router]);

  const handleGenerate = () => { if (timeRange) router.push('/results'); };

  if (ingredients.length === 0) return null;

  return (
    <div className="animate-fade-in">
      <StepIndicator currentStep={3} />
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#2d2d2a] font-[family-name:var(--font-serif)] mb-1">How much time do you have?</h1>
          <p className="text-[#7a7568] text-sm">Select your available cooking time. We&apos;ll find recipes that fit.</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {TIME_RANGES.map((range) => (
            <button key={range.value} onClick={() => setTimeRange(range.value)}
              className={clsx('flex flex-col items-center gap-2 p-6 rounded-xl border-2 transition-all',
                timeRange === range.value ? 'border-olive-500 bg-olive-50 shadow-sm' : 'border-cream-200 bg-white hover:border-olive-300 hover:bg-olive-50/50')}>
              <span className="text-3xl">{range.icon}</span>
              <span className={clsx('font-semibold text-sm', timeRange === range.value ? 'text-olive-800' : 'text-[#5a5347]')}>{range.label}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={() => router.push('/dietary')} className="flex-1 py-3.5 border border-cream-200 text-[#7a7568] rounded-xl font-semibold text-sm hover:bg-cream-50 transition-colors">Back</button>
          <button onClick={handleGenerate} disabled={!timeRange} className="flex-[2] py-3.5 bg-olive-600 text-white rounded-xl font-semibold text-sm hover:bg-olive-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Generate Recipes</button>
        </div>
      </div>
    </div>
  );
}
