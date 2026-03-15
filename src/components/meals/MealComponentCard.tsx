'use client';

import { useState } from 'react';
import { MealComponent } from '@/types';

interface Props {
  component: MealComponent;
  onToggleFavorite?: () => void;
}

export default function MealComponentCard({ component, onToggleFavorite }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  return (
    <div className="glass-panel transition-all duration-300">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/10 transition-colors rounded-[30px]"
      >
        <div className="flex items-center gap-3 text-left min-w-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h4 className="text-[14px] font-medium text-black truncate">
                {component.name}
              </h4>
              {component.explanation && (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowExplanation(!showExplanation); }}
                  className="shrink-0 p-0.5 text-black/30 hover:text-[#0059FF] transition-colors"
                  aria-label="Why this dish?"
                  title="Why this dish?"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" />
                    <path d="M12 8h.01" />
                  </svg>
                </button>
              )}
            </div>
            <p className="text-[11px] font-[family-name:var(--font-mono-option)] tracking-[0.5px] uppercase text-black/40 truncate">
              {component.cookTime} &middot; {component.difficulty}
              {component.estimatedCostPerServing != null && (
                <> &middot; {'\u20B9'}{component.estimatedCostPerServing}</>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onToggleFavorite && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
              className="p-1.5 transition-colors"
              aria-label="Toggle favorite"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill={component.isFavorite ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="1.5"
                className={component.isFavorite ? 'text-red-500' : 'text-black/30'}
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
          )}
          <span className="text-black/40 text-lg leading-none select-none">
            {expanded ? '\u00D7' : '+'}
          </span>
        </div>
      </button>

      {/* Why this dish? explanation popover */}
      {showExplanation && component.explanation && (
        <div className="mx-5 mb-2 px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-2xl animate-fade-in">
          <p className="text-[12px] text-blue-800 leading-relaxed">
            <span className="font-medium">Why this dish?</span> {component.explanation}
          </p>
        </div>
      )}

      {/* Expanded details */}
      {expanded && (
        <div className="px-5 pb-5 space-y-4 animate-fade-in">
          {/* Description */}
          {component.description && (
            <p className="text-[13px] text-black/70 leading-relaxed">
              {component.description}
            </p>
          )}

          {/* Dietary notes */}
          {component.dietaryNotes && (
            <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-2xl">
              <p className="text-[11px] font-[family-name:var(--font-mono-option)] tracking-[0.5px] uppercase text-amber-700">
                {component.dietaryNotes}
              </p>
            </div>
          )}

          {/* Ingredients */}
          <div>
            <h5 className="text-[11px] font-medium tracking-[1px] uppercase text-black/50 mb-2">
              Ingredients ({component.servingsScaled} serving{component.servingsScaled !== 1 ? 's' : ''})
            </h5>
            <ul className="space-y-1">
              {component.ingredients.map((ing, i) => (
                <li key={i} className="text-[13px] text-black/70 flex items-start gap-2">
                  <span className="text-black/20 mt-1">&bull;</span>
                  <span>{ing.quantity} {ing.unit && `${ing.unit} `}{ing.name}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Instructions */}
          <div>
            <h5 className="text-[11px] font-medium tracking-[1px] uppercase text-black/50 mb-2">
              Instructions
            </h5>
            <ol className="space-y-2">
              {component.instructions.map((step, i) => (
                <li key={i} className="text-[13px] text-black/70 flex items-start gap-2">
                  <span className="text-[11px] font-medium text-black/30 mt-0.5 shrink-0">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Tips */}
          {component.tips.length > 0 && (
            <div>
              <h5 className="text-[11px] font-medium tracking-[1px] uppercase text-black/50 mb-2">
                Tips
              </h5>
              {component.tips.map((tip, i) => (
                <p key={i} className="text-[12px] text-black/50 italic">{tip}</p>
              ))}
            </div>
          )}

          {/* Nutrition */}
          {component.nutritionInfo && (
            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-black/10">
              <div className="text-center">
                <p className="text-[16px] font-medium text-black">{component.nutritionInfo.calories}</p>
                <p className="text-[9px] tracking-[1px] uppercase text-black/40">cal</p>
              </div>
              <div className="text-center">
                <p className="text-[16px] font-medium text-black">{component.nutritionInfo.protein}</p>
                <p className="text-[9px] tracking-[1px] uppercase text-black/40">protein</p>
              </div>
              <div className="text-center">
                <p className="text-[16px] font-medium text-black">{component.nutritionInfo.carbs}</p>
                <p className="text-[9px] tracking-[1px] uppercase text-black/40">carbs</p>
              </div>
              <div className="text-center">
                <p className="text-[16px] font-medium text-black">{component.nutritionInfo.fat}</p>
                <p className="text-[9px] tracking-[1px] uppercase text-black/40">fat</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
