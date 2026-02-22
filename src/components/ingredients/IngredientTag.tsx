'use client';

import { HiOutlineX } from 'react-icons/hi';

interface Props {
  name: string;
  onRemove: () => void;
  isBogus?: boolean;
}

export default function IngredientTag({ name, onRemove, isBogus }: Props) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium uppercase tracking-wider animate-fade-in ${
      isBogus
        ? 'bg-red-50 text-red-600 border border-red-200'
        : 'bg-white text-neutral-900 border border-neutral-200'
    }`}>
      {name}
      <button onClick={onRemove} className={`rounded-full p-0.5 transition-colors ${isBogus ? 'hover:bg-red-100' : 'hover:bg-neutral-100'}`} aria-label={`Remove ${name}`}>
        <HiOutlineX className="w-3.5 h-3.5" />
      </button>
    </span>
  );
}
