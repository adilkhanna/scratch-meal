'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRecipeFlow } from '@/context/RecipeFlowContext';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import StepIndicator from '@/components/layout/StepIndicator';
import {
  DIETARY_CONDITIONS,
  DIETARY_CATEGORY_LABELS,
  DIETARY_CATEGORY_ICONS,
} from '@/config/dietary-conditions';
import { DietaryCategoryType } from '@/types';
import clsx from 'clsx';
import { HiChevronDown } from 'react-icons/hi';

const CATEGORIES: DietaryCategoryType[] = [
  'allergies',
  'intolerances',
  'medical',
  'religious',
  'lifestyle',
];

export default function DietaryPage() {
  const router = useRouter();
  const { ingredients, dietaryConditions, setDietaryConditions, toggleDietaryCondition } =
    useRecipeFlow();
  const { value: savedConditions, setValue: saveDietaryConditions, isLoaded } =
    useLocalStorage<string[]>('smm-dietary', []);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['allergies', 'lifestyle'])
  );

  // Load saved dietary conditions on mount
  useEffect(() => {
    if (isLoaded && savedConditions.length > 0 && dietaryConditions.length === 0) {
      setDietaryConditions(savedConditions);
    }
  }, [isLoaded, savedConditions, dietaryConditions.length, setDietaryConditions]);

  // Save to localStorage whenever conditions change
  useEffect(() => {
    if (dietaryConditions.length > 0) {
      saveDietaryConditions(dietaryConditions);
    }
  }, [dietaryConditions, saveDietaryConditions]);

  // Redirect if no ingredients
  useEffect(() => {
    if (ingredients.length === 0) {
      router.replace('/');
    }
  }, [ingredients.length, router]);

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
    <div className="animate-fade-in">
      <StepIndicator currentStep={2} />

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#f5f5f5] font-[family-name:var(--font-serif)] mb-1">
            Dietary Preferences
          </h1>
          <p className="text-[#a0a0a0] text-sm">
            Select any conditions that apply. These will be saved for future use.
          </p>
        </div>

        {dietaryConditions.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <span className="text-sm font-medium text-amber-300">
              {dietaryConditions.length} selected
            </span>
            <button
              onClick={() => {
                setDietaryConditions([]);
                saveDietaryConditions([]);
              }}
              className="text-xs text-amber-500/70 hover:text-amber-400 underline ml-auto"
            >
              Clear all
            </button>
          </div>
        )}

        <div className="space-y-3">
          {CATEGORIES.map((cat) => {
            const conditions = DIETARY_CONDITIONS.filter((c) => c.category === cat);
            const selectedCount = conditions.filter((c) =>
              dietaryConditions.includes(c.id)
            ).length;
            const isExpanded = expandedCategories.has(cat);

            return (
              <div
                key={cat}
                className="border border-white/[0.08] rounded-xl overflow-hidden bg-white/[0.05] backdrop-blur-sm"
              >
                <button
                  onClick={() => toggleCategory(cat)}
                  className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.03] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{DIETARY_CATEGORY_ICONS[cat]}</span>
                    <span className="font-semibold text-sm text-[#d4d4d4]">
                      {DIETARY_CATEGORY_LABELS[cat]}
                    </span>
                    {selectedCount > 0 && (
                      <span className="bg-amber-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        {selectedCount}
                      </span>
                    )}
                  </div>
                  <HiChevronDown
                    className={clsx(
                      'w-5 h-5 text-[#666] transition-transform',
                      isExpanded && 'rotate-180'
                    )}
                  />
                </button>

                {isExpanded && (
                  <div className="px-4 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {conditions.map((condition) => {
                      const isSelected = dietaryConditions.includes(condition.id);
                      return (
                        <button
                          key={condition.id}
                          onClick={() => toggleDietaryCondition(condition.id)}
                          className={clsx(
                            'flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all text-sm',
                            isSelected
                              ? 'bg-amber-500/15 ring-1 ring-amber-500/30'
                              : 'hover:bg-white/[0.05]'
                          )}
                        >
                          <div
                            className={clsx(
                              'mt-0.5 w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors',
                              isSelected
                                ? 'bg-amber-600 border-amber-600'
                                : 'border-[#666]'
                            )}
                          >
                            {isSelected && (
                              <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 12 12">
                                <path d="M10 3L4.5 8.5 2 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>
                          <div>
                            <div className={clsx('font-medium', isSelected ? 'text-amber-300' : 'text-[#d4d4d4]')}>
                              {condition.label}
                            </div>
                            <div className="text-xs text-[#666] mt-0.5 leading-relaxed">
                              {condition.description}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => router.push('/')}
            className="flex-1 py-3.5 border border-white/[0.1] text-[#a0a0a0] rounded-xl font-semibold text-sm
                       hover:bg-white/[0.05] transition-all"
          >
            Back
          </button>
          <button
            onClick={() => router.push('/time')}
            className="flex-[2] py-3.5 bg-amber-600 text-white rounded-xl font-semibold text-sm
                       hover:bg-amber-500 transition-all shadow-[0_0_20px_rgba(245,158,11,0.15)]"
          >
            Next: Cooking Time
          </button>
        </div>
      </div>
    </div>
  );
}
