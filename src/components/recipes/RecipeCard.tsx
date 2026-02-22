'use client';

import { useState } from 'react';
import { Recipe } from '@/types';
import { useToast } from '@/context/ToastContext';
import StarRating from './StarRating';
import HeartButton from './HeartButton';
import clsx from 'clsx';
import { HiChevronDown, HiClock, HiLightningBolt, HiOutlineShare } from 'react-icons/hi';

interface Props { recipe: Recipe; onRate: (rating: number) => void; onToggleFavorite: () => void; }

const DIFFICULTY_COLORS = {
  Easy: 'bg-green-50 text-green-700 border border-green-100',
  Medium: 'bg-neutral-50 text-neutral-700 border border-neutral-200',
  Hard: 'bg-red-50 text-red-700 border border-red-100',
};

const LABELS = {
  en: {
    ingredients: 'Ingredients',
    instructions: 'Instructions',
    tips: 'Tips',
    nutrition: 'Nutrition',
    serves: 'Serves',
    calories: 'Calories',
    protein: 'Protein',
    carbs: 'Carbs',
    fat: 'Fat',
    footer: 'Made with Good Meals Co.',
  },
  hi: {
    ingredients: 'सामग्री',
    instructions: 'विधि',
    tips: 'सुझाव',
    nutrition: 'पोषण',
    serves: 'परोसें',
    calories: 'कैलोरी',
    protein: 'प्रोटीन',
    carbs: 'कार्ब्स',
    fat: 'वसा',
    footer: 'Good Meals Co. द्वारा बनाया गया',
  },
};

function formatRecipeText(recipe: Recipe, lang: 'en' | 'hi'): string {
  const l = LABELS[lang];
  const lines: string[] = [];

  lines.push(`🍳 ${recipe.name.toUpperCase()}`);
  lines.push('━━━━━━━━━━━━━━━━');
  lines.push(`⏱ ${recipe.cookTime} · ${recipe.difficulty}`);
  lines.push('');

  if (recipe.description) {
    lines.push(recipe.description);
    lines.push('');
  }

  lines.push(`📝 ${l.ingredients}:`);
  recipe.ingredients.forEach((ing) => {
    const qty = ing.quantity ? `${ing.quantity}${ing.unit ? ` ${ing.unit}` : ''}` : '';
    lines.push(`• ${qty ? `${qty} ` : ''}${ing.name}`);
  });
  lines.push('');

  lines.push(`👨‍🍳 ${l.instructions}:`);
  recipe.instructions.forEach((step, i) => {
    lines.push(`${i + 1}. ${step}`);
  });

  if (recipe.tips?.length > 0) {
    lines.push('');
    lines.push(`💡 ${l.tips}:`);
    recipe.tips.forEach((tip) => {
      lines.push(`- ${tip}`);
    });
  }

  if (recipe.nutritionInfo) {
    lines.push('');
    lines.push(`📊 ${l.nutrition}:`);
    lines.push(`${l.serves}: ${recipe.nutritionInfo.servings} · ${l.calories}: ${recipe.nutritionInfo.calories} · ${l.protein}: ${recipe.nutritionInfo.protein} · ${l.carbs}: ${recipe.nutritionInfo.carbs} · ${l.fat}: ${recipe.nutritionInfo.fat}`);
  }

  lines.push('');
  lines.push(`🔗 ${l.footer}`);

  return lines.join('\n');
}

export default function RecipeCard({ recipe, onRate, onToggleFavorite }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const { addToast } = useToast();

  const handleShare = async (lang: 'en' | 'hi') => {
    const text = formatRecipeText(recipe, lang);
    setShowLangPicker(false);

    try {
      if (navigator.share) {
        await navigator.share({ title: recipe.name, text });
      } else {
        await navigator.clipboard.writeText(text);
        addToast('Recipe copied to clipboard!', 'success');
      }
    } catch (err) {
      // User cancelled share or share failed — try clipboard fallback
      if (err instanceof Error && err.name !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(text);
          addToast('Recipe copied to clipboard!', 'success');
        } catch {
          addToast('Failed to share recipe.', 'error');
        }
      }
    }
  };

  return (
    <div className="border border-neutral-200 rounded-2xl bg-white overflow-hidden animate-slide-up hover:shadow-md transition-all">
      <div onClick={() => setExpanded(!expanded)} className="p-4 cursor-pointer hover:bg-neutral-50 transition-colors">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-neutral-900 text-base">{recipe.name}</h3>
            <p className="text-sm text-neutral-500 mt-1 line-clamp-2 font-light">{recipe.description}</p>
            <div className="flex items-center gap-3 mt-2.5 flex-wrap">
              <span className="flex items-center gap-1 text-xs text-neutral-400">
                <HiClock className="w-3.5 h-3.5" />{recipe.cookTime}
              </span>
              <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full', DIFFICULTY_COLORS[recipe.difficulty])}>{recipe.difficulty}</span>
              <div className="flex gap-1 flex-wrap">
                {recipe.keyIngredients.slice(0, 3).map((ing) => (
                  <span key={ing} className="text-xs bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-full">{ing}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="flex items-center gap-1.5">
              <button
                onClick={(e) => { e.stopPropagation(); setShowLangPicker(!showLangPicker); }}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
                title="Share recipe"
              >
                <HiOutlineShare className="w-4 h-4" />
              </button>
              <HeartButton isFavorite={recipe.isFavorite} onToggle={onToggleFavorite} />
            </div>
            <HiChevronDown className={clsx('w-5 h-5 text-neutral-400 transition-transform', expanded && 'rotate-180')} />
          </div>
        </div>

        {/* Language picker for share */}
        {showLangPicker && (
          <div className="flex items-center gap-2 mt-3 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <span className="text-[10px] uppercase tracking-widest text-neutral-400">Share in:</span>
            <button
              onClick={() => handleShare('en')}
              className="px-3 py-1 text-xs font-medium rounded-full border border-neutral-200 text-neutral-700 hover:bg-neutral-900 hover:text-white hover:border-neutral-900 transition-colors"
            >
              English
            </button>
            <button
              onClick={() => handleShare('hi')}
              className="px-3 py-1 text-xs font-medium rounded-full border border-neutral-200 text-neutral-700 hover:bg-neutral-900 hover:text-white hover:border-neutral-900 transition-colors"
            >
              हिन्दी
            </button>
          </div>
        )}

        <div className="mt-3 flex items-center gap-2">
          <StarRating rating={recipe.rating} onRate={onRate} size="sm" />
          {recipe.rating > 0 && <span className="text-xs text-neutral-400">{recipe.rating}/5</span>}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-neutral-200 p-4 space-y-5 animate-fade-in">
          <div>
            <h4 className="font-semibold text-sm text-neutral-900 mb-2 flex items-center gap-1.5">
              <HiLightningBolt className="w-4 h-4 text-neutral-500" />Ingredients
            </h4>
            <ul className="space-y-1.5">
              {recipe.ingredients.map((ing, i) => (
                <li key={i} className="text-sm text-neutral-500 flex items-baseline gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 shrink-0 mt-1.5" />
                  <span><span className="font-medium text-neutral-900">{ing.quantity}{ing.unit ? ` ${ing.unit}` : ''}</span> {ing.name}</span>
                </li>
              ))}
            </ul>
          </div>
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
          {recipe.tips?.length > 0 && (
            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3">
              <h4 className="font-semibold text-sm text-neutral-900 mb-1.5">Tips</h4>
              <ul className="space-y-1">
                {recipe.tips.map((tip, i) => (<li key={i} className="text-xs text-neutral-600">- {tip}</li>))}
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
                <div key={item.label} className="text-center p-2 bg-neutral-50 rounded-xl border border-neutral-200">
                  <div className="text-xs text-neutral-400">{item.label}</div>
                  <div className="text-sm font-semibold text-neutral-900">{item.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
