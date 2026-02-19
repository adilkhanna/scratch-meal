'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRecipeFlow } from '@/context/RecipeFlowContext';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import StepIndicator from '@/components/layout/StepIndicator';
import { DIETARY_CONDITIONS, DIETARY_CATEGORY_LABELS, DIETARY_CATEGORY_ICONS } from '@/config/dietary-conditions';
import { DietaryCategoryType } from '@/types';
import clsx from 'clsx';
import { HiChevronDown } from 'react-icons/hi';

const CATEGORIES: DietaryCategoryType[] = ['allergies', 'intolerances', 'medical', 'religious', 'lifestyle'];

export default function DietaryPage() {
  const router = useRouter();
  const { ingredients, dietaryConditions, setDietaryConditions, toggleDietaryCondition } = useRecipeFlow();
  const { value: savedConditions, setValue: saveDietaryConditions, isLoaded } = useLocalStorage<string[]>('smm-dietary', []);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['allergies', 'lifestyle']));

  useEffect(() => { if (isLoaded && savedConditions.length > 0 && dietaryConditions.length === 0) setDietaryConditions(savedConditions); }, [isLoaded, savedConditions, dietaryConditions.length, setDietaryConditions]);
  useEffect(() => { if (dietaryConditions.length > 0) saveDietaryConditions(dietaryConditions); }, [dietaryConditions, saveDietaryConditions]);
  useEffect(() => { if (ingredients.length === 0) router.replace('/'); }, [ingredients.length, router]);

  const toggleCategory = (cat: string) => { setExpandedCategories((prev) => { const next = new Set(prev); if (next.has(cat)) next.delete(cat); else next.add(cat); return next; }); };

  if (ingredients.length === 0) return null;

  return (
    <div className="animate-fade-in">
      <StepIndicator currentStep={2} />
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#2d2d2a] font-[family-name:var(--font-serif)] mb-1">Dietary Preferences</h1>
          <p className="text-[#7a7568] text-sm">Select any conditions that apply. These will be saved for future use.</p>
        </div>
        {dietaryConditions.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-olive-50 border border-olive-200 rounded-lg">
            <span className="text-sm font-medium text-olive-700">{dietaryConditions.length} selected</span>
            <button onClick={() => { setDietaryConditions([]); saveDietaryConditions([]); }} className="text-xs text-olive-500 hover:text-olive-700 underline ml-auto">Clear all</button>
          </div>
        )}
        <div className="space-y-3">
          {CATEGORIES.map((cat) => {
            const conditions = DIETARY_CONDITIONS.filter((c) => c.category === cat);
            const selectedCount = conditions.filter((c) => dietaryConditions.includes(c.id)).length;
            const isExpanded = expandedCategories.has(cat);
            return (
              <div key={cat} className="border border-cream-200 rounded-xl overflow-hidden bg-white">
                <button onClick={() => toggleCategory(cat)} className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-cream-50 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{DIETARY_CATEGORY_ICONS[cat]}</span>
                    <span className="font-semibold text-sm text-[#2d2d2a]">{DIETARY_CATEGORY_LABELS[cat]}</span>
                    {selectedCount > 0 && <span className="bg-olive-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">{selectedCount}</span>}
                  </div>
                  <HiChevronDown className={clsx('w-5 h-5 text-[#a89f94] transition-transform', isExpanded && 'rotate-180')} />
                </button>
                {isExpanded && (
                  <div className="px-4 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {conditions.map((condition) => {
                      const isSelected = dietaryConditions.includes(condition.id);
                      return (
                        <button key={condition.id} onClick={() => toggleDietaryCondition(condition.id)}
                          className={clsx('flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all text-sm', isSelected ? 'bg-olive-50 ring-1 ring-olive-300' : 'hover:bg-cream-50')}>
                          <div className={clsx('mt-0.5 w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors', isSelected ? 'bg-olive-600 border-olive-600' : 'border-cream-300')}>
                            {isSelected && <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 12 12"><path d="M10 3L4.5 8.5 2 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                          </div>
                          <div>
                            <div className={clsx('font-medium', isSelected ? 'text-olive-800' : 'text-[#5a5347]')}>{condition.label}</div>
                            <div className="text-xs text-[#a89f94] mt-0.5 leading-relaxed">{condition.description}</div>
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
          <button onClick={() => router.push('/')} className="flex-1 py-3.5 border border-cream-200 text-[#7a7568] rounded-xl font-semibold text-sm hover:bg-cream-50 transition-colors">Back</button>
          <button onClick={() => router.push('/time')} className="flex-[2] py-3.5 bg-olive-600 text-white rounded-xl font-semibold text-sm hover:bg-olive-700 transition-colors">Next: Cooking Time</button>
        </div>
      </div>
    </div>
  );
}
