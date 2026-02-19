'use client';

import { HiOutlineX } from 'react-icons/hi';

interface Props {
  name: string;
  onRemove: () => void;
}

export default function IngredientTag({ name, onRemove }: Props) {
  return (
    <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-white text-neutral-900 border border-neutral-200 rounded-full text-xs font-medium uppercase tracking-wider animate-fade-in">
      {name}
      <button onClick={onRemove} className="hover:bg-neutral-100 rounded-full p-0.5 transition-colors" aria-label={`Remove ${name}`}>
        <HiOutlineX className="w-3.5 h-3.5" />
      </button>
    </span>
  );
}
