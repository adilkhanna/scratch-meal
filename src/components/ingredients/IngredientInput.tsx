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
        className="flex-1 px-4 py-3 rounded-xl border border-cream-200 bg-white text-[#2d2d2a] placeholder:text-[#a89f94] focus:outline-none focus:ring-2 focus:ring-olive-500/30 focus:border-olive-400 text-sm transition-all"
      />
      <button
        onClick={handleSubmit}
        disabled={!value.trim()}
        className="px-4 py-3 bg-olive-600 text-white rounded-xl font-medium text-sm hover:bg-olive-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
      >
        <HiPlus className="w-4 h-4" />
        Add
      </button>
    </div>
  );
}
