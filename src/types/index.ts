export type DietaryCategoryType =
  | 'allergies'
  | 'intolerances'
  | 'medical'
  | 'religious'
  | 'lifestyle';

export interface DietaryCondition {
  id: string;
  label: string;
  description: string;
  category: DietaryCategoryType;
}

export type TimeRange = '15' | '30' | '45' | '60' | '90' | '120';

export interface RecipeIngredient {
  name: string;
  quantity: string;
  unit?: string;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  cookTime: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  keyIngredients: string[];
  ingredients: RecipeIngredient[];
  instructions: string[];
  tips: string[];
  nutritionInfo?: {
    servings: number;
    calories: number;
    protein: string;
    carbs: string;
    fat: string;
  };
  rating: number;
  isFavorite: boolean;
  createdAt: string;
  searchedIngredients: string[];
  dietaryConditions: string[];
  requestedTimeRange: TimeRange;
  sourceRecipe?: { title: string; sourceUrl: string; spoonacularId: number };
}

export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export type MealSlot = 'breakfast' | 'lunch' | 'dinner';

export interface DayPlan {
  breakfast: { recipeIds: string[] };
  lunch: { recipeIds: string[] };
  dinner: { recipeIds: string[] };
}

export interface MealPlan {
  weekId: string;
  days: Record<DayOfWeek, DayPlan>;
}

export interface RecipeFilter {
  favoritesOnly: boolean;
  minRating: number;
  searchQuery: string;
}

// --- Chat Agent Types ---

export interface MemoryFact {
  id: string;
  fact: string;
  category: 'preference' | 'household' | 'health' | 'taste' | 'feedback';
  confidence: number;
  source: 'conversation' | 'rating' | 'profile';
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: {
    photoBase64?: string;
    extractedIngredients?: string[];
    recipes?: Recipe[];
  };
}

export interface Conversation {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'completed';
  extractedRecipeIds: string[];
  messageCount: number;
}
