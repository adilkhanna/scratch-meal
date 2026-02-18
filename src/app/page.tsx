'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useRecipeFlow } from '@/context/RecipeFlowContext';
import { useToast } from '@/context/ToastContext';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import StepIndicator from '@/components/layout/StepIndicator';
import IngredientInput from '@/components/ingredients/IngredientInput';
import IngredientTag from '@/components/ingredients/IngredientTag';
import PhotoUpload from '@/components/ingredients/PhotoUpload';

export default function HomePage() {
  const router = useRouter();
  const { ingredients, addIngredient, addIngredients, removeIngredient, clearIngredients } =
    useRecipeFlow();
  const { addToast } = useToast();
  const { value: apiKey } = useLocalStorage<string>('smm-api-key', '');
  const [isExtracting, setIsExtracting] = useState(false);

  const handlePhotoExtract = useCallback(
    async (base64: string) => {
      if (!apiKey) {
        addToast('Please set your OpenAI API key in Settings first.', 'error');
        return;
      }
      setIsExtracting(true);
      try {
        const res = await fetch('/api/extract-ingredients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, apiKey }),
        });
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          throw new Error('Server error. If deployed, ensure your hosting supports Next.js API routes.');
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        if (data.ingredients?.length) {
          addIngredients(data.ingredients);
          addToast(`Found ${data.ingredients.length} ingredient(s) from photo!`, 'success');
        } else {
          addToast('No ingredients detected in this photo.', 'info');
        }
      } catch (err) {
        addToast(err instanceof Error ? err.message : 'Failed to analyze photo', 'error');
      } finally {
        setIsExtracting(false);
      }
    },
    [apiKey, addIngredients, addToast]
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
          <h1 className="text-2xl font-bold text-stone-900 mb-1">What&apos;s in your kitchen?</h1>
          <p className="text-stone-500 text-sm">
            Type your ingredients or snap a photo of what you have.
          </p>
        </div>

        {/* Text input */}
        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-2">
            Add ingredients manually
          </label>
          <IngredientInput onAdd={addIngredient} />
        </div>

        {/* Photo upload */}
        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-2">
            Or upload food photos
          </label>
          <PhotoUpload onExtract={handlePhotoExtract} isExtracting={isExtracting} />
          {!apiKey && (
            <p className="text-xs text-amber-600 mt-2">
              Set your OpenAI API key in{' '}
              <a href="/settings" className="underline font-medium">
                Settings
              </a>{' '}
              to enable photo recognition.
            </p>
          )}
        </div>

        {/* Ingredient list */}
        {ingredients.length > 0 && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-stone-700">
                Your ingredients ({ingredients.length})
              </h2>
              <button
                onClick={clearIngredients}
                className="text-xs text-stone-400 hover:text-red-500 transition-colors"
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
          className="w-full py-3.5 bg-orange-500 text-white rounded-xl font-semibold text-sm
                     hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed
                     transition-colors shadow-sm"
        >
          Next: Dietary Preferences
        </button>
      </div>
    </div>
  );
}
