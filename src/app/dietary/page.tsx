'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRecipeFlow } from '@/context/RecipeFlowContext';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import StepIndicator from '@/components/layout/StepIndicator';
import StaggeredPageTitle from '@/components/ui/StaggeredPageTitle';
import { DIETARY_CONDITIONS, DIETARY_CATEGORY_LABELS } from '@/config/dietary-conditions';
import { DietaryCategoryType } from '@/types';
import STEP_THEMES from '@/config/step-themes';

const CATEGORIES: DietaryCategoryType[] = ['allergies', 'intolerances', 'medical', 'religious', 'lifestyle'];
const theme = STEP_THEMES.dietary;

export default function DietaryPage() {
  const router = useRouter();
  const { ingredients, dietaryConditions, setDietaryConditions, toggleDietaryCondition } = useRecipeFlow();
  const { value: savedConditions, setValue: saveDietaryConditions, isLoaded } = useLocalStorage<string[]>('smm-dietary', []);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['allergies']));

  useEffect(() => { if (isLoaded && savedConditions.length > 0 && dietaryConditions.length === 0) setDietaryConditions(savedConditions); }, [isLoaded, savedConditions, dietaryConditions.length, setDietaryConditions]);
  useEffect(() => { if (dietaryConditions.length > 0) saveDietaryConditions(dietaryConditions); }, [dietaryConditions, saveDietaryConditions]);
  useEffect(() => { if (ingredients.length === 0) router.replace('/'); }, [ingredients.length, router]);

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  if (ingredients.length === 0) return null;

  return (
    <div className="min-h-screen">
      {/* Full-bleed pastel gradient background */}
      <div
        className="fixed inset-0 -z-10 animate-radial-glow"
        style={{ background: theme.background }}
      />

      <div className="max-w-3xl mx-auto px-6">
        <StepIndicator currentStep={2} />

        {/* Title — staggered animation */}
        <div className="text-center mb-8">
          <StaggeredPageTitle
            text="dietary preferences."
            className="text-[clamp(36px,5.5vw,67px)] tracking-[-0.25px]"
          />
        </div>

        {/* Accordion sections */}
        <div className="space-y-3 max-w-2xl mx-auto">
          {CATEGORIES.map((cat) => {
            const conditions = DIETARY_CONDITIONS.filter((c) => c.category === cat);
            const selectedCount = conditions.filter((c) => dietaryConditions.includes(c.id)).length;
            const isExpanded = expandedCategories.has(cat);

            return (
              <div
                key={cat}
                className="border-[1.5px] border-black rounded-[30px] overflow-hidden transition-all duration-300"
              >
                {/* Accordion header */}
                <button
                  onClick={() => toggleCategory(cat)}
                  className="w-full flex items-center justify-between px-6 py-5 hover:bg-black/5 transition-colors"
                >
                  <span className="text-[14px] font-medium tracking-[1px] uppercase text-black">
                    {DIETARY_CATEGORY_LABELS[cat]}
                    {selectedCount > 0 && (
                      <span className="ml-2 text-black/40">({selectedCount})</span>
                    )}
                  </span>
                  <span className="text-black text-xl leading-none select-none">
                    {isExpanded ? '\u00D7' : '+'}
                  </span>
                </button>

                {/* Expanded items grid */}
                {isExpanded && (
                  <div className="px-6 pb-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-3">
                    {conditions.map((condition) => {
                      const isSelected = dietaryConditions.includes(condition.id);
                      return (
                        <button
                          key={condition.id}
                          onClick={() => toggleDietaryCondition(condition.id)}
                          className="flex items-center gap-2 text-left group transition-colors"
                        >
                          {/* Circle toggle */}
                          <span
                            className={`w-[10px] h-[10px] rounded-full border-[1.5px] shrink-0 transition-all ${
                              isSelected
                                ? 'bg-black border-black'
                                : 'border-black/40 group-hover:bg-black group-hover:border-black'
                            }`}
                          />
                          <span className="text-[13px] font-[family-name:var(--font-mono-option)] tracking-[0.5px] uppercase text-black leading-tight">
                            {condition.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Selection summary */}
        {dietaryConditions.length > 0 && (
          <div className="max-w-2xl mx-auto mt-4 flex items-center justify-between px-2">
            <span className="text-[12px] tracking-[1px] uppercase text-black/50">
              {dietaryConditions.length} condition{dietaryConditions.length !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={() => { setDietaryConditions([]); saveDietaryConditions([]); }}
              className="text-[12px] tracking-[1px] uppercase text-black/40 hover:text-black transition-colors"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex items-center justify-center gap-4 mt-8 mb-12">
          <button
            onClick={() => router.push('/')}
            className="px-8 py-3 text-[14px] font-medium tracking-[1px] uppercase border-[1.5px] border-black rounded-[30px] bg-transparent text-black hover:bg-black hover:text-white transition-all duration-200 inline-flex items-center gap-2"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            BACK
          </button>
          <button
            onClick={() => router.push('/cuisine')}
            className="px-8 py-3 text-[14px] font-medium tracking-[1px] uppercase border-[1.5px] border-black rounded-[30px] bg-transparent text-black hover:bg-black hover:text-white transition-all duration-200 inline-flex items-center gap-2"
          >
            CUISINES
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
