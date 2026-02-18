'use client';

import { useState, KeyboardEvent } from 'react';
import { HiPlus } from 'react-icons/hi';

interface Props {
  onAdd: (ingredient: string) => void;
}

export default function IngredientInput({ onAdd }: Props) {
  const [value, setValue] = useState('');

  const handleSubmit = () => {
    const items = value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    items.forEach(onAdd);
    setValue('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type ingredients (comma-separated)..."
        className="flex-1 px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-800
                   placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-400
                   focus:border-transparent text-sm"
      />
      <button
        onClick={handleSubmit}
        disabled={!value.trim()}
        className="px-4 py-3 bg-orange-500 text-white rounded-xl font-medium text-sm
                   hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed
                   transition-colors flex items-center gap-1"
      >
        <HiPlus className="w-4 h-4" />
        Add
      </button>
    </div>
  );
}
