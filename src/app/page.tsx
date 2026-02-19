'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useRecipeFlow } from '@/context/RecipeFlowContext';
import { useToast } from '@/context/ToastContext';
import { extractIngredientsFromPhoto } from '@/lib/firebase-functions';
import StepIndicator from '@/components/layout/StepIndicator';
import IngredientInput from '@/components/ingredients/IngredientInput';
import IngredientTag from '@/components/ingredients/IngredientTag';
import PhotoUpload from '@/components/ingredients/PhotoUpload';

export default function HomePage() {
  const router = useRouter();
  const { ingredients, addIngredient, addIngredients, removeIngredient, clearIngredients } = useRecipeFlow();
  const { addToast } = useToast();
  const [isExtracting, setIsExtracting] = useState(false);

  const handlePhotoExtract = useCallback(async (base64: string) => {
    setIsExtracting(true);
    try {
      const foundIngredients = await extractIngredientsFromPhoto(base64);
      if (foundIngredients.length > 0) { addIngredients(foundIngredients); addToast(`Found ${foundIngredients.length} ingredient(s) from photo!`, 'success'); }
      else { addToast('No ingredients detected in this photo.', 'info'); }
    } catch (err) { addToast(err instanceof Error ? err.message : 'Failed to analyze photo', 'error'); }
    finally { setIsExtracting(false); }
  }, [addIngredients, addToast]);

  const handleNext = () => {
    if (ingredients.length === 0) { addToast('Add at least one ingredient to continue.', 'error'); return; }
    router.push('/dietary');
  };

  return (
    <div className="animate-fade-in">
      <StepIndicator currentStep={1} />
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-[family-name:var(--font-display)] text-neutral-900 mb-3 leading-tight">
            What&apos;s In Your<br />Kitchen?
          </h1>
          <p className="text-neutral-500 text-sm font-light">Type your ingredients or snap a photo of what you have.</p>
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-widest text-neutral-400 mb-3">Add ingredients</label>
          <IngredientInput onAdd={addIngredient} />
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-widest text-neutral-400 mb-3">Or upload food photos</label>
          <PhotoUpload onExtract={handlePhotoExtract} isExtracting={isExtracting} />
        </div>
        {ingredients.length > 0 && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-medium uppercase tracking-widest text-neutral-400">Your ingredients ({ingredients.length})</h2>
              <button onClick={clearIngredients} className="text-xs text-neutral-400 hover:text-red-500 uppercase tracking-wider transition-colors">Clear all</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {ingredients.map((name) => (<IngredientTag key={name} name={name} onRemove={() => removeIngredient(name)} />))}
            </div>
          </div>
        )}
        <button onClick={handleNext} disabled={ingredients.length === 0}
          className="w-full py-4 bg-neutral-900 text-white rounded-full font-medium text-xs uppercase tracking-widest hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          Next: Dietary Preferences
        </button>
      </div>

      {/* Brand watermark footer */}
      <div className="mt-16 sm:mt-24 text-center select-none">
        <span className="font-[family-name:var(--font-display)] text-5xl sm:text-7xl lg:text-8xl text-sage/40">
          Good Meals Co.
        </span>
      </div>
    </div>
  );
}
