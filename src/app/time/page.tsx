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
        <div className="flex gap-3">
          <button onClick={() => router.push('/dietary')} className="flex-1 py-3.5 border border-neutral-200 text-neutral-500 rounded-full font-medium text-xs uppercase tracking-widest hover:bg-neutral-50 transition-colors">Back</button>
          <button onClick={handleGenerate} disabled={!timeRange} className="flex-[2] py-3.5 bg-[#0059FF] text-white rounded-full font-medium text-xs uppercase tracking-widest hover:bg-[#0047CC] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Generate Recipes</button>
        </div>
      </div>
    </div>
  );
}
