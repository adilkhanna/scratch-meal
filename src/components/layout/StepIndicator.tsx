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
    <div className="flex items-center justify-center gap-0 py-8">
      {STEPS.map((s, idx) => (
        <div key={s.step} className="flex items-center">
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={clsx(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all',
                s.step < currentStep && 'bg-neutral-900 text-white',
                s.step === currentStep && 'bg-neutral-900 text-white',
                s.step > currentStep && 'border-2 border-neutral-300 text-neutral-400 bg-transparent'
              )}
            >
              {s.step < currentStep ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                s.step
              )}
            </div>
            <span
              className={clsx(
                'text-[10px] font-medium tracking-wider uppercase',
                s.step <= currentStep ? 'text-neutral-900' : 'text-neutral-400'
              )}
            >
              {s.label}
            </span>
          </div>
          {idx < STEPS.length - 1 && (
            <div
              className={clsx(
                'w-10 sm:w-16 h-px mb-5 mx-1',
                s.step < currentStep ? 'bg-neutral-900' : 'bg-neutral-300'
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
