'use client';

import { useState, KeyboardEvent } from 'react';
import { HiPlus } from 'react-icons/hi';

interface Props {
  onAdd: (ingredient: string) => void;
}

export default function IngredientInput({ onAdd }: Props) {
  const [value, setValue] = useState('');

  const handleSubmit = () => {
    const items = value.split(',').map((s) => s.trim()).filter(Boolean);
    items.forEach(onAdd);
    setValue('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); }
  };

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type ingredients (comma-separated)..."
        className="flex-1 px-6 py-3.5 rounded-full border border-neutral-200 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400 text-sm font-light tracking-wide transition-all"
      />
      <button
        onClick={handleSubmit}
        disabled={!value.trim()}
        className="px-6 py-3.5 bg-neutral-900 text-white rounded-full font-medium text-xs uppercase tracking-widest hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
      >
        <HiPlus className="w-4 h-4" />
        Add
      </button>
    </div>
  );
}
