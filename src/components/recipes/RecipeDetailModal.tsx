'use client';

import { useEffect } from 'react';
import { Recipe } from '@/types';
import { HiX, HiClock, HiLightningBolt } from 'react-icons/hi';
import clsx from 'clsx';

const DIFFICULTY_COLORS = {
  Easy: 'bg-green-50 text-green-700 border border-green-100',
  Medium: 'bg-neutral-50 text-neutral-700 border border-neutral-200',
  Hard: 'bg-red-50 text-red-700 border border-red-100',
};

interface Props {
  recipe: Recipe;
  onClose: () => void;
}

export default function RecipeDetailModal({ recipe, onClose }: Props) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 animate-fade-in" />

      {/* Modal */}
      <div
        className="relative max-w-lg w-full max-h-[85vh] overflow-y-auto bg-white rounded-2xl border border-neutral-200 p-5 space-y-5 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-1.5 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100/80 rounded-lg transition-colors"
        >
          <HiX className="w-5 h-5" />
        </button>

        {/* Hero image */}
        {recipe.imageUrl && (
          <div className="-mx-5 -mt-5 mb-0 rounded-t-2xl overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={recipe.imageUrl} alt={recipe.name} className="w-full h-48 object-cover" loading="lazy" />
          </div>
        )}

        {/* Header */}
        <div className="pr-8">
          <h2 className="font-bold text-neutral-900 text-lg">{recipe.name}</h2>
          {recipe.description && (
            <p className="text-sm text-neutral-500 mt-1 font-light">{recipe.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2.5 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-neutral-400">
              <HiClock className="w-3.5 h-3.5" />{recipe.cookTime}
            </span>
            <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full', DIFFICULTY_COLORS[recipe.difficulty])}>
              {recipe.difficulty}
            </span>
            {recipe.estimatedCostPerServing != null && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-neutral-50 text-neutral-500 border border-neutral-200">
                Est. ~{'\u20B9'}{recipe.estimatedCostPerServing}/serving
              </span>
            )}
            {recipe.rating > 0 && (
              <span className="text-xs text-neutral-400">⭐ {recipe.rating}/5</span>
            )}
          </div>
        </div>

        {/* Ingredients */}
        <div>
          <h4 className="font-semibold text-sm text-neutral-900 mb-2 flex items-center gap-1.5">
            <HiLightningBolt className="w-4 h-4 text-neutral-500" />Ingredients
          </h4>
          <ul className="space-y-1.5">
            {recipe.ingredients.map((ing, i) => (
              <li key={i} className="text-sm text-neutral-500 flex items-baseline gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 shrink-0 mt-1.5" />
                <span>
                  <span className="font-medium text-neutral-900">{ing.quantity}{ing.unit ? ` ${ing.unit}` : ''}</span> {ing.name}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Instructions */}
        <div>
          <h4 className="font-semibold text-sm text-neutral-900 mb-2">Instructions</h4>
          <ol className="space-y-2">
            {recipe.instructions.map((step, i) => (
              <li key={i} className="text-sm text-neutral-500 flex gap-3">
                <span className="bg-neutral-900 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Tips */}
        {recipe.tips?.length > 0 && (
          <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3">
            <h4 className="font-semibold text-sm text-neutral-900 mb-1.5">Tips</h4>
            <ul className="space-y-1">
              {recipe.tips.map((tip, i) => (<li key={i} className="text-xs text-neutral-600">- {tip}</li>))}
            </ul>
          </div>
        )}

        {/* Nutrition */}
        {recipe.nutritionInfo && (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {[
              { label: 'Serves', value: recipe.nutritionInfo.servings },
              { label: 'Calories', value: recipe.nutritionInfo.calories },
              { label: 'Protein', value: recipe.nutritionInfo.protein },
              { label: 'Carbs', value: recipe.nutritionInfo.carbs },
              { label: 'Fat', value: recipe.nutritionInfo.fat },
            ].map((item) => (
              <div key={item.label} className="text-center p-2 bg-neutral-50 rounded-xl border border-neutral-200">
                <div className="text-xs text-neutral-400">{item.label}</div>
                <div className="text-sm font-semibold text-neutral-900">{item.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
