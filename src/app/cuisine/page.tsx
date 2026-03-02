'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRecipeFlow } from '@/context/RecipeFlowContext';
import StepIndicator from '@/components/layout/StepIndicator';
import { CUISINES } from '@/config/cuisines';
import clsx from 'clsx';

export default function CuisinePage() {
  const router = useRouter();
  const { ingredients, cuisines, setCuisines, toggleCuisine } = useRecipeFlow();

  useEffect(() => { if (ingredients.length === 0) router.replace('/'); }, [ingredients.length, router]);

  if (ingredients.length === 0) return null;

  return (
    <div className="animate-fade-in">
      <StepIndicator currentStep={3} />
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-[family-name:var(--font-display)] text-neutral-900 mb-2">Cuisine Preferences</h1>
          <p className="text-neutral-500 text-sm font-light">Select your preferred cuisines, or skip for diverse results.</p>
        </div>

        {cuisines.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-full">
            <span className="text-xs font-medium uppercase tracking-wider text-neutral-700">{cuisines.length} selected</span>
            <button onClick={() => setCuisines([])} className="text-xs text-neutral-400 hover:text-neutral-900 uppercase tracking-wider ml-auto transition-colors">Clear all</button>
          </div>
        )}

        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {CUISINES.map((cuisine) => (
            <button
              key={cuisine.id}
              onClick={() => toggleCuisine(cuisine.id)}
              className={clsx(
                'flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all',
                cuisines.includes(cuisine.id)
                  ? 'border-[#0059FF] bg-blue-50/50 shadow-sm'
                  : 'border-neutral-200 bg-white hover:border-neutral-400 hover:bg-neutral-50/50'
              )}
            >
              <span className="text-2xl">{cuisine.emoji}</span>
              <span className={clsx(
                'font-medium text-xs',
                cuisines.includes(cuisine.id) ? 'text-neutral-900' : 'text-neutral-700'
              )}>
                {cuisine.label}
              </span>
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={() => router.push('/dietary')} className="flex-1 py-3.5 border border-neutral-200 text-neutral-500 rounded-full font-medium text-xs uppercase tracking-widest hover:bg-neutral-50 transition-colors">Back</button>
          <button onClick={() => router.push('/time')} className="flex-[2] py-3.5 bg-[#0059FF] text-white rounded-full font-medium text-xs uppercase tracking-widest hover:bg-[#0047CC] transition-colors">Next: Cooking Time</button>
        </div>
      </div>
    </div>
  );
}
