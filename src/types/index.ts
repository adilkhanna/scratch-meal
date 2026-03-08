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
  imageUrl?: string;
  estimatedCostPerServing?: number;
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

// --- Nutrition Info (shared) ---

export interface NutritionInfo {
  servings: number;
  calories: number;
  protein: string;
  carbs: string;
  fat: string;
}

// --- Weekly Meal Plan Generator Types ---

export interface BreakfastPreference {
  memberName: string;
  preferences: string[]; // e.g., ["oats", "eggs", "no bread"]
}

export interface FamilyProfile {
  memberCount: number;
  breakfastPreferences?: BreakfastPreference[];
}

/** A single dish component within a meal (e.g., "paneer palak", "cucumber raita") */
export interface MealComponent {
  id: string;
  name: string;
  description: string;
  cookTime: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  ingredients: RecipeIngredient[];
  instructions: string[];
  tips: string[];
  nutritionInfo?: NutritionInfo;
  estimatedCostPerServing?: number;
  servingsScaled: number; // scaled by family size
  dietaryNotes?: string; // e.g., "oat milk used (lactose intolerant)"
  isFavorite: boolean;
}

/** A complete meal: composed of multiple MealComponents */
export interface GeneratedMeal {
  mealType: 'breakfast' | 'lunch' | 'dinner';
  components: MealComponent[];
  totalCalories: number;
  totalCostPerServing?: number;
}

/** For breakfast when family mode: multiple options per day */
export interface BreakfastOptions {
  options: GeneratedMeal[]; // 4-5 options
}

/** One day in the generated plan */
export interface GeneratedDayPlan {
  day: string; // "monday", "tuesday", etc.
  breakfast: GeneratedMeal | BreakfastOptions;
  lunch: GeneratedMeal;
  dinner: GeneratedMeal;
}

/** The complete AI-generated weekly meal plan */
export interface GeneratedWeeklyPlan {
  id: string;
  weekId: string;
  familySize: number;
  planDays: number; // 3 (test) or 7 (production), admin-configurable
  ingredients: string[];
  dietaryConditions: string[];
  lunchCuisines: string[];
  dinnerCuisines: string[];
  days: GeneratedDayPlan[];
  totalWeeklyCost?: number;
  dailyCaloricTarget?: number;
  createdAt: string;
}

/** Type guard: check if breakfast is options (family mode) or single meal */
export function isBreakfastOptions(
  b: GeneratedMeal | BreakfastOptions
): b is BreakfastOptions {
  return 'options' in b;
}

// --- Recipe Glossary Types ---

export type GlossaryRegion =
  | 'south-asian'
  | 'european'
  | 'american'
  | 'east-asian'
  | 'middle-eastern'
  | 'global';

export interface GlossaryRecipe {
  id: string;
  name: string;
  description: string;
  cookTime: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  ingredients: RecipeIngredient[];
  instructions: string[];
  tips: string[];
  nutritionInfo?: NutritionInfo;
  cuisine: string[];
  dietaryTags: string[];
  mealTypes: MealSlot[];
  region: GlossaryRegion;
  source: 'spoonacular' | 'seed' | 'user-rated';
  spoonacularId?: number;
  useCount: number;
  avgRating: number;
  lastUsedAt: string;
  createdAt: string;
}

// --- Grocery List Types ---

export type GrocerySection =
  | 'produce'
  | 'dairy'
  | 'grains'
  | 'proteins'
  | 'spices'
  | 'oils_condiments'
  | 'other';

export interface GroceryItem {
  name: string;
  quantity: string;
  unit: string;
  section: GrocerySection;
  checked: boolean;
  estimatedCost?: number;
}

export const GROCERY_SECTION_LABELS: Record<GrocerySection, string> = {
  produce: 'Produce',
  dairy: 'Dairy',
  grains: 'Grains & Cereals',
  proteins: 'Proteins',
  spices: 'Spices & Seasonings',
  oils_condiments: 'Oils & Condiments',
  other: 'Other',
};

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
