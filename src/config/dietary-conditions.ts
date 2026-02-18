import { DietaryCondition } from '@/types';

export const DIETARY_CONDITIONS: DietaryCondition[] = [
  // Allergies
  { id: 'dairy_allergy', label: 'Dairy / Milk Allergy', description: 'Allergic reaction to proteins in cow\'s milk and dairy products', category: 'allergies' },
  { id: 'egg_allergy', label: 'Egg Allergy', description: 'Allergic reaction to proteins in eggs', category: 'allergies' },
  { id: 'peanut_allergy', label: 'Peanut Allergy', description: 'Allergic reaction to peanuts, can cause severe reactions', category: 'allergies' },
  { id: 'tree_nut_allergy', label: 'Tree Nut Allergy', description: 'Allergic reaction to almonds, walnuts, cashews, pistachios, etc.', category: 'allergies' },
  { id: 'soy_allergy', label: 'Soy Allergy', description: 'Allergic reaction to soybeans and soy-based products', category: 'allergies' },
  { id: 'wheat_allergy', label: 'Wheat Allergy', description: 'Allergic reaction to proteins in wheat (different from celiac)', category: 'allergies' },
  { id: 'fish_allergy', label: 'Fish Allergy', description: 'Allergic reaction to finned fish (salmon, tuna, cod, etc.)', category: 'allergies' },
  { id: 'shellfish_allergy', label: 'Shellfish Allergy', description: 'Allergic reaction to shrimp, crab, lobster, clams, oysters', category: 'allergies' },
  { id: 'sesame_allergy', label: 'Sesame Allergy', description: 'Allergic reaction to sesame seeds and sesame oil', category: 'allergies' },

  // Intolerances
  { id: 'lactose_intolerance', label: 'Lactose Intolerance', description: 'Inability to digest lactose (milk sugar) — affects 65% of global population', category: 'intolerances' },
  { id: 'gluten_sensitivity', label: 'Gluten Sensitivity', description: 'Non-celiac sensitivity to gluten causing digestive symptoms', category: 'intolerances' },
  { id: 'fructose_intolerance', label: 'Fructose Intolerance', description: 'Difficulty digesting fructose (fruit sugar)', category: 'intolerances' },
  { id: 'fodmap_sensitivity', label: 'FODMAP Sensitivity', description: 'Sensitivity to fermentable carbohydrates causing IBS-like symptoms', category: 'intolerances' },
  { id: 'histamine_intolerance', label: 'Histamine Intolerance', description: 'Inability to properly break down histamine in foods', category: 'intolerances' },
  { id: 'sulfite_sensitivity', label: 'Sulfite Sensitivity', description: 'Adverse reaction to sulfites found in wine, dried fruits, etc.', category: 'intolerances' },

  // Medical
  { id: 'celiac_disease', label: 'Celiac Disease', description: 'Autoimmune disorder — requires strict gluten-free diet', category: 'medical' },
  { id: 'type1_diabetes', label: 'Type 1 Diabetes', description: 'Requires careful carbohydrate management and blood sugar monitoring', category: 'medical' },
  { id: 'type2_diabetes', label: 'Type 2 Diabetes', description: 'Requires controlled carb intake, emphasis on low glycemic foods', category: 'medical' },
  { id: 'ckd', label: 'Chronic Kidney Disease', description: 'Requires low sodium, potassium, phosphorus intake', category: 'medical' },
  { id: 'gout', label: 'Gout', description: 'Requires limiting high-purine foods (red meat, organ meats, some seafood)', category: 'medical' },
  { id: 'ibs', label: 'Irritable Bowel Syndrome (IBS)', description: 'Often requires low-FODMAP diet or avoiding trigger foods', category: 'medical' },
  { id: 'crohns', label: "Crohn's Disease", description: 'Inflammatory bowel disease requiring individualized diet', category: 'medical' },
  { id: 'cardiovascular', label: 'Cardiovascular Disease', description: 'Requires low sodium, low saturated fat, heart-healthy diet', category: 'medical' },
  { id: 'fatty_liver', label: 'Fatty Liver Disease', description: 'Requires limiting refined carbs, added sugars, saturated fats', category: 'medical' },

  // Religious / Cultural
  { id: 'halal', label: 'Halal', description: 'Islamic dietary law — no pork, alcohol, non-halal slaughtered meat', category: 'religious' },
  { id: 'kosher', label: 'Kosher', description: 'Jewish dietary law — no pork/shellfish, no mixing meat and dairy', category: 'religious' },
  { id: 'hindu_vegetarian', label: 'Hindu Vegetarian', description: 'Lacto-vegetarian, no beef, often no garlic/onion', category: 'religious' },
  { id: 'buddhist_vegetarian', label: 'Buddhist Vegetarian', description: 'Lacto-vegetarian based on non-violence, no alcohol', category: 'religious' },
  { id: 'jain_vegetarian', label: 'Jain Vegetarian', description: 'Strict vegetarian — no root vegetables, eggs, or honey', category: 'religious' },

  // Lifestyle
  { id: 'vegan', label: 'Vegan', description: 'No animal products — no meat, dairy, eggs, honey', category: 'lifestyle' },
  { id: 'vegetarian', label: 'Vegetarian', description: 'No meat, poultry, or fish — includes dairy and eggs', category: 'lifestyle' },
  { id: 'pescatarian', label: 'Pescatarian', description: 'No meat/poultry — includes fish, seafood, dairy, eggs', category: 'lifestyle' },
  { id: 'keto', label: 'Ketogenic (Keto)', description: 'Very low carb (<50g/day), high fat, moderate protein', category: 'lifestyle' },
  { id: 'paleo', label: 'Paleo', description: 'Whole foods only — no grains, legumes, dairy, processed foods', category: 'lifestyle' },
  { id: 'mediterranean', label: 'Mediterranean', description: 'Emphasis on fruits, vegetables, whole grains, olive oil, fish', category: 'lifestyle' },
  { id: 'low_carb', label: 'Low Carb', description: 'Restricts carbohydrates to 50-150g daily', category: 'lifestyle' },
  { id: 'low_sodium', label: 'Low Sodium', description: 'Limits sodium to under 2,300mg daily', category: 'lifestyle' },
  { id: 'dash', label: 'DASH Diet', description: 'Designed to lower blood pressure — fruits, vegetables, lean protein', category: 'lifestyle' },
  { id: 'aip', label: 'Autoimmune Protocol (AIP)', description: 'Eliminates grains, legumes, nightshades, dairy, eggs, nuts, seeds', category: 'lifestyle' },
  { id: 'whole30', label: 'Whole30', description: '30-day elimination of sugar, alcohol, grains, legumes, dairy', category: 'lifestyle' },
];

export const DIETARY_CATEGORY_LABELS: Record<string, string> = {
  allergies: 'Food Allergies',
  intolerances: 'Food Intolerances',
  medical: 'Medical Conditions',
  religious: 'Religious & Cultural',
  lifestyle: 'Lifestyle & Diet',
};

export const DIETARY_CATEGORY_ICONS: Record<string, string> = {
  allergies: '⚠️',
  intolerances: '🔬',
  medical: '🏥',
  religious: '🙏',
  lifestyle: '🥗',
};
