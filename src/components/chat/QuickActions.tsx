'use client';

interface Props {
  onAction: (message: string) => void;
  disabled?: boolean;
}

const ACTIONS = [
  { label: 'Upload a photo', message: '', isPhoto: true },
  { label: 'Quick 15-min meal', message: "What can I make in 15 minutes?" },
  { label: 'Chicken & rice', message: "I have chicken and rice, about 30 minutes" },
  { label: 'Something vegetarian', message: "I want something vegetarian and easy" },
];

export default function QuickActions({ onAction, disabled }: Props) {
  return (
    <div className="flex flex-wrap gap-2 justify-center px-4">
      {ACTIONS.filter((a) => !a.isPhoto).map((action) => (
        <button
          key={action.label}
          onClick={() => onAction(action.message)}
          disabled={disabled}
          className="px-4 py-2 border border-[#0059FF]/30 text-[#0059FF] rounded-full text-xs font-medium uppercase tracking-wider hover:bg-[#0059FF] hover:text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
