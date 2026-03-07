'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useRecipeFlow } from '@/context/RecipeFlowContext';
import { useToast } from '@/context/ToastContext';
import { extractIngredientsFromPhoto } from '@/lib/firebase-functions';
import IngredientTag from '@/components/ingredients/IngredientTag';
import PhotoUpload from '@/components/ingredients/PhotoUpload';
import StaggeredPageTitle from '@/components/ui/StaggeredPageTitle';
import STEP_THEMES from '@/config/step-themes';

// Non-food items that users might try to sneak in
const NON_FOOD_ITEMS = new Set([
  // Household items
  'soap', 'detergent', 'bleach', 'shampoo', 'conditioner', 'toothpaste', 'toothbrush',
  'sponge', 'towel', 'napkin', 'tissue', 'paper towel', 'aluminium foil', 'aluminum foil',
  'plastic wrap', 'cling film', 'trash bag', 'garbage bag', 'rubber gloves', 'dish soap',
  'fabric softener', 'laundry detergent', 'cleaning spray', 'windex', 'lysol',
  // Electronics & objects
  'phone', 'iphone', 'samsung', 'laptop', 'computer', 'keyboard', 'mouse', 'charger',
  'cable', 'headphones', 'earbuds', 'airpods', 'remote', 'battery', 'batteries',
  'light bulb', 'lightbulb', 'pen', 'pencil', 'eraser', 'marker', 'scissors', 'tape',
  'stapler', 'glue', 'ruler', 'notebook', 'book', 'magazine', 'newspaper',
  // Clothing & accessories
  'shoe', 'shoes', 'sock', 'socks', 'shirt', 'pants', 'hat', 'cap', 'belt', 'wallet',
  'purse', 'bag', 'backpack', 'umbrella', 'glasses', 'sunglasses', 'watch', 'ring',
  'necklace', 'bracelet', 'earring', 'earrings', 'jacket', 'coat', 'scarf',
  // Bathroom & personal care
  'lotion', 'cream', 'sunscreen', 'deodorant', 'perfume', 'cologne', 'makeup',
  'lipstick', 'mascara', 'nail polish', 'razor', 'comb', 'brush', 'hair dryer',
  'cotton balls', 'band aid', 'bandage', 'medicine', 'pills', 'tablets',
  // Pets & misc
  'cat food', 'dog food', 'pet food', 'cat litter', 'dog treat', 'leash',
  'candle', 'incense', 'match', 'matches', 'lighter', 'cigarette', 'cigarettes',
  'ashtray', 'vape', 'tobacco',
  // Furniture & hardware
  'chair', 'table', 'desk', 'bed', 'pillow', 'blanket', 'curtain', 'rug', 'carpet',
  'nail', 'nails', 'screw', 'screws', 'hammer', 'wrench', 'drill', 'paint',
  // Toys & games
  'toy', 'doll', 'ball', 'lego', 'puzzle', 'card', 'cards', 'dice',
  // Money & documents
  'money', 'cash', 'coin', 'coins', 'credit card', 'passport', 'key', 'keys',
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

const CHEEKY_MESSAGES = [
  "Hmm, we don't think that's edible! Remove the red items to continue.",
  "Nice try! But we can only cook with actual food. Remove the imposters!",
  "Unless you're a goat, those red items aren't food. Please remove them!",
  "We appreciate the creativity, but let's stick to real ingredients.",
  "Our AI chef is confused by the non-food items. Help it out?",
];

function getCheekyMessage(): string {
  return CHEEKY_MESSAGES[Math.floor(Math.random() * CHEEKY_MESSAGES.length)];
}

const theme = STEP_THEMES.ingredients;

export default function HomePage() {
  const router = useRouter();
  const { ingredients, addIngredient, addIngredients, removeIngredient, clearIngredients } = useRecipeFlow();
  const { addToast } = useToast();
  const [isExtracting, setIsExtracting] = useState(false);
  const [inputValue, setInputValue] = useState('');

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
        const nonFood = foundIngredients.filter((i) => !isFoodItem(i));
        if (nonFood.length > 0) {
          addToast(`Found ${foundIngredients.length} item(s), but some don't look like food!`, 'info');
        } else {
          addToast(`Found ${foundIngredients.length} ingredient(s) from photo!`, 'success');
        }
      } else {
        addToast('No ingredients detected in this photo.', 'info');
      }
    } catch (err) { addToast(err instanceof Error ? err.message : 'Failed to analyze photo', 'error'); }
    finally { setIsExtracting(false); }
  }, [addIngredients, addToast]);

  const handleNext = () => {
    if (ingredients.length === 0) { addToast('Add at least one ingredient to continue.', 'error'); return; }
    if (hasBogusItems) { addToast(getCheekyMessage(), 'error'); return; }
    const validCount = ingredients.length - bogusItems.size;
    if (validCount === 0) { addToast('You need at least one real food ingredient!', 'error'); return; }
    router.push('/dietary');
  };

  return (
    <div className="min-h-screen">
      {/* Full-bleed pastel gradient background with animated glow */}
      <div
        className="fixed inset-0 -z-10 animate-radial-glow"
        style={{ background: theme.background }}
      />

      <div className="max-w-3xl mx-auto text-center space-y-8 pt-8 sm:pt-16 px-6">
        {/* Hero heading — staggered per-letter animation */}
        <StaggeredPageTitle
          text="what's in your kitchen?"
          className="text-[clamp(40px,6vw,67px)] tracking-[-0.25px]"
        />

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

        {/* Photo upload area */}
        <div className="max-w-xl mx-auto">
          <PhotoUpload onExtract={handlePhotoExtract} isExtracting={isExtracting} />
        </div>

        {/* Ingredient tags */}
        {ingredients.length > 0 && (
          <div className="animate-fade-in max-w-xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-medium uppercase tracking-widest text-black/60">Your ingredients ({ingredients.length})</h2>
              <button onClick={clearIngredients} className="text-xs text-black/40 hover:text-red-500 uppercase tracking-wider transition-colors">Clear all</button>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {ingredients.map((name) => (
                <IngredientTag key={name} name={name} onRemove={() => removeIngredient(name)} isBogus={bogusItems.has(name)} />
              ))}
            </div>

            {hasBogusItems && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-[30px] animate-fade-in">
                <p className="text-sm text-red-600 font-medium">
                  {getCheekyMessage()}
                </p>
                <p className="text-xs text-red-400 mt-1 font-light">
                  Remove the red items above to proceed.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Next button */}
        <div className="flex justify-center">
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

      {/* Large brand footer */}
      <div className="mt-16 sm:mt-24 text-center select-none overflow-hidden">
        <span className="font-[family-name:var(--font-brand)] text-[clamp(80px,15vw,225px)] font-normal text-black/10 leading-none tracking-[-0.25px] block">
          GOOD MEALS CO.
        </span>
      </div>
    </div>
  );
}
