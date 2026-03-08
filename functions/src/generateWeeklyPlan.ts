import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { getOpenAIClient } from './shared/openai-client';
import { buildBreakfastPrompt, buildLunchPrompt, buildDinnerPrompt } from './shared/meal-plan-prompts';
import { estimateRecipeCost } from './shared/ingredient-prices';
import { feedToGlossary, inferRegion, inferDietaryTags, queryGlossaryForPlan } from './shared/glossary-feeder';

if (!admin.apps.length) admin.initializeApp();

const DAY_NAMES_3 = ['monday', 'tuesday', 'wednesday'];
const DAY_NAMES_7 = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

// Safe breakfast keywords — only Spoonacular recipes matching these get into breakfast context
const SAFE_BREAKFAST_KEYWORDS = [
  'oatmeal', 'porridge', 'oats', 'eggs', 'egg', 'omelette', 'omelet', 'scramble',
  'toast', 'bread', 'smoothie', 'pancake', 'waffle', 'crepe',
  'dosa', 'idli', 'poha', 'upma', 'cereal', 'paratha', 'granola',
  'french toast', 'muesli', 'yogurt', 'curd', 'fruit', 'banana',
  'uttapam', 'cheela', 'chilla', 'appam', 'puttu', 'sandwich',
  'avocado', 'bagel', 'muffin', 'cornflakes', 'dhokla', 'sabudana',
];

interface BreakfastPref {
  memberName: string;
  preferences: string[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseMealComponents(raw: any[], familySize: number): any[] {
  return (raw || []).map((comp, idx) => ({
    id: `comp-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 8)}`,
    name: comp.name || 'Unnamed Dish',
    description: comp.description || '',
    cookTime: comp.cookTime || '30 min',
    difficulty: comp.difficulty || 'Easy',
    ingredients: comp.ingredients || [],
    instructions: comp.instructions || [],
    tips: comp.tips || [],
    nutritionInfo: comp.nutritionInfo || null,
    estimatedCostPerServing: 0, // calculated later
    servingsScaled: familySize,
    dietaryNotes: comp.dietaryNotes || null,
    isFavorite: false,
  }));
}

export const generateWeeklyPlan = onCall(
  {
    maxInstances: 5,
    timeoutSeconds: 540,
    memory: '1GiB',
    enforceAppCheck: false,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be signed in.');
    }

    const {
      ingredients,
      dietaryConditions,
      familySize,
      lunchCuisines,
      dinnerCuisines,
      weeklyBudget,
      breakfastPreferences,
      planDays,
      dailyCaloricTarget,
    } = request.data;

    // Validate inputs
    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      throw new HttpsError('invalid-argument', 'ingredients array is required.');
    }
    const numDays = planDays === 7 ? 7 : 3; // Default to 3 for safety
    const family = Math.max(1, Math.min(10, familySize || 1));
    const dayNames = numDays === 7 ? DAY_NAMES_7 : DAY_NAMES_3;

    // Calorie budget per meal (25% breakfast, 40% lunch, 35% dinner)
    const calorieTarget = dailyCaloricTarget ? Math.max(1200, Math.min(3500, dailyCaloricTarget)) : null;
    const calorieBudget = calorieTarget ? {
      breakfast: Math.round(calorieTarget * 0.25),
      lunch: Math.round(calorieTarget * 0.40),
      dinner: Math.round(calorieTarget * 0.35),
    } : null;

    console.log(`[meal-plan] Starting: ${ingredients.length} ingredients, ${(dietaryConditions || []).length} dietary, family=${family}, days=${numDays}`);

    try {
      const { openai, spoonacularKey, mandiPricesEnabled } = await getOpenAIClient();

      // --- Load admin config for glossary threshold ---
      const configSnap = await admin.firestore().doc('admin-config/app').get();
      const glossaryMinThreshold = configSnap.data()?.glossaryMinThreshold || 15;

      // --- Step 1: Check glossary + optionally supplement with Spoonacular ---
      const allCuisines = [...new Set([...(lunchCuisines || []), ...(dinnerCuisines || [])])];
      const dietaryTags = inferDietaryTags(dietaryConditions || []);

      // Query glossary for breakfast, lunch, dinner recipes (fail gracefully)
      type GlossaryResult = Awaited<ReturnType<typeof queryGlossaryForPlan>>;
      const emptyGlossary: GlossaryResult = { recipes: [], hasEnough: false };
      let breakfastGlossary: GlossaryResult = emptyGlossary;
      let lunchGlossary: GlossaryResult = emptyGlossary;
      let dinnerGlossary: GlossaryResult = emptyGlossary;

      try {
        [breakfastGlossary, lunchGlossary, dinnerGlossary] = await Promise.all([
          queryGlossaryForPlan(allCuisines, dietaryTags, ['breakfast'], glossaryMinThreshold),
          queryGlossaryForPlan(lunchCuisines || [], dietaryTags, ['lunch'], glossaryMinThreshold),
          queryGlossaryForPlan(dinnerCuisines || [], dietaryTags, ['dinner'], glossaryMinThreshold),
        ]);
      } catch (glossaryErr) {
        console.warn('[meal-plan] Glossary query failed (missing index?), proceeding without glossary:', glossaryErr);
      }

      console.log(`[meal-plan] Glossary: breakfast=${breakfastGlossary.recipes.length} (enough=${breakfastGlossary.hasEnough}), lunch=${lunchGlossary.recipes.length} (enough=${lunchGlossary.hasEnough}), dinner=${dinnerGlossary.recipes.length} (enough=${dinnerGlossary.hasEnough})`);

      // Supplement with Spoonacular if glossary doesn't have enough
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let spoonacularRecipes: any[] = [];
      const needsSpoonacular = !breakfastGlossary.hasEnough || !lunchGlossary.hasEnough || !dinnerGlossary.hasEnough;

      if (needsSpoonacular && spoonacularKey) {
        console.log('[meal-plan] Glossary insufficient, supplementing with Spoonacular...');
        try {
          const url = `https://api.spoonacular.com/recipes/findByIngredients?ingredients=${encodeURIComponent(ingredients.join(','))}&number=20&ranking=1&ignorePantry=true&apiKey=${spoonacularKey}`;
          const res = await fetch(url);
          if (res.ok) {
            const searchResults = await res.json();
            const topIds = searchResults.slice(0, 15).map((r: { id: number }) => r.id);
            if (topIds.length > 0) {
              const detailsUrl = `https://api.spoonacular.com/recipes/informationBulk?ids=${topIds.join(',')}&apiKey=${spoonacularKey}`;
              const detailsRes = await fetch(detailsUrl);
              if (detailsRes.ok) {
                spoonacularRecipes = await detailsRes.json();
                console.log(`[meal-plan] Got ${spoonacularRecipes.length} Spoonacular recipes as supplement`);
              }
            }
          } else if (res.status === 402) {
            console.warn('[meal-plan] Spoonacular quota exceeded, proceeding with glossary only');
          }
        } catch (spoonErr) {
          console.warn('[meal-plan] Spoonacular fetch failed, proceeding with glossary only:', spoonErr);
        }
      }

      // Build recipe context for prompts (mix of glossary + Spoonacular)
      const formatForPrompt = (recipes: { name: string; description: string; cookTime: string; ingredients: { name: string }[]; cuisine: string[]; dietaryTags: string[] }[]) =>
        recipes.map((r) => ({
          name: r.name,
          description: r.description || '',
          cookTime: r.cookTime || '30 min',
          ingredients: (r.ingredients || []).map((i: { name: string }) => i.name),
          cuisine: r.cuisine || [],
          dietaryTags: r.dietaryTags || [],
        }));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const spoonacularFormatted = spoonacularRecipes.map((r: any) => ({
        name: r.title,
        description: r.summary?.replace(/<[^>]*>/g, '').slice(0, 100) || '',
        cookTime: `${r.readyInMinutes} min`,
        ingredients: (r.extendedIngredients || []).map((e: { name: string }) => e.name),
        cuisine: allCuisines.length > 0 ? allCuisines : ['Global'],
        dietaryTags: dietaryTags,
      }));

      // For breakfast: only include Spoonacular recipes that match safe breakfast keywords
      const breakfastSpoonacular = spoonacularFormatted.filter((r: { name: string }) =>
        SAFE_BREAKFAST_KEYWORDS.some((kw) => r.name.toLowerCase().includes(kw))
      );
      const breakfastContext = [...formatForPrompt(breakfastGlossary.recipes), ...breakfastSpoonacular].slice(0, 20);
      const lunchContext = [...formatForPrompt(lunchGlossary.recipes), ...spoonacularFormatted].slice(0, 20);
      const dinnerContext = [...formatForPrompt(dinnerGlossary.recipes), ...spoonacularFormatted].slice(0, 20);

      // --- Step 2: Generate breakfast ---
      console.log('[meal-plan] Generating breakfasts...');
      const breakfastPrompt = buildBreakfastPrompt(
        ingredients,
        dietaryConditions || [],
        family,
        breakfastPreferences || [],
        breakfastContext,
        numDays,
        calorieBudget?.breakfast || null
      );

      const SYSTEM_MSG = 'You are a professional nutritionist creating meal plans. You MUST only use recipes from the provided reference list — never invent dishes. Always respond with valid JSON.';

      const breakfastResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: SYSTEM_MSG },
          { role: 'user', content: breakfastPrompt },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 4000,
        temperature: 0.4,
      });

      const breakfastContent = breakfastResponse.choices?.[0]?.message?.content;
      if (!breakfastContent) throw new Error('No breakfast response from AI');
      const breakfastParsed = JSON.parse(breakfastContent);
      console.log('[meal-plan] Breakfasts generated');

      // Build breakfast summary for lunch prompt
      const breakfastSummary = family > 1
        ? `Family has ${(breakfastParsed.breakfastOptions || []).length} breakfast options to choose from (rotating daily).`
        : (breakfastParsed.breakfastTemplates || []).map((t: { templateLabel: string; assignedDays: string[] }) =>
            `${t.templateLabel}: ${t.assignedDays?.join(', ')}`
          ).join('; ');

      // --- Step 3: Generate lunches ---
      console.log('[meal-plan] Generating lunches...');
      const lunchPrompt = buildLunchPrompt(
        ingredients,
        dietaryConditions || [],
        family,
        lunchCuisines || [],
        breakfastSummary,
        lunchContext,
        numDays,
        dayNames,
        calorieBudget?.lunch || null
      );

      const lunchResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: SYSTEM_MSG },
          { role: 'user', content: lunchPrompt },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 6000,
        temperature: 0.4,
      });

      const lunchContent = lunchResponse.choices?.[0]?.message?.content;
      if (!lunchContent) throw new Error('No lunch response from AI');
      const lunchParsed = JSON.parse(lunchContent);
      console.log('[meal-plan] Lunches generated');

      // Build prior meals summary for dinner prompt
      const lunchSummary = (lunchParsed.lunches || []).map((l: { day: string; components: { name: string }[] }) =>
        `${l.day}: ${(l.components || []).map((c: { name: string }) => c.name).join(', ')}`
      ).join('; ');

      // --- Step 4: Generate dinners ---
      console.log('[meal-plan] Generating dinners...');
      const dinnerPrompt = buildDinnerPrompt(
        ingredients,
        dietaryConditions || [],
        family,
        dinnerCuisines || [],
        `Breakfast: ${breakfastSummary}\nLunch: ${lunchSummary}`,
        dinnerContext,
        numDays,
        dayNames,
        calorieBudget?.dinner || null
      );

      const dinnerResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: SYSTEM_MSG },
          { role: 'user', content: dinnerPrompt },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 6000,
        temperature: 0.4,
      });

      const dinnerContent = dinnerResponse.choices?.[0]?.message?.content;
      if (!dinnerContent) throw new Error('No dinner response from AI');
      const dinnerParsed = JSON.parse(dinnerContent);
      console.log('[meal-plan] Dinners generated');

      // --- Step 5: Assemble the plan ---
      console.log('[meal-plan] Assembling plan...');
      const isFamily = family > 1;

      // Build breakfast structure
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let breakfastByDay: Record<string, any>;

      if (isFamily) {
        // Family mode: same options every day
        const options = (breakfastParsed.breakfastOptions || []).map((opt: { optionLabel: string; components: unknown[] }) => ({
          mealType: 'breakfast',
          components: parseMealComponents(opt.components, family),
          totalCalories: 0,
          totalCostPerServing: 0,
        }));
        breakfastByDay = {};
        for (const day of dayNames) {
          breakfastByDay[day] = { options };
        }
      } else {
        // Individual mode: templates assigned to specific days
        breakfastByDay = {};
        const templates = breakfastParsed.breakfastTemplates || [];
        for (const template of templates) {
          const components = parseMealComponents(template.components, family);
          const meal = { mealType: 'breakfast' as const, components, totalCalories: 0, totalCostPerServing: 0 };
          for (const day of (template.assignedDays || [])) {
            if (dayNames.includes(day)) {
              breakfastByDay[day] = meal;
            }
          }
        }
        // Fill any unassigned days with the first template
        for (const day of dayNames) {
          if (!breakfastByDay[day] && templates.length > 0) {
            breakfastByDay[day] = {
              mealType: 'breakfast',
              components: parseMealComponents(templates[0].components, family),
              totalCalories: 0,
              totalCostPerServing: 0,
            };
          }
        }
      }

      // Build lunch & dinner by day
      const lunchByDay: Record<string, { mealType: string; components: unknown[]; totalCalories: number; totalCostPerServing: number }> = {};
      for (const lunch of (lunchParsed.lunches || [])) {
        lunchByDay[lunch.day] = {
          mealType: 'lunch',
          components: parseMealComponents(lunch.components, family),
          totalCalories: 0,
          totalCostPerServing: 0,
        };
      }

      const dinnerByDay: Record<string, { mealType: string; components: unknown[]; totalCalories: number; totalCostPerServing: number }> = {};
      for (const dinner of (dinnerParsed.dinners || [])) {
        dinnerByDay[dinner.day] = {
          mealType: 'dinner',
          components: parseMealComponents(dinner.components, family),
          totalCalories: 0,
          totalCostPerServing: 0,
        };
      }

      // --- Step 6: Cost estimation ---
      console.log('[meal-plan] Estimating costs...');
      const useMandiPrices = mandiPricesEnabled === true;
      let pricesAsOf: string | null = null;

      // Collect all components for cost estimation (track meal type for glossary)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allComponents: { component: any; mealRef: any; actualMealType: 'breakfast' | 'lunch' | 'dinner' }[] = [];

      for (const day of dayNames) {
        const breakfast = breakfastByDay[day];
        if (breakfast?.options) {
          for (const opt of breakfast.options) {
            for (const comp of opt.components) {
              allComponents.push({ component: comp, mealRef: opt, actualMealType: 'breakfast' });
            }
          }
        } else if (breakfast?.components) {
          for (const comp of breakfast.components) {
            allComponents.push({ component: comp, mealRef: breakfast, actualMealType: 'breakfast' });
          }
        }
        if (lunchByDay[day]) {
          for (const comp of lunchByDay[day].components) {
            allComponents.push({ component: comp, mealRef: lunchByDay[day], actualMealType: 'lunch' });
          }
        }
        if (dinnerByDay[day]) {
          for (const comp of dinnerByDay[day].components) {
            allComponents.push({ component: comp, mealRef: dinnerByDay[day], actualMealType: 'dinner' });
          }
        }
      }

      // Estimate costs in parallel batches
      await Promise.all(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        allComponents.map(async ({ component }: { component: any }) => {
          try {
            const servings = component.nutritionInfo?.servings || family;
            const { costPerServing, pricesAsOf: pao } = await estimateRecipeCost(
              component.ingredients || [],
              servings,
              useMandiPrices
            );
            component.estimatedCostPerServing = costPerServing;
            if (pao && !pricesAsOf) pricesAsOf = pao;
          } catch {
            component.estimatedCostPerServing = 0;
          }
        })
      );

      // Calculate meal-level totals
      for (const day of dayNames) {
        const meals = [breakfastByDay[day], lunchByDay[day], dinnerByDay[day]].filter(Boolean);
        for (const meal of meals) {
          if (meal?.options) {
            for (const opt of meal.options) {
              opt.totalCalories = opt.components.reduce((sum: number, c: { nutritionInfo?: { calories: number } }) => sum + (c.nutritionInfo?.calories || 0), 0);
              opt.totalCostPerServing = opt.components.reduce((sum: number, c: { estimatedCostPerServing?: number }) => sum + (c.estimatedCostPerServing || 0), 0);
            }
          } else if (meal?.components) {
            meal.totalCalories = meal.components.reduce((sum: number, c: { nutritionInfo?: { calories: number } }) => sum + (c.nutritionInfo?.calories || 0), 0);
            meal.totalCostPerServing = meal.components.reduce((sum: number, c: { estimatedCostPerServing?: number }) => sum + (c.estimatedCostPerServing || 0), 0);
          }
        }
      }

      // --- Step 7: Assemble final plan ---
      const days = dayNames.map((day) => ({
        day,
        breakfast: breakfastByDay[day] || { mealType: 'breakfast', components: [], totalCalories: 0, totalCostPerServing: 0 },
        lunch: lunchByDay[day] || { mealType: 'lunch', components: [], totalCalories: 0, totalCostPerServing: 0 },
        dinner: dinnerByDay[day] || { mealType: 'dinner', components: [], totalCalories: 0, totalCostPerServing: 0 },
      }));

      // Calculate total weekly cost
      let totalWeeklyCost = 0;
      for (const day of days) {
        const meals = [day.breakfast, day.lunch, day.dinner];
        for (const meal of meals) {
          if ('options' in meal) {
            // Use average of options for weekly cost estimate
            const optCosts = meal.options.map((o: { totalCostPerServing?: number }) => o.totalCostPerServing || 0);
            totalWeeklyCost += optCosts.length > 0 ? optCosts.reduce((a: number, b: number) => a + b, 0) / optCosts.length : 0;
          } else {
            totalWeeklyCost += (meal as { totalCostPerServing?: number }).totalCostPerServing || 0;
          }
        }
      }

      const now = new Date().toISOString();
      const weekId = getWeekId(new Date());

      const plan = {
        id: `plan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        weekId,
        familySize: family,
        planDays: numDays,
        ingredients,
        dietaryConditions: dietaryConditions || [],
        lunchCuisines: lunchCuisines || [],
        dinnerCuisines: dinnerCuisines || [],
        days,
        totalWeeklyCost: Math.round(totalWeeklyCost),
        dailyCaloricTarget: calorieTarget,
        createdAt: now,
      };

      console.log(`[meal-plan] Plan assembled: ${numDays} days, ${allComponents.length} components, est. ₹${plan.totalWeeklyCost}/week`);

      // --- Step 8: Feed to glossary (non-blocking) ---
      const region = inferRegion(allCuisines);
      const glossaryEntries = allComponents.map(({ component, actualMealType }) => ({
        name: component.name,
        description: component.description,
        cookTime: component.cookTime,
        difficulty: component.difficulty,
        ingredients: component.ingredients,
        instructions: component.instructions,
        tips: component.tips || [],
        nutritionInfo: component.nutritionInfo,
        cuisine: allCuisines.length > 0 ? allCuisines : ['Global'],
        dietaryTags,
        mealTypes: [actualMealType],
        region,
        source: 'spoonacular' as const,
      }));

      // Non-blocking glossary feed
      feedToGlossary(glossaryEntries).catch((err) =>
        console.error('[meal-plan] Glossary feed error (non-blocking):', err)
      );

      return { plan, pricesAsOf };
    } catch (err: unknown) {
      console.error('[meal-plan] Error:', err);
      const message = err instanceof Error ? err.message : 'Failed to generate meal plan';
      if (message === 'SPOONACULAR_QUOTA_EXCEEDED') {
        throw new HttpsError('resource-exhausted', 'Daily recipe limit reached. Please try again tomorrow!');
      }
      if (message.includes('not configured')) {
        throw new HttpsError('failed-precondition', 'Service temporarily unavailable. Please try again later.');
      }
      throw new HttpsError('internal', message);
    }
  }
);

function getWeekId(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}
