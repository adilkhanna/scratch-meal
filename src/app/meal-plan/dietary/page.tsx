'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMealPlanFlow } from '@/context/MealPlanFlowContext';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import StepIndicator from '@/components/layout/StepIndicator';
import StaggeredPageTitle from '@/components/ui/StaggeredPageTitle';
import { DIETARY_CONDITIONS, DIETARY_CATEGORY_LABELS } from '@/config/dietary-conditions';
import { DietaryCategoryType } from '@/types';
import STEP_THEMES from '@/config/step-themes';

const CATEGORIES: DietaryCategoryType[] = ['allergies', 'intolerances', 'medical', 'religious', 'lifestyle'];
const theme = STEP_THEMES.mealplan;

export default function MealPlanDietaryPage() {
  const router = useRouter();
  const {
    dietaryConditions, setDietaryConditions,
    memberDietaryConditions, toggleMemberDietaryCondition, setMemberDietaryConditions,
    familySize, breakfastPreferences,
  } = useMealPlanFlow();
  const { value: savedConditions, setValue: saveDietaryConditions, isLoaded } = useLocalStorage<string[]>('smm-mealplan-dietary', []);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['allergies']));

  // Get member names
  const isFamily = familySize > 1;
  const memberNames = isFamily
    ? (breakfastPreferences.length > 0
      ? breakfastPreferences.map((p) => p.memberName)
      : Array.from({ length: familySize }, (_, i) => `Person ${i + 1}`))
    : [];

  // Active member tab (for family mode)
  const [activeMember, setActiveMember] = useState<string>(memberNames[0] || '');

  // Sync member tab when names change
  useEffect(() => {
    if (isFamily && memberNames.length > 0 && !memberNames.includes(activeMember)) {
      setActiveMember(memberNames[0]);
    }
  }, [isFamily, memberNames, activeMember]);

  // Load saved conditions (legacy: single set)
  useEffect(() => {
    if (isLoaded && savedConditions.length > 0 && dietaryConditions.length === 0) {
      setDietaryConditions(savedConditions);
    }
  }, [isLoaded, savedConditions, dietaryConditions.length, setDietaryConditions]);

  // Save when conditions change
  useEffect(() => {
    if (dietaryConditions.length > 0) saveDietaryConditions(dietaryConditions);
  }, [dietaryConditions, saveDietaryConditions]);

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  // Get conditions for the active member (or global for single person)
  const activeConditions = isFamily
    ? (memberDietaryConditions[activeMember] || [])
    : dietaryConditions;

  const handleToggle = (conditionId: string) => {
    if (isFamily) {
      toggleMemberDietaryCondition(activeMember, conditionId);
    } else {
      // Single person: use global toggle
      const updated = dietaryConditions.includes(conditionId)
        ? dietaryConditions.filter((c) => c !== conditionId)
        : [...dietaryConditions, conditionId];
      setDietaryConditions(updated);
    }
  };

  const handleClearAll = () => {
    if (isFamily) {
      setMemberDietaryConditions({ ...memberDietaryConditions, [activeMember]: [] });
    } else {
      setDietaryConditions([]);
      saveDietaryConditions([]);
    }
  };

  // Copy conditions from one member to another
  const handleCopyFrom = (fromMember: string) => {
    const fromConditions = memberDietaryConditions[fromMember] || [];
    setMemberDietaryConditions({
      ...memberDietaryConditions,
      [activeMember]: [...fromConditions],
    });
  };

  return (
    <div
      className="min-h-screen flex flex-col animate-radial-glow"
      style={{ background: theme.background, backgroundSize: '200% 200%' }}
    >
      <div className="max-w-3xl mx-auto px-6 pt-16">
        <StepIndicator currentStep={2} variant="meal-plan" />

        <div className="text-center mb-8">
          <StaggeredPageTitle
            text="dietary preferences."
            className="text-[clamp(36px,5.5vw,67px)] tracking-[-0.25px]"
          />
        </div>

        {/* Per-member tabs (family mode) */}
        {isFamily && (
          <div className="max-w-2xl mx-auto mb-6">
            <p className="text-center text-[12px] tracking-[1px] uppercase text-black/50 mb-3">
              Set conditions per family member
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {memberNames.map((name) => {
                const count = (memberDietaryConditions[name] || []).length;
                return (
                  <button
                    key={name}
                    onClick={() => setActiveMember(name)}
                    className={`px-4 py-2 rounded-full text-[12px] font-[family-name:var(--font-mono-option)] tracking-[0.5px] uppercase border-[1.5px] transition-all ${
                      activeMember === name
                        ? 'bg-black text-white border-black'
                        : 'bg-transparent text-black border-black/20 hover:border-black'
                    }`}
                  >
                    {name}
                    {count > 0 && <span className="ml-1 opacity-60">({count})</span>}
                  </button>
                );
              })}
            </div>
            {/* Copy from another member */}
            {memberNames.length > 1 && (
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {memberNames
                  .filter((n) => n !== activeMember && (memberDietaryConditions[n] || []).length > 0)
                  .map((name) => (
                    <button
                      key={name}
                      onClick={() => handleCopyFrom(name)}
                      className="text-[11px] tracking-[0.5px] uppercase text-black/40 hover:text-black transition-colors"
                    >
                      Copy from {name}
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Accordion sections */}
        <div className="space-y-3 max-w-2xl mx-auto">
          {CATEGORIES.map((cat) => {
            const conditions = DIETARY_CONDITIONS.filter((c) => c.category === cat);
            const selectedCount = conditions.filter((c) => activeConditions.includes(c.id)).length;
            const isExpanded = expandedCategories.has(cat);

            return (
              <div key={cat} className="glass-panel transition-all duration-300">
                <button
                  onClick={() => toggleCategory(cat)}
                  className="w-full flex items-center justify-between px-6 py-5 hover:bg-white/10 transition-colors rounded-[30px]"
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

                {isExpanded && (
                  <div className="px-6 pb-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-3">
                    {conditions.map((condition) => {
                      const isSelected = activeConditions.includes(condition.id);
                      return (
                        <button
                          key={condition.id}
                          onClick={() => handleToggle(condition.id)}
                          className="flex items-center gap-2 text-left group transition-colors"
                        >
                          <span
                            className={`w-[10px] h-[10px] rounded-full border-[1.5px] shrink-0 transition-all ${
                              isSelected
                                ? 'bg-black border-black'
                                : 'border-black/40 group-hover:bg-black group-hover:border-black'
                            }`}
                          />
                          <span className="text-[14px] font-[family-name:var(--font-mono-option)] tracking-[0.5px] uppercase text-black leading-tight">
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
        {activeConditions.length > 0 && (
          <div className="max-w-2xl mx-auto mt-4 flex items-center justify-between px-2">
            <span className="text-[12px] tracking-[1px] uppercase text-black/50">
              {activeConditions.length} condition{activeConditions.length !== 1 ? 's' : ''} for {isFamily ? activeMember : 'you'}
            </span>
            <button
              onClick={handleClearAll}
              className="text-[12px] tracking-[1px] uppercase text-black/40 hover:text-black transition-colors"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-center gap-4 mt-8 mb-12">
          <button
            onClick={() => router.push('/meal-plan')}
            className="px-8 py-3 text-[14px] font-medium tracking-[1px] uppercase border-[1.5px] border-black rounded-[30px] bg-transparent text-black hover:bg-black hover:text-white transition-all duration-200 inline-flex items-center gap-2"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            BACK
          </button>
          <button
            onClick={() => router.push('/meal-plan/cuisine')}
            className="px-8 py-3 text-[14px] font-medium tracking-[1px] uppercase border-[1.5px] border-black rounded-[30px] bg-transparent text-black hover:bg-black hover:text-white transition-all duration-200 inline-flex items-center gap-2"
          >
            CUISINES
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Brand footer */}
      <div className="mt-auto text-center select-none overflow-hidden">
        <span className="font-[family-name:var(--font-brand)] text-[clamp(80px,15vw,225px)] font-normal text-black leading-none tracking-[-0.25px] block">
          GOOD MEALS CO.
        </span>
      </div>
    </div>
  );
}
