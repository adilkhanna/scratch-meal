'use client';

import { ChatMessage, Recipe } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { updateRecipeInFirestore } from '@/lib/recipe-storage';
import RecipeCard from '@/components/recipes/RecipeCard';
import { useState } from 'react';

interface Props {
  message: ChatMessage;
  isStreaming?: boolean;
}

export default function ChatBubble({ message, isStreaming }: Props) {
  const isUser = message.role === 'user';
  const hasPhoto = message.metadata?.photoBase64;
  const recipes = message.metadata?.recipes;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}>
      <div
        className={`max-w-[85%] sm:max-w-[75%] ${
          isUser
            ? 'bg-[#0059FF] text-white rounded-2xl rounded-br-md'
            : 'bg-white border border-neutral-200 text-neutral-800 rounded-2xl rounded-bl-md'
        } ${recipes ? '!max-w-full sm:!max-w-[90%]' : ''}`}
      >
        {/* Photo thumbnail (user messages only) */}
        {hasPhoto && (
          <div className="p-2 pb-0">
            <div className="w-24 h-24 rounded-xl overflow-hidden bg-neutral-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:image/jpeg;base64,${message.metadata!.photoBase64}`}
                alt="Uploaded food"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        {/* Text content */}
        {message.content && (
          <div className="px-4 py-3">
            <p className={`text-sm font-light leading-relaxed whitespace-pre-wrap ${isUser ? '' : 'text-neutral-700'}`}>
              {message.content}
              {isStreaming && !isUser && (
                <span className="inline-block w-1.5 h-4 bg-[#0059FF]/60 ml-0.5 animate-pulse" />
              )}
            </p>
          </div>
        )}

        {/* Recipe cards (assistant messages only) */}
        {recipes && recipes.length > 0 && (
          <div className="px-2 pb-3 space-y-3">
            {recipes.map((recipe) => (
              <ChatRecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Wrapper that manages local state for recipe rating/favoriting
function ChatRecipeCard({ recipe: initialRecipe }: { recipe: Recipe }) {
  const { user } = useAuth();
  const [recipe, setRecipe] = useState(initialRecipe);

  const handleRate = async (rating: number) => {
    setRecipe((prev) => ({ ...prev, rating }));
    if (user) {
      try {
        await updateRecipeInFirestore(user.uid, recipe.id, { rating });
      } catch { /* silent */ }
    }
  };

  const handleToggleFavorite = async () => {
    const newVal = !recipe.isFavorite;
    setRecipe((prev) => ({ ...prev, isFavorite: newVal }));
    if (user) {
      try {
        await updateRecipeInFirestore(user.uid, recipe.id, { isFavorite: newVal });
      } catch { /* silent */ }
    }
  };

  return (
    <RecipeCard
      recipe={recipe}
      onRate={handleRate}
      onToggleFavorite={handleToggleFavorite}
    />
  );
}
