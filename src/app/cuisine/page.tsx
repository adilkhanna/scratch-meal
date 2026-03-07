'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRecipeFlow } from '@/context/RecipeFlowContext';
import StepIndicator from '@/components/layout/StepIndicator';
import StaggeredPageTitle from '@/components/ui/StaggeredPageTitle';
import { CUISINES } from '@/config/cuisines';
import STEP_THEMES from '@/config/step-themes';

const theme = STEP_THEMES.cuisine;

export default function CuisinePage() {
  const router = useRouter();
  const { ingredients, cuisines, setCuisines, toggleCuisine } = useRecipeFlow();

  useEffect(() => { if (ingredients.length === 0) router.replace('/'); }, [ingredients.length, router]);

  if (ingredients.length === 0) return null;

  return (
    <div
      className="min-h-screen flex flex-col animate-radial-glow"
      style={{ background: theme.background, backgroundSize: '200% 200%' }}
    >

      <div className="max-w-3xl mx-auto px-6 pt-16">
        <StepIndicator currentStep={3} />

        {/* Title — staggered animation */}
        <div className="text-center mb-8">
          <StaggeredPageTitle
            text="cuisine preferences."
            className="text-[clamp(36px,5.5vw,67px)] tracking-[-0.25px]"
          />
        </div>

        {/* Cuisine grid — circle toggles, no emojis */}
        <div className="max-w-2xl mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-4">
          {CUISINES.map((cuisine) => {
            const isSelected = cuisines.includes(cuisine.id);
            return (
              <button
                key={cuisine.id}
                onClick={() => toggleCuisine(cuisine.id)}
                className="flex items-center gap-2.5 text-left group transition-colors"
              >
                {/* Circle toggle */}
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

        {/* Selection summary */}
        {cuisines.length > 0 && (
          <div className="max-w-2xl mx-auto mt-6 flex items-center justify-between px-2">
            <span className="text-[12px] tracking-[1px] uppercase text-black/50">
              {cuisines.length} cuisine{cuisines.length !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={() => setCuisines([])}
              className="text-[12px] tracking-[1px] uppercase text-black/40 hover:text-black transition-colors"
            >
              Clear all
            </button>
          </div>
        )}

        <p className="text-center text-[12px] tracking-[1px] uppercase text-black/40 mt-4">
          Skip for diverse results
        </p>

        {/* Navigation buttons */}
        <div className="flex items-center justify-center gap-4 mt-8 mb-12">
          <button
            onClick={() => router.push('/dietary')}
            className="px-8 py-3 text-[14px] font-medium tracking-[1px] uppercase border-[1.5px] border-black rounded-[30px] bg-transparent text-black hover:bg-black hover:text-white transition-all duration-200 inline-flex items-center gap-2"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            BACK
          </button>
          <button
            onClick={() => router.push('/time')}
            className="px-8 py-3 text-[14px] font-medium tracking-[1px] uppercase border-[1.5px] border-black rounded-[30px] bg-transparent text-black hover:bg-black hover:text-white transition-all duration-200 inline-flex items-center gap-2"
          >
            TIME
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Large brand footer — pinned to bottom */}
      <div className="mt-auto text-center select-none overflow-hidden">
        <span className="font-[family-name:var(--font-brand)] text-[clamp(80px,15vw,225px)] font-normal text-black leading-none tracking-[-0.25px] block">
          GOOD MEALS CO.
        </span>
      </div>
    </div>
  );
}
