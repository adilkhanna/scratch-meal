'use client';

const QUICK_RECIPE_STEPS = [
  { label: 'INGREDIENTS', step: 1 },
  { label: 'DIETARY', step: 2 },
  { label: 'CUISINE', step: 3 },
  { label: 'TIME', step: 4 },
  { label: 'RECIPES', step: 5 },
];

const MEAL_PLAN_STEPS = [
  { label: 'SETUP', step: 1 },
  { label: 'DIETARY', step: 2 },
  { label: 'CUISINE', step: 3 },
  { label: 'GENERATE', step: 4 },
];

interface StepIndicatorProps {
  currentStep: number;
  variant?: 'quick-recipe' | 'meal-plan';
}

export default function StepIndicator({ currentStep, variant = 'quick-recipe' }: StepIndicatorProps) {
  const steps = variant === 'meal-plan' ? MEAL_PLAN_STEPS : QUICK_RECIPE_STEPS;

  return (
    <div className="flex items-center justify-center gap-0 py-6">
      {steps.map((s, idx) => (
        <div key={s.step} className="flex items-center">
          <span
            className="text-[8px] sm:text-[10px] font-medium tracking-[1px] uppercase"
            style={{ color: s.step <= currentStep ? '#000' : '#919191' }}
          >
            {s.label}
          </span>
          {idx < steps.length - 1 && (
            <span className="mx-2 text-[8px] sm:text-[10px] text-[#919191]">—</span>
          )}
        </div>
      ))}
    </div>
  );
}
