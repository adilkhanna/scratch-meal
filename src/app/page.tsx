'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useRecipeFlow } from '@/context/RecipeFlowContext';
import { useToast } from '@/context/ToastContext';
import { extractIngredientsFromPhoto } from '@/lib/firebase-functions';
import IngredientTag from '@/components/ingredients/IngredientTag';
import PhotoUpload from '@/components/ingredients/PhotoUpload';

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
    addIngredient(trimmed);
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
    <div className="animate-fade-in">
      <div className="max-w-3xl mx-auto text-center space-y-8 pt-8 sm:pt-16">
        {/* Hero heading */}
        <h1 className="font-[family-name:var(--font-display)] text-[clamp(40px,6vw,67px)] text-[#0059FF] leading-[0.96] tracking-[-0.25px]">
          What&apos;s In Your Kitchen ?
        </h1>

        {/* Ingredient input row */}
        <div className="flex items-center gap-3 max-w-xl mx-auto">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add the ingredients you want to make a recipe with here..."
            className="flex-1 px-5 py-3 bg-white/70 rounded-full text-sm italic font-light text-[#687F75] placeholder:text-[#687F75] focus:outline-none focus:ring-2 focus:ring-[#0059FF]/30 transition-all"
          />
          <button
            onClick={handleAddItem}
            className="px-5 py-3 text-[15px] font-normal text-[#0059FF] tracking-[2px] uppercase border border-[#0059FF] rounded-full hover:bg-[#0059FF] hover:text-white transition-all duration-200 whitespace-nowrap"
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
              <h2 className="text-xs font-medium uppercase tracking-widest text-neutral-500">Your ingredients ({ingredients.length})</h2>
              <button onClick={clearIngredients} className="text-xs text-neutral-400 hover:text-red-500 uppercase tracking-wider transition-colors">Clear all</button>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {ingredients.map((name) => (
                <IngredientTag key={name} name={name} onRemove={() => removeIngredient(name)} isBogus={bogusItems.has(name)} />
              ))}
            </div>

            {hasBogusItems && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-2xl animate-fade-in">
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
        <button onClick={handleNext} disabled={ingredients.length === 0 || hasBogusItems}
          className="w-full max-w-xl mx-auto block py-4 bg-[#0059FF] text-white rounded-full font-medium text-xs uppercase tracking-widest hover:bg-[#0047CC] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          Next: Dietary Preferences
        </button>
      </div>

      {/* Large brand footer */}
      <div className="mt-16 sm:mt-24 text-center select-none overflow-hidden">
        <span className="font-[family-name:var(--font-brand)] text-[clamp(80px,15vw,225px)] font-normal text-[#0059FF] leading-none tracking-[-0.25px] block">
          GOOD MEALS CO.
        </span>
      </div>
    </div>
  );
}
