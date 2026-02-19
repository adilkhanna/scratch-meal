'use client';

import { useState } from 'react';
import { Recipe } from '@/types';
import StarRating from './StarRating';
import HeartButton from './HeartButton';
import clsx from 'clsx';
import { HiChevronDown, HiClock, HiLightningBolt } from 'react-icons/hi';

interface Props {
  recipe: Recipe;
  onRate: (rating: number) => void;
  onToggleFavorite: () => void;
}

const DIFFICULTY_COLORS = {
  Easy: 'bg-green-500/15 text-green-400 border border-green-500/20',
  Medium: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
  Hard: 'bg-red-500/15 text-red-400 border border-red-500/20',
};

export default function RecipeCard({ recipe, onRate, onToggleFavorite }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-white/[0.08] rounded-2xl bg-white/[0.05] backdrop-blur-sm overflow-hidden animate-slide-up hover:border-white/[0.12] transition-all">
      <div
        onClick={() => setExpanded(!expanded)}
        className="p-4 cursor-pointer hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-[#f5f5f5] text-base">{recipe.name}</h3>
            <p className="text-sm text-[#a0a0a0] mt-1 line-clamp-2">{recipe.description}</p>
            <div className="flex items-center gap-3 mt-2.5 flex-wrap">
              <span className="flex items-center gap-1 text-xs text-[#666]">
                <HiClock className="w-3.5 h-3.5" />
                {recipe.cookTime}
              </span>
              <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full', DIFFICULTY_COLORS[recipe.difficulty])}>
                {recipe.difficulty}
              </span>
              <div className="flex gap-1 flex-wrap">
                {recipe.keyIngredients.slice(0, 3).map((ing) => (
                  <span key={ing} className="text-xs bg-white/[0.08] text-[#a0a0a0] px-2 py-0.5 rounded-full">{ing}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <HeartButton isFavorite={recipe.isFavorite} onToggle={onToggleFavorite} />
            <HiChevronDown className={clsx('w-5 h-5 text-[#666] transition-transform', expanded && 'rotate-180')} />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <StarRating rating={recipe.rating} onRate={onRate} size="sm" />
          {recipe.rating > 0 && <span className="text-xs text-[#666]">{recipe.rating}/5</span>}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/[0.06] p-4 space-y-5 animate-fade-in">
          <div>
            <h4 className="font-semibold text-sm text-[#f5f5f5] mb-2 flex items-center gap-1.5">
              <HiLightningBolt className="w-4 h-4 text-amber-500" />
              Ingredients
            </h4>
            <ul className="space-y-1.5">
              {recipe.ingredients.map((ing, i) => (
                <li key={i} className="text-sm text-[#a0a0a0] flex items-baseline gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500/60 shrink-0 mt-1.5" />
                  <span>
                    <span className="font-medium text-[#d4d4d4]">{ing.quantity}{ing.unit ? ` ${ing.unit}` : ''}</span>{' '}
                    {ing.name}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm text-[#f5f5f5] mb-2">Instructions</h4>
            <ol className="space-y-2">
              {recipe.instructions.map((step, i) => (
                <li key={i} className="text-sm text-[#a0a0a0] flex gap-3">
                  <span className="bg-amber-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
          {recipe.tips?.length > 0 && (
            <div className="bg-amber-500/[0.08] border border-amber-500/15 rounded-xl p-3">
              <h4 className="font-semibold text-sm text-amber-300 mb-1.5">Tips</h4>
              <ul className="space-y-1">
                {recipe.tips.map((tip, i) => (
                  <li key={i} className="text-xs text-amber-400">- {tip}</li>
                ))}
              </ul>
            </div>
          )}
          {recipe.nutritionInfo && (
            <div className="grid grid-cols-5 gap-2">
              {[
                { label: 'Serves', value: recipe.nutritionInfo.servings },
                { label: 'Calories', value: recipe.nutritionInfo.calories },
                { label: 'Protein', value: recipe.nutritionInfo.protein },
                { label: 'Carbs', value: recipe.nutritionInfo.carbs },
                { label: 'Fat', value: recipe.nutritionInfo.fat },
              ].map((item) => (
                <div key={item.label} className="text-center p-2 bg-white/[0.05] rounded-xl">
                  <div className="text-xs text-[#666]">{item.label}</div>
                  <div className="text-sm font-semibold text-[#f5f5f5]">{item.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
