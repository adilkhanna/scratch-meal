/**
 * GPT-4o prompt builders for weekly meal plan generation.
 * Breakfast is code-selected (no GPT). Lunch/dinner use GPT with strict anti-hallucination rules.
 * Each prompt uses glossary/Spoonacular recipes as RAG context.
 */

import * as fs from 'fs';
import * as path from 'path';
import { EXPENSIVE_INGREDIENTS } from './breakfast-selector';
import { buildBalancedPlateInstructions } from './balance-rules';

// Load regional ingredients data once at module level
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let regionalData: Record<string, any> = {};
try {
  const dataPath = path.join(__dirname, '../../data/regional-ingredients.json');
  regionalData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
} catch {
  // Gracefully handle missing file (e.g., during tests)
  regionalData = {};
}

const CUISINE_TO_REGION: Record<string, string> = {
  indian: 'south-asian',
  italian: 'mediterranean',
  chinese: 'east-asian',
  japanese: 'east-asian',
  mexican: 'mexican',
  thai: 'east-asian',
  mediterranean: 'mediterranean',
  american: 'american',
  korean: 'east-asian',
  french: 'mediterranean',
  middle_eastern: 'middle-eastern',
  vietnamese: 'east-asian',
};

function getRegionalContext(cuisines: string[]): string {
  if (cuisines.length === 0) return '';
  const regions = [...new Set(cuisines.map((c) => CUISINE_TO_REGION[c]).filter(Boolean))];
  if (regions.length === 0) return '';

  const lines: string[] = [];
  for (const region of regions) {
    const data = regionalData[region];
    if (!data) continue;
    lines.push(`For ${region.replace('-', ' ')} cuisine:`);
    if (data.preferred_vegetables?.length) {
      lines.push(`  PREFER these native vegetables: ${data.preferred_vegetables.slice(0, 20).join(', ')}`);
    }
    if (data.preferred_lentils?.length) {
      lines.push(`  PREFER these lentils/legumes: ${data.preferred_lentils.join(', ')}`);
    }
    if (data.avoid?.length) {
      lines.push(`  AVOID these non-native ingredients in substitutions: ${data.avoid.join(', ')}`);
    }
    if (data.note) {
      lines.push(`  Note: ${data.note}`);
    }
  }

  return lines.length > 0
    ? `\nREGIONAL INGREDIENT GUIDANCE (use native ingredients for authentic recipes, avoid non-native substitutions):\n${lines.join('\n')}\n`
    : '';
}

interface RecipeContext {
  name: string;
  description: string;
  cookTime: string;
  ingredients: string[];
  cuisine: string[];
  dietaryTags: string[];
}

function formatRecipeContext(recipes: RecipeContext[]): string {
  if (recipes.length === 0) {
    return 'WARNING: No reference recipes provided. You MUST only suggest well-known, widely-recognized traditional dishes that any chef would know. Do NOT invent new dish names or combine ingredients in novel ways. Every dish must be a real, established recipe.';
  }
  return recipes
    .map(
      (r, i) =>
        `${i + 1}. "${r.name}" (${r.cookTime}) — ${r.description}\n   Ingredients: ${r.ingredients.join(', ')}\n   Cuisine: ${r.cuisine.join(', ')} | Tags: ${r.dietaryTags.join(', ')}`
    )
    .join('\n\n');
}

function formatIngredientsSection(ingredients: string[]): string {
  if (ingredients.length === 0) {
    return `AVAILABLE INGREDIENTS:
No specific ingredients provided. Use commonly available ingredients appropriate for the selected cuisines and dietary requirements. The grocery list will be generated from the recipes you choose.`;
  }
  return `AVAILABLE INGREDIENTS:
${ingredients.map((i) => `- ${i}`).join('\n')}`;
}

function formatIngredientExclusions(ingredientsByDay: Record<string, string[]>, dayNames: string[], label: string): string {
  const lines: string[] = [];
  for (const day of dayNames) {
    const ingredients = ingredientsByDay[day] || [];
    if (ingredients.length > 0) {
      lines.push(`  ${day}: ${ingredients.slice(0, 10).join(', ')}`);
    }
  }
  if (lines.length === 0) return '';
  return `\nINGREDIENT EXCLUSIONS PER DAY (do NOT repeat these ${label} ingredients in this meal):
${lines.join('\n')}
IMPORTANT: If breakfast uses avocado on Monday, do NOT use avocado in Monday's lunch or dinner. Vary the key ingredients across meals each day.\n`;
}

function formatBudgetGuidance(weeklyBudget: number | null): string {
  if (!weeklyBudget) return '';
  if (weeklyBudget <= 1500) {
    return `\nBUDGET CONSTRAINT: Weekly budget is ₹${weeklyBudget}. AVOID expensive ingredients: ${EXPENSIVE_INGREDIENTS.slice(0, 10).join(', ')}. Use economical alternatives (e.g., banana instead of avocado, regular oats instead of quinoa, chicken instead of salmon).\n`;
  }
  if (weeklyBudget <= 3000) {
    return `\nBUDGET NOTE: Weekly budget is ₹${weeklyBudget}. LIMIT expensive ingredients (avocado, quinoa, salmon, prawns) to max 1-2 uses across the entire week.\n`;
  }
  return '';
}

const MEAL_COMPONENT_SCHEMA = `{
  "name": "Dish Name",
  "description": "Brief 1-sentence description",
  "cookTime": "15 min",
  "difficulty": "Easy",
  "ingredients": [
    { "name": "ingredient", "quantity": "1", "unit": "cup" }
  ],
  "instructions": ["Step 1...", "Step 2..."],
  "tips": ["One helpful tip"],
  "nutritionInfo": {
    "servings": 2,
    "calories": 250,
    "protein": "12g",
    "carbs": "30g",
    "fat": "8g"
  },
  "dietaryNotes": "Used oat milk instead of regular milk (lactose intolerant)",
  "explanation": "Brief 1-sentence reason this dish was chosen (e.g., 'High-protein paneer pairs with fiber-rich dal for sustained energy; cool raita balances the spicy curry.')"
}
IMPORTANT: "calories" MUST be PER PERSON (per single serving), NOT total for the whole family.
For example, if a dish is cooked for 4 people and the pot totals 2000 cal, report 500 cal per person.
REMINDER: Always divide total dish calories by the number of servings to get per-person calories.`;

const ANTI_HALLUCINATION_RULES = `
CRITICAL ANTI-HALLUCINATION RULES:
- Every dish you suggest MUST be a real, recognizable dish that exists in cookbooks or food websites.
- Do NOT combine random ingredients into novel creations (no "Corn Avocado Salsa with Smoothie", no "Spinach Banana Oat Bowl", no "Paneer Quinoa Wrap with Mango").
- Do NOT invent new dish names. Use established names only (e.g., "Dal Tadka", "Pasta Primavera", "Tom Yum Soup").
- If adapting for dietary needs, make MINIMAL substitutions only — the dish identity must remain the same.
- When in doubt, pick a simpler, more traditional dish rather than a creative combination.`;

const APPETIZING_RULES = `
TASTE & APPETIZING RULES (CRITICAL — meals must sound and taste delicious):
Think like a HOME COOK who loves feeding their family, NOT a hospital cafeteria.

FLAVOR PAIRING PRINCIPLES:
- Every meal needs a FLAVOR ANCHOR: a well-spiced, richly flavored hero dish (e.g., Butter Dal, Chicken Tikka, Pasta Arrabbiata — not "boiled chicken breast")
- Pair rich/heavy with light/fresh: creamy dal pairs with light cucumber raita, rich biryani pairs with fresh raita + salad
- Pair spicy with cooling: spicy curry pairs with yogurt-based side, not another spicy dish
- Pair dry with wet: dry sabzi or roti pairs with a saucy dal or gravy curry, not another dry dish
- NEVER pair bland with bland: "plain brown rice + steamed broccoli + boiled peas" is NOT a meal anyone wants to eat

BANNED COMBINATIONS (these are unappetizing):
- Plain boiled vegetables as the main vegetable dish (always season/cook with spices, garlic, or a proper recipe)
- Brown rice + steamed vegetables with no sauce/gravy (needs a flavorful curry or dal alongside)
- Multiple beige/bland dishes in one meal (e.g., plain rice + plain dal + plain roti)
- "Grilled chicken breast" with no marinade, seasoning, or sauce specified
- Raw vegetable sticks as a "vegetable component" (use a proper cooked sabzi, stir-fry, or roasted preparation)

WHAT MAKES A MEAL APPETIZING:
- Indian: well-tempered dal (with tadka/tempering), spiced sabzi (not steamed), fresh roti, tangy raita — like your mother would cook
- Mediterranean: herb-marinated protein, olive oil roasted vegetables, warm pita — flavors of the coast
- East Asian: stir-fried (not steamed) vegetables with garlic/soy/ginger, aromatic rice, a proper sauce
- Mexican: well-seasoned beans, flavorful rice (not plain), fresh salsa with lime
- Western: properly seasoned protein with a sauce or glaze, roasted (not boiled) vegetables

EVERY dish name should sound like something you'd order at a good restaurant or find in a popular food blog.`;


function formatMemberAdaptations(memberMinorityConditions: Record<string, string[]>): string {
  const members = Object.entries(memberMinorityConditions).filter(([, conds]) => conds.length > 0);
  if (members.length === 0) return '';
  return `
PER-MEMBER DIETARY ADAPTATIONS:
The main dishes above satisfy the shared/common dietary conditions.
The following family members have ADDITIONAL conditions that may conflict with some dishes:
${members.map(([name, conds]) => `- ${name}: ${conds.join(', ')}`).join('\n')}

RULES FOR MEMBER ALTERNATIVES:
- For each dish where a member's additional condition DIRECTLY CONFLICTS with a key ingredient (e.g., main uses cream cheese but member is lactose intolerant), provide ONE alternate version in "memberAlts".
- Only provide an alt when truly needed — if the main dish already works for everyone, do NOT create unnecessary alts.
- Maximum 1 alt per conflicting dish per member. Keep the alt as close to the original as possible (same cuisine, similar flavor profile).
- The alt component follows the same MEAL_COMPONENT schema.
`;
}

export function buildLunchPrompt(
  ingredients: string[],
  dietaryConditions: string[],
  familySize: number,
  lunchCuisines: string[],
  breakfastSummary: string,
  glossaryRecipes: RecipeContext[],
  planDays: number,
  dayNames: string[],
  calorieTarget: number | null,
  breakfastIngredientsByDay: Record<string, string[]>,
  weeklyBudget: number | null,
  dailyCuisineOverrides: Record<string, string> = {}, // day → cuisine ID
  memberMinorityConditions: Record<string, string[]> = {} // member → unique conditions
): string {
  // Build per-day cuisine instructions
  const hasPerDay = Object.keys(dailyCuisineOverrides).length > 0 && Object.values(dailyCuisineOverrides).some(Boolean);
  const perDayCuisineLines = hasPerDay
    ? dayNames.map((d) => `  ${d}: ${dailyCuisineOverrides[d] || 'diverse (your choice)'}`).join('\n')
    : '';
  const allPerDayCuisines = hasPerDay ? [...new Set(Object.values(dailyCuisineOverrides).filter(Boolean))] : [];

  return `You are a professional nutritionist and chef planning lunches for ${familySize === 1 ? 'an individual' : `a family of ${familySize}`} for ${planDays} days.

${formatIngredientsSection(ingredients)}

DIETARY CONSTRAINTS (MUST FOLLOW ALL):
${dietaryConditions.length > 0 ? dietaryConditions.map((c) => `- ${c}`).join('\n') : '- None'}

${hasPerDay ? `PER-DAY CUISINE SCHEDULE FOR LUNCH:
${perDayCuisineLines}
CRITICAL: Each day's lunch MUST follow the cuisine specified above. If a day says "indian", ALL components must be Indian. If "diverse", pick any cuisine but keep all components consistent.` : `CUISINE PREFERENCES FOR LUNCH:
${lunchCuisines.length > 0 ? lunchCuisines.join(', ') : 'Diverse (mix of cuisines)'}
${lunchCuisines.length > 0 ? `CRITICAL: ALL lunch dishes MUST be ${lunchCuisines.join(' or ')} cuisine. Every component (main dish, side, accompaniment) must belong to these cuisines. Do NOT suggest dishes from other cuisines for lunch.` : ''}`}
${getRegionalContext(hasPerDay ? allPerDayCuisines : lunchCuisines)}
BREAKFAST INGREDIENTS (do NOT repeat these in lunch):
${breakfastSummary}
${formatIngredientExclusions(breakfastIngredientsByDay, dayNames, 'breakfast')}${formatBudgetGuidance(weeklyBudget)}
REFERENCE RECIPES (you MUST select dishes from this list — adapt minimally for dietary needs):
${formatRecipeContext(glossaryRecipes)}
${calorieTarget ? `
CALORIE TARGET:
Each lunch should total approximately ${calorieTarget} calories PER PERSON (not total for the family). All nutritionInfo.calories values must be per single serving.` : ''}
${ANTI_HALLUCINATION_RULES}
${APPETIZING_RULES}
${buildBalancedPlateInstructions(dietaryConditions)}
REQUIREMENTS:
1. Generate ${planDays} lunches, one for each day: ${dayNames.join(', ')}
2. Each lunch MUST have 3-4 components following the balanced plate: a protein dish + a vegetable dish + a grain + optionally a probiotic (raita/curd/kimchi/salad). NEVER serve all-carb or all-protein meals.
3. You MUST select dishes from the REFERENCE RECIPES list above. Pick the closest match and adapt minimally for cuisine/dietary needs. Do NOT invent new dish names.
4. Follow the BALANCED PLATE RULES above — every lunch needs vegetables, protein, AND whole grains in the right proportions.
5. Vary the dishes across days — don't repeat the same main dish
6. Scale ingredient quantities for ${familySize} ${familySize === 1 ? 'person' : 'people'}, but report nutritionInfo.calories PER PERSON
7. Include "dietaryNotes" for any substitutions
8. For Indian meals: follow the thali model — dal/protein + sabzi + roti/rice + raita/curd. This is non-negotiable.
9. For Western meals: protein + whole grain + substantial vegetable side. A meal of just pasta or just sandwich is NOT balanced.
10. For East Asian meals: rice/noodle + protein + 2 vegetable sides (or a soup with vegetables).
${lunchCuisines.length > 0 ? `11. CUISINE RULE: Every single dish must be authentically ${lunchCuisines.join('/')}. This overrides reference recipe suggestions if they don't match the cuisine.` : ''}
12. Include a brief "explanation" for EACH component explaining WHY this dish was chosen (nutrition balance, flavor pairing, dietary fit, or cuisine authenticity). Max 1 sentence.
${formatMemberAdaptations(memberMinorityConditions)}
Return ONLY a JSON object:
{
  "lunches": [
    {
      "day": "monday",
      "components": [MEAL_COMPONENT, MEAL_COMPONENT, ...]${Object.keys(memberMinorityConditions).length > 0 ? `,
      "memberAlts": {
        "0": [{ "memberName": "Name", "conditions": ["condition"], "component": MEAL_COMPONENT }]
      }` : ''}
    }
  ]
}
${Object.keys(memberMinorityConditions).length > 0 ? 'NOTE: "memberAlts" keys are component indices (as strings). Only include memberAlts when a specific component conflicts with a member\'s conditions. Omit memberAlts entirely if no conflicts exist for that day.' : ''}

Each MEAL_COMPONENT follows this exact schema:
${MEAL_COMPONENT_SCHEMA}`;
}

export function buildDinnerPrompt(
  ingredients: string[],
  dietaryConditions: string[],
  familySize: number,
  dinnerCuisines: string[],
  priorMealsSummary: string,
  glossaryRecipes: RecipeContext[],
  planDays: number,
  dayNames: string[],
  calorieTarget: number | null,
  priorIngredientsByDay: Record<string, string[]>,
  weeklyBudget: number | null,
  dailyCuisineOverrides: Record<string, string> = {}, // day → cuisine ID
  memberMinorityConditions: Record<string, string[]> = {} // member → unique conditions
): string {
  // Build per-day cuisine instructions
  const hasPerDay = Object.keys(dailyCuisineOverrides).length > 0 && Object.values(dailyCuisineOverrides).some(Boolean);
  const perDayCuisineLines = hasPerDay
    ? dayNames.map((d) => `  ${d}: ${dailyCuisineOverrides[d] || 'diverse (your choice)'}`).join('\n')
    : '';
  const allPerDayCuisines = hasPerDay ? [...new Set(Object.values(dailyCuisineOverrides).filter(Boolean))] : [];

  return `You are a professional nutritionist and chef planning dinners for ${familySize === 1 ? 'an individual' : `a family of ${familySize}`} for ${planDays} days.

${formatIngredientsSection(ingredients)}

DIETARY CONSTRAINTS (MUST FOLLOW ALL):
${dietaryConditions.length > 0 ? dietaryConditions.map((c) => `- ${c}`).join('\n') : '- None'}

${hasPerDay ? `PER-DAY CUISINE SCHEDULE FOR DINNER:
${perDayCuisineLines}
CRITICAL: Each day's dinner MUST follow the cuisine specified above. If a day says "indian", ALL components must be Indian. If "diverse", pick any cuisine but keep all components consistent.` : `CUISINE PREFERENCES FOR DINNER:
${dinnerCuisines.length > 0 ? dinnerCuisines.join(', ') : 'Diverse (mix of cuisines)'}
${dinnerCuisines.length > 0 ? `CRITICAL: ALL dinner dishes MUST be ${dinnerCuisines.join(' or ')} cuisine. Every component must belong to these cuisines. Do NOT suggest dishes from other cuisines for dinner.` : ''}`}
${getRegionalContext(hasPerDay ? allPerDayCuisines : dinnerCuisines)}
TODAY'S BREAKFAST & LUNCH (vary dinner to avoid repetition and balance nutrition):
${priorMealsSummary}
${formatIngredientExclusions(priorIngredientsByDay, dayNames, 'breakfast + lunch')}${formatBudgetGuidance(weeklyBudget)}
REFERENCE RECIPES (you MUST select dishes from this list — adapt minimally for dietary needs):
${formatRecipeContext(glossaryRecipes)}
${calorieTarget ? `
CALORIE TARGET:
Each dinner should total approximately ${calorieTarget} calories PER PERSON (not total for the family). All nutritionInfo.calories values must be per single serving.` : ''}
${ANTI_HALLUCINATION_RULES}
${APPETIZING_RULES}
${buildBalancedPlateInstructions(dietaryConditions)}
REQUIREMENTS:
1. Generate ${planDays} dinners, one for each day: ${dayNames.join(', ')}
2. Each dinner MUST have 3-4 components following the balanced plate: a protein dish + a vegetable dish + a grain + optionally a probiotic or light soup. NEVER serve all-carb or all-protein meals.
3. You MUST select dishes from the REFERENCE RECIPES list above. Pick the closest match and adapt minimally for cuisine/dietary needs. Do NOT invent new dish names.
4. Follow the BALANCED PLATE RULES — dinners should be lighter than lunches but still cover all food groups (protein + vegetables + grain).
5. Do NOT repeat lunch dishes — vary proteins and cooking styles. If lunch had chicken, dinner should have dal/fish/paneer/tofu.
6. Scale ingredient quantities for ${familySize} ${familySize === 1 ? 'person' : 'people'}, but report nutritionInfo.calories PER PERSON
7. Include "dietaryNotes" for any substitutions
8. For Indian dinners: lighter thali — dal/protein + sabzi + roti (lighter on rice at night). Include raita or salad.
9. For Western dinners: lean protein + vegetable + light grain. Soup + salad is acceptable for lighter dinners.
10. For East Asian dinners: rice/noodle + protein + soup + vegetable side.
${hasPerDay ? `11. CUISINE RULE: Each day MUST follow its assigned cuisine above. All components for that day must be authentically from the assigned cuisine.` : (dinnerCuisines.length > 0 ? `11. CUISINE RULE: Every single dish must be authentically ${dinnerCuisines.join('/')}. This overrides reference recipe suggestions if they don't match the cuisine.` : '')}
12. Include a brief "explanation" for EACH component explaining WHY this dish was chosen (nutrition balance, flavor pairing, dietary fit, or cuisine authenticity). Max 1 sentence.
${formatMemberAdaptations(memberMinorityConditions)}
Return ONLY a JSON object:
{
  "dinners": [
    {
      "day": "monday",
      "components": [MEAL_COMPONENT, MEAL_COMPONENT, ...]${Object.keys(memberMinorityConditions).length > 0 ? `,
      "memberAlts": {
        "0": [{ "memberName": "Name", "conditions": ["condition"], "component": MEAL_COMPONENT }]
      }` : ''}
    }
  ]
}
${Object.keys(memberMinorityConditions).length > 0 ? 'NOTE: "memberAlts" keys are component indices (as strings). Only include memberAlts when a specific component conflicts with a member\'s conditions. Omit memberAlts entirely if no conflicts exist for that day.' : ''}

Each MEAL_COMPONENT follows this exact schema:
${MEAL_COMPONENT_SCHEMA}`;
}
