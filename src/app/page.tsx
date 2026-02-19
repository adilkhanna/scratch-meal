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
  const { ingredients, addIngredient, addIngredients, removeIngredient, clearIngredients } =
    useRecipeFlow();
  const { addToast } = useToast();
  const [isExtracting, setIsExtracting] = useState(false);

  const handlePhotoExtract = useCallback(
    async (base64: string) => {
      setIsExtracting(true);
      try {
        const foundIngredients = await extractIngredientsFromPhoto(base64);
        if (foundIngredients.length > 0) {
          addIngredients(foundIngredients);
          addToast(`Found ${foundIngredients.length} ingredient(s) from photo!`, 'success');
        } else {
          addToast('No ingredients detected in this photo.', 'info');
        }
      } catch (err) {
        addToast(err instanceof Error ? err.message : 'Failed to analyze photo', 'error');
      } finally {
        setIsExtracting(false);
      }
    },
    [addIngredients, addToast]
  );

  const handleNext = () => {
    if (ingredients.length === 0) {
      addToast('Add at least one ingredient to continue.', 'error');
      return;
    }
    router.push('/dietary');
  };

  return (
    <div className="animate-fade-in">
      <StepIndicator currentStep={1} />

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#f5f5f5] font-[family-name:var(--font-serif)] mb-1">
            What&apos;s in your kitchen?
          </h1>
          <p className="text-[#a0a0a0] text-sm">
            Type your ingredients or snap a photo of what you have.
          </p>
        </div>

        {/* Text input */}
        <div>
          <label className="block text-sm font-semibold text-[#a0a0a0] mb-2">
            Add ingredients manually
          </label>
          <IngredientInput onAdd={addIngredient} />
        </div>

        {/* Photo upload */}
        <div>
          <label className="block text-sm font-semibold text-[#a0a0a0] mb-2">
            Or upload food photos
          </label>
          <PhotoUpload onExtract={handlePhotoExtract} isExtracting={isExtracting} />
        </div>

        {/* Ingredient list */}
        {ingredients.length > 0 && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-[#a0a0a0]">
                Your ingredients ({ingredients.length})
              </h2>
              <button
                onClick={clearIngredients}
                className="text-xs text-[#666] hover:text-red-400 transition-colors"
              >
                Clear all
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {ingredients.map((name) => (
                <IngredientTag key={name} name={name} onRemove={() => removeIngredient(name)} />
              ))}
            </div>
          </div>
        )}

        {/* Next button */}
        <button
          onClick={handleNext}
          disabled={ingredients.length === 0}
          className="w-full py-3.5 bg-amber-600 text-white rounded-xl font-semibold text-sm
                     hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed
                     transition-all shadow-[0_0_20px_rgba(245,158,11,0.15)]"
        >
          Next: Dietary Preferences
        </button>
      </div>
    </div>
  );
}
