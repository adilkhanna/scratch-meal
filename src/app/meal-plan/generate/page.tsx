'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMealPlanFlow } from '@/context/MealPlanFlowContext';
import { useAuth } from '@/context/AuthContext';
import { generateWeeklyPlan } from '@/lib/firebase-functions';
import { saveGeneratedPlan } from '@/lib/weekly-plan-storage';
import MomoLoader from '@/components/ui/MomoLoader';
import STEP_THEMES from '@/config/step-themes';

const theme = STEP_THEMES.mealplan;

const PROGRESS_MESSAGES = [
  'Checking your recipe glossary...',
  'Finding the best recipes for your ingredients...',
  'Planning your breakfasts...',
  'Crafting lunch menus...',
  'Designing dinner spreads...',
  'Estimating costs...',
  'Assembling your meal plan...',
  'Almost there...',
];

export default function MealPlanGeneratePage() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    ingredients, dietaryConditions, familySize,
    lunchCuisines, dinnerCuisines, weeklyBudget,
    breakfastPreferences,
  } = useMealPlanFlow();

  const [progressIdx, setProgressIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const hasStarted = useRef(false);

  // Cycle through progress messages
  useEffect(() => {
    if (error) return;
    const timer = setInterval(() => {
      setProgressIdx((prev) =>
        prev < PROGRESS_MESSAGES.length - 1 ? prev + 1 : prev
      );
    }, 8000);
    return () => clearInterval(timer);
  }, [error]);

  // Trigger generation once
  useEffect(() => {
    if (hasStarted.current) return;
    if (ingredients.length === 0) { router.replace('/meal-plan'); return; }
    if (!user) { router.replace('/login'); return; }
    hasStarted.current = true;

    (async () => {
      try {
        const { plan } = await generateWeeklyPlan(
          ingredients,
          dietaryConditions,
          familySize,
          lunchCuisines,
          dinnerCuisines,
          weeklyBudget,
          breakfastPreferences,
          3 // planDays: 3-day test phase
        );

        // Save to Firestore
        await saveGeneratedPlan(user.uid, plan);

        // Navigate to view page
        router.replace(`/meal-plan/view?id=${plan.id}`);
      } catch (err) {
        console.error('Meal plan generation failed:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to generate meal plan. Please try again.'
        );
      }
    })();
  }, [ingredients, dietaryConditions, familySize, lunchCuisines, dinnerCuisines, weeklyBudget, breakfastPreferences, user, router]);

  if (ingredients.length === 0) return null;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center animate-radial-glow"
      style={{ background: theme.background, backgroundSize: '200% 200%' }}
    >
      {error ? (
        <div className="max-w-md mx-auto text-center px-6 space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full border-[1.5px] border-red-400 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgb(248,113,113)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <p className="text-[14px] font-[family-name:var(--font-mono-option)] tracking-[0.5px] uppercase text-red-600">
            {error}
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => router.push('/meal-plan/cuisine')}
              className="px-6 py-3 text-[14px] font-medium tracking-[1px] uppercase border-[1.5px] border-black rounded-[30px] bg-transparent text-black hover:bg-black hover:text-white transition-all duration-200"
            >
              GO BACK
            </button>
            <button
              onClick={() => {
                setError(null);
                setProgressIdx(0);
                hasStarted.current = false;
              }}
              className="px-6 py-3 text-[14px] font-medium tracking-[1px] uppercase border-[1.5px] border-black rounded-[30px] bg-transparent text-black hover:bg-black hover:text-white transition-all duration-200"
            >
              RETRY
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center px-6 space-y-8">
          <MomoLoader size={160} />
          <div className="space-y-2">
            <p className="text-[14px] font-medium tracking-[1px] uppercase text-black animate-pulse">
              Generating your meal plan
            </p>
            <p className="text-[12px] font-[family-name:var(--font-mono-option)] tracking-[0.5px] uppercase text-black/40 transition-all duration-500">
              {PROGRESS_MESSAGES[progressIdx]}
            </p>
          </div>
          <p className="text-[11px] tracking-[0.5px] uppercase text-black/30">
            This may take up to a minute
          </p>
        </div>
      )}
    </div>
  );
}
