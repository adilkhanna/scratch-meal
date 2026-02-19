'use client';

import clsx from 'clsx';

const STEPS = [
  { label: 'Ingredients', step: 1 },
  { label: 'Dietary', step: 2 },
  { label: 'Time', step: 3 },
  { label: 'Recipes', step: 4 },
];

export default function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-2 py-6">
      {STEPS.map((s, idx) => (
        <div key={s.step} className="flex items-center gap-2">
          <div className="flex flex-col items-center gap-1">
            <div
              className={clsx(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all',
                s.step < currentStep && 'bg-green-500/80 text-white',
                s.step === currentStep && 'bg-amber-500 text-white shadow-[0_0_12px_rgba(245,158,11,0.4)]',
                s.step > currentStep && 'bg-white/[0.08] text-[#666]'
              )}
            >
              {s.step < currentStep ? '✓' : s.step}
            </div>
            <span
              className={clsx(
                'text-xs font-medium',
                s.step <= currentStep ? 'text-[#f5f5f5]' : 'text-[#666]'
              )}
            >
              {s.label}
            </span>
          </div>
          {idx < STEPS.length - 1 && (
            <div
              className={clsx(
                'w-8 sm:w-12 h-0.5 mb-5',
                s.step < currentStep ? 'bg-green-500/60' : 'bg-white/[0.1]'
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
