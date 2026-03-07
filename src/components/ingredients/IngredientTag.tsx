'use client';

import { HiOutlineX } from 'react-icons/hi';

interface Props {
  name: string;
  onRemove: () => void;
  isBogus?: boolean;
}

export default function IngredientTag({ name, onRemove, isBogus }: Props) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-[family-name:var(--font-mono-option)] uppercase tracking-[1px] animate-fade-in ${
      isBogus
        ? 'bg-red-50 text-red-600 border-[1.5px] border-red-300'
        : 'bg-white/80 text-black border-[1.5px] border-black/30'
    }`}>
      {name}
      <button onClick={onRemove} className={`rounded-full p-0.5 transition-colors ${isBogus ? 'hover:bg-red-100' : 'hover:bg-black/10'}`} aria-label={`Remove ${name}`}>
        <HiOutlineX className="w-3.5 h-3.5" />
      </button>
    </span>
  );
}
