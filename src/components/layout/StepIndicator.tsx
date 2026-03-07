'use client';

const STEPS = [
  { label: 'INGREDIENTS', step: 1 },
  { label: 'DIETARY', step: 2 },
  { label: 'CUISINE', step: 3 },
  { label: 'TIME', step: 4 },
  { label: 'RECIPES', step: 5 },
];

export default function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-0 py-6">
      {STEPS.map((s, idx) => (
        <div key={s.step} className="flex items-center">
          <span
            className="text-[8px] sm:text-[10px] font-medium tracking-[1px] uppercase"
            style={{ color: s.step <= currentStep ? '#000' : '#919191' }}
          >
            {s.label}
          </span>
          {idx < STEPS.length - 1 && (
            <span className="mx-2 text-[8px] sm:text-[10px] text-[#919191]">—</span>
          )}
        </div>
      ))}
    </div>
  );
}
