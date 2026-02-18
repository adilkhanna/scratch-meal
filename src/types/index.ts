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
}

export interface RecipeFilter {
  favoritesOnly: boolean;
  minRating: number;
  searchQuery: string;
}
