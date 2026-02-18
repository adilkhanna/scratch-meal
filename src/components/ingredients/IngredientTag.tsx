'use client';

import { HiOutlineX } from 'react-icons/hi';

interface Props {
  name: string;
  onRemove: () => void;
}

export default function IngredientTag({ name, onRemove }: Props) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 text-orange-800 rounded-full text-sm font-medium animate-fade-in">
      {name}
      <button
        onClick={onRemove}
        className="hover:bg-orange-200 rounded-full p-0.5 transition-colors"
        aria-label={`Remove ${name}`}
      >
        <HiOutlineX className="w-3.5 h-3.5" />
      </button>
    </span>
  );
}
