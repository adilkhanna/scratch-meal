'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useMealPlanFlow } from '@/context/MealPlanFlowContext';
import { useToast } from '@/context/ToastContext';
import { extractIngredientsFromPhoto } from '@/lib/firebase-functions';
import IngredientTag from '@/components/ingredients/IngredientTag';
import PhotoUpload from '@/components/ingredients/PhotoUpload';
import StaggeredPageTitle from '@/components/ui/StaggeredPageTitle';
import StepIndicator from '@/components/layout/StepIndicator';
import STEP_THEMES from '@/config/step-themes';

// Non-food items that users might try to sneak in
const NON_FOOD_ITEMS = new Set([
  'soap', 'detergent', 'bleach', 'shampoo', 'conditioner', 'toothpaste', 'toothbrush',
  'sponge', 'towel', 'napkin', 'tissue', 'paper towel', 'aluminium foil', 'aluminum foil',
  'plastic wrap', 'cling film', 'trash bag', 'garbage bag', 'rubber gloves', 'dish soap',
  'phone', 'iphone', 'samsung', 'laptop', 'computer', 'keyboard', 'mouse', 'charger',
  'cable', 'headphones', 'earbuds', 'airpods', 'remote', 'battery', 'batteries',
  'shoe', 'shoes', 'sock', 'socks', 'shirt', 'pants', 'hat', 'wallet', 'purse',
  'lotion', 'cream', 'sunscreen', 'deodorant', 'perfume', 'makeup', 'medicine', 'pills',
  'candle', 'cigarette', 'cigarettes', 'vape', 'tobacco',
]);

function isFoodItem(name: string): boolean {
  const lower = name.trim().toLowerCase();
  if (!lower) return true;
  if (NON_FOOD_ITEMS.has(lower)) return false;
  for (const item of NON_FOOD_ITEMS) {
    if (item.length > 3 && lower.includes(item)) return false;
  }
  return true;
}

const theme = STEP_THEMES.mealplan;

const BREAKFAST_SUGGESTION_TAGS = [
  'oats', 'eggs', 'toast', 'cereal', 'smoothie', 'pancakes',
  'paratha', 'poha', 'idli', 'dosa', 'upma', 'fruit',
];

export default function MealPlanStartPage() {
  const router = useRouter();
  const {
    ingredients, addIngredient, addIngredients, removeIngredient, clearIngredients,
    familySize, setFamilySize,
    breakfastPreferences, addBreakfastPreference, removeBreakfastPreference,
  } = useMealPlanFlow();
  const { addToast } = useToast();
  const [isExtracting, setIsExtracting] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [memberName, setMemberName] = useState('');
  const [memberPrefs, setMemberPrefs] = useState<string[]>([]);

  const bogusItems = useMemo(() => {
    const bogus = new Set<string>();
    ingredients.forEach((name) => {
      if (!isFoodItem(name)) bogus.add(name);
    });
    return bogus;
  }, [ingredients]);

  const hasBogusItems = bogusItems.size > 0;

  const handleAddItem = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    const items = trimmed.split(',').map((s) => s.trim()).filter(Boolean);
    if (items.length > 1) {
      addIngredients(items);
    } else {
      addIngredient(trimmed);
    }
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddItem();
    }
  };

  const handlePhotoExtract = useCallback(async (base64: string) => {
    setIsExtracting(true);
    try {
      const foundIngredients = await extractIngredientsFromPhoto(base64);
      if (foundIngredients.length > 0) {
        addIngredients(foundIngredients);
        addToast(`Found ${foundIngredients.length} ingredient(s) from photo!`, 'success');
      } else {
        addToast('No ingredients detected in this photo.', 'info');
      }
    } catch (err) { addToast(err instanceof Error ? err.message : 'Failed to analyze photo', 'error'); }
    finally { setIsExtracting(false); }
  }, [addIngredients, addToast]);

  const handleAddMemberPref = () => {
    const name = memberName.trim();
    if (!name) { addToast('Enter a name for this family member.', 'error'); return; }
    if (breakfastPreferences.some((p) => p.memberName === name)) {
      addToast(`${name} already has breakfast preferences.`, 'error');
      return;
    }
    addBreakfastPreference({ memberName: name, preferences: memberPrefs });
    setMemberName('');
    setMemberPrefs([]);
  };

  const toggleBreakfastTag = (tag: string) => {
    setMemberPrefs((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleNext = () => {
    if (ingredients.length === 0) { addToast('Add at least one ingredient to continue.', 'error'); return; }
    if (hasBogusItems) { addToast('Remove the non-food items (in red) to continue.', 'error'); return; }
    router.push('/meal-plan/dietary');
  };

  return (
    <div
      className="min-h-screen flex flex-col animate-radial-glow"
      style={{ background: theme.background, backgroundSize: '200% 200%' }}
    >
      <div className="max-w-3xl mx-auto px-6 pt-16 w-full">
        <StepIndicator currentStep={1} variant="meal-plan" />

        <div className="text-center mb-8">
          <StaggeredPageTitle
            text="plan your week."
            className="text-[clamp(36px,5.5vw,67px)] tracking-[-0.25px]"
          />
        </div>

        {/* Ingredient input row */}
        <div className="flex flex-wrap items-center gap-3 max-w-xl mx-auto">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="ENTER YOUR INGREDIENTS HERE..."
            className="flex-1 min-w-0 px-5 py-3 bg-white rounded-full text-sm font-[family-name:var(--font-mono-option)] tracking-[0.5px] uppercase text-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-black/10 transition-all"
          />
          <button
            onClick={handleAddItem}
            className="px-5 py-3 text-[14px] font-medium tracking-[1px] uppercase border-[1.5px] border-black rounded-[30px] bg-transparent text-black hover:bg-black hover:text-white transition-all duration-200 whitespace-nowrap max-sm:w-full"
          >
            ADD ITEM
          </button>
        </div>

        {/* Photo upload */}
        <div className="max-w-xl mx-auto mt-6">
          <PhotoUpload onExtract={handlePhotoExtract} isExtracting={isExtracting} />
        </div>

        {/* Ingredient tags */}
        {ingredients.length > 0 && (
          <div className="animate-fade-in max-w-xl mx-auto mt-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[12px] font-medium uppercase tracking-[1px] text-black/50">Your ingredients ({ingredients.length})</h2>
              <button onClick={clearIngredients} className="text-[12px] text-black/40 hover:text-red-500 uppercase tracking-[1px] transition-colors">Clear all</button>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {ingredients.map((name) => (
                <IngredientTag key={name} name={name} onRemove={() => removeIngredient(name)} isBogus={bogusItems.has(name)} />
              ))}
            </div>
            {hasBogusItems && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-[30px] animate-fade-in">
                <p className="text-sm text-red-600 font-medium">Remove the red items above to proceed.</p>
              </div>
            )}
          </div>
        )}

        {/* Family size selector */}
        <div className="max-w-xl mx-auto mt-10">
          <div className="glass-panel p-6">
            <h3 className="text-[14px] font-medium tracking-[1px] uppercase text-black mb-4">
              Family Size
            </h3>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setFamilySize(familySize - 1)}
                disabled={familySize <= 1}
                className="w-10 h-10 rounded-full border-[1.5px] border-black flex items-center justify-center text-lg hover:bg-black hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                -
              </button>
              <span className="text-[28px] font-[family-name:var(--font-display)] min-w-[3ch] text-center">
                {familySize}
              </span>
              <button
                onClick={() => setFamilySize(familySize + 1)}
                disabled={familySize >= 10}
                className="w-10 h-10 rounded-full border-[1.5px] border-black flex items-center justify-center text-lg hover:bg-black hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                +
              </button>
              <span className="text-[12px] font-[family-name:var(--font-mono-option)] tracking-[0.5px] uppercase text-black/50 ml-2">
                {familySize === 1 ? 'person' : 'people'}
              </span>
            </div>
          </div>
        </div>

        {/* Breakfast preferences (family mode) */}
        {familySize > 1 && (
          <div className="max-w-xl mx-auto mt-6 animate-fade-in">
            <div className="glass-panel p-6">
              <h3 className="text-[14px] font-medium tracking-[1px] uppercase text-black mb-2">
                Breakfast Preferences
              </h3>
              <p className="text-[12px] font-[family-name:var(--font-mono-option)] tracking-[0.5px] uppercase text-black/40 mb-4">
                Optional: set different breakfast preferences per family member
              </p>

              {/* Existing preferences */}
              {breakfastPreferences.length > 0 && (
                <div className="space-y-2 mb-4">
                  {breakfastPreferences.map((pref) => (
                    <div key={pref.memberName} className="flex items-center justify-between bg-white/40 rounded-full px-4 py-2">
                      <div>
                        <span className="text-[13px] font-medium text-black">{pref.memberName}</span>
                        {pref.preferences.length > 0 && (
                          <span className="text-[11px] text-black/40 ml-2">
                            {pref.preferences.join(', ')}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => removeBreakfastPreference(pref.memberName)}
                        className="text-black/30 hover:text-red-500 text-lg transition-colors"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add member form */}
              <div className="space-y-3">
                <input
                  type="text"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  placeholder="FAMILY MEMBER NAME..."
                  className="w-full px-4 py-2.5 bg-white rounded-full text-sm font-[family-name:var(--font-mono-option)] tracking-[0.5px] uppercase text-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-black/10"
                />

                {/* Breakfast suggestion tags */}
                <div className="flex flex-wrap gap-2">
                  {BREAKFAST_SUGGESTION_TAGS.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleBreakfastTag(tag)}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-[family-name:var(--font-mono-option)] tracking-[0.5px] uppercase border-[1.5px] transition-all ${
                        memberPrefs.includes(tag)
                          ? 'bg-black text-white border-black'
                          : 'bg-transparent text-black/60 border-black/20 hover:border-black'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleAddMemberPref}
                  disabled={!memberName.trim()}
                  className="px-5 py-2 text-[12px] font-medium tracking-[1px] uppercase border-[1.5px] border-black rounded-[30px] bg-transparent text-black hover:bg-black hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
                >
                  ADD MEMBER
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-center gap-4 mt-8 mb-12">
          <button
            onClick={() => router.push('/')}
            className="px-8 py-3 text-[14px] font-medium tracking-[1px] uppercase border-[1.5px] border-black rounded-[30px] bg-transparent text-black hover:bg-black hover:text-white transition-all duration-200 inline-flex items-center gap-2"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            HOME
          </button>
          <button
            onClick={handleNext}
            disabled={ingredients.length === 0 || hasBogusItems}
            className="px-8 py-3 text-[14px] font-medium tracking-[1px] uppercase border-[1.5px] border-black rounded-[30px] bg-transparent text-black hover:bg-black hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 inline-flex items-center gap-2"
          >
            DIETARY
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Brand footer */}
      <div className="mt-auto text-center select-none overflow-hidden">
        <span className="font-[family-name:var(--font-brand)] text-[clamp(80px,15vw,225px)] font-normal text-black leading-none tracking-[-0.25px] block">
          GOOD MEALS CO.
        </span>
      </div>
    </div>
  );
}
