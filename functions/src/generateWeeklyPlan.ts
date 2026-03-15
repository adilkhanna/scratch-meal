import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { getOpenAIClient } from './shared/openai-client';
import { buildLunchPrompt, buildDinnerPrompt } from './shared/meal-plan-prompts';
import { estimateRecipeCost } from './shared/ingredient-prices';
import { feedToGlossary, inferRegion, inferDietaryTags, queryGlossaryForPlan, getExcludedTags } from './shared/glossary-feeder';
import { selectBreakfasts } from './shared/breakfast-selector';
import { scoreDayBalance, DailyBalanceScore } from './shared/balance-rules';

if (!admin.apps.length) admin.initializeApp();

const DAY_NAMES_3 = ['monday', 'tuesday', 'wednesday'];
const DAY_NAMES_7 = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

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
      memberDietaryConditions,
      familySize,
      lunchCuisines,
      dinnerCuisines,
      dailyCuisines,
      weeklyBudget,
      breakfastPreferences,
      planDays,
      dailyCaloricTarget,
    } = request.data;

    // Validate inputs — ingredients are now optional
    const ingredientList: string[] = Array.isArray(ingredients) ? ingredients : [];
    const numDays = planDays === 7 ? 7 : 3; // Default to 3 for safety
    const family = Math.max(1, Math.min(10, familySize || 1));
    const dayNames = numDays === 7 ? DAY_NAMES_7 : DAY_NAMES_3;

    // Per-day cuisine maps (fallback to global cuisines)
    const dailyCuisineMap: Record<string, { lunch: string; dinner: string }> = dailyCuisines || {};

    // Per-member dietary (fallback to global)
    const memberDietaryMap: Record<string, string[]> = memberDietaryConditions || {};

    // Calorie budget per meal (25% breakfast, 40% lunch, 35% dinner)
    const calorieTarget = dailyCaloricTarget ? Math.max(1200, Math.min(3500, dailyCaloricTarget)) : null;
    const calorieBudget = calorieTarget ? {
      breakfast: Math.round(calorieTarget * 0.25),
      lunch: Math.round(calorieTarget * 0.40),
      dinner: Math.round(calorieTarget * 0.35),
    } : null;

    console.log(`[meal-plan] Starting: ${ingredientList.length} ingredients, ${(dietaryConditions || []).length} dietary, family=${family}, days=${numDays}, perDayCuisines=${Object.keys(dailyCuisineMap).length > 0}`);

    try {
      const { openai, spoonacularKey, mandiPricesEnabled } = await getOpenAIClient();

      // --- Load admin config for glossary threshold ---
      const configSnap = await admin.firestore().doc('admin-config/app').get();
      const glossaryMinThreshold = configSnap.data()?.glossaryMinThreshold || 15;

      // --- Step 1: Check glossary + optionally supplement with Spoonacular ---
      // Collect all cuisines from per-day map + legacy global arrays
      const dailyCuisineValues = Object.values(dailyCuisineMap).flatMap((dc) => [dc.lunch, dc.dinner].filter(Boolean));
      const allCuisines = [...new Set([...(lunchCuisines || []), ...(dinnerCuisines || []), ...dailyCuisineValues])];
      const dietaryTags = inferDietaryTags(dietaryConditions || []);

      // Determine health-condition tags to exclude (e.g., fried for cardiovascular)
      const excludeTags = getExcludedTags(dietaryConditions || []);
      if (excludeTags.length > 0) {
        console.log(`[meal-plan] Health conditions detected — excluding tags: ${excludeTags.join(', ')}`);
      }

      // Query glossary for breakfast, lunch, dinner recipes (fail gracefully)
      type GlossaryResult = Awaited<ReturnType<typeof queryGlossaryForPlan>>;
      const emptyGlossary: GlossaryResult = { recipes: [], hasEnough: false };
      let breakfastGlossary: GlossaryResult = emptyGlossary;
      let lunchGlossary: GlossaryResult = emptyGlossary;
      let dinnerGlossary: GlossaryResult = emptyGlossary;

      try {
        [breakfastGlossary, lunchGlossary, dinnerGlossary] = await Promise.all([
          // Breakfast: query WITHOUT cuisine filter — breakfast isn't cuisine-specific
          queryGlossaryForPlan([], dietaryTags, ['breakfast'], glossaryMinThreshold, excludeTags),
          queryGlossaryForPlan(lunchCuisines || [], dietaryTags, ['lunch'], glossaryMinThreshold, excludeTags),
          queryGlossaryForPlan(dinnerCuisines || [], dietaryTags, ['dinner'], glossaryMinThreshold, excludeTags),
        ]);

        // Widen lunch/dinner queries if too few results (fallback to all cuisines)
        if (lunchGlossary.recipes.length < 10) {
          const widerLunch = await queryGlossaryForPlan([], dietaryTags, ['lunch'], glossaryMinThreshold, excludeTags);
          lunchGlossary = { recipes: [...lunchGlossary.recipes, ...widerLunch.recipes.filter((r) => !lunchGlossary.recipes.some((lr) => lr.name === r.name))], hasEnough: true };
          console.log(`[meal-plan] Widened lunch query: now ${lunchGlossary.recipes.length} recipes`);
        }
        if (dinnerGlossary.recipes.length < 10) {
          const widerDinner = await queryGlossaryForPlan([], dietaryTags, ['dinner'], glossaryMinThreshold, excludeTags);
          dinnerGlossary = { recipes: [...dinnerGlossary.recipes, ...widerDinner.recipes.filter((r) => !dinnerGlossary.recipes.some((dr) => dr.name === r.name))], hasEnough: true };
          console.log(`[meal-plan] Widened dinner query: now ${dinnerGlossary.recipes.length} recipes`);
        }
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
          let searchResults: { id: number }[] = [];

          if (ingredientList.length > 0) {
            // Ingredient-based search (original flow)
            const url = `https://api.spoonacular.com/recipes/findByIngredients?ingredients=${encodeURIComponent(ingredientList.join(','))}&number=20&ranking=1&ignorePantry=true&apiKey=${spoonacularKey}`;
            const res = await fetch(url);
            if (res.ok) {
              searchResults = await res.json();
            } else if (res.status === 402) {
              console.warn('[meal-plan] Spoonacular quota exceeded, proceeding with glossary only');
            }
          } else {
            // No ingredients — use complexSearch with cuisine/diet filters
            const cuisineParam = allCuisines.length > 0 ? `&cuisine=${encodeURIComponent(allCuisines.join(','))}` : '';
            const dietParam = dietaryTags.length > 0 ? `&diet=${encodeURIComponent(dietaryTags[0])}` : '';
            const url = `https://api.spoonacular.com/recipes/complexSearch?number=20${cuisineParam}${dietParam}&addRecipeInformation=true&apiKey=${spoonacularKey}`;
            const res = await fetch(url);
            if (res.ok) {
              const data = await res.json();
              // complexSearch with addRecipeInformation returns full recipe data
              spoonacularRecipes = (data.results || []).slice(0, 15);
              console.log(`[meal-plan] Got ${spoonacularRecipes.length} Spoonacular recipes via complexSearch`);
            } else if (res.status === 402) {
              console.warn('[meal-plan] Spoonacular quota exceeded, proceeding with glossary only');
            }
          }

          // For ingredient-based search, fetch full details
          if (searchResults.length > 0 && ingredientList.length > 0) {
            const topIds = searchResults.slice(0, 15).map((r) => r.id);
            if (topIds.length > 0) {
              const detailsUrl = `https://api.spoonacular.com/recipes/informationBulk?ids=${topIds.join(',')}&apiKey=${spoonacularKey}`;
              const detailsRes = await fetch(detailsUrl);
              if (detailsRes.ok) {
                spoonacularRecipes = await detailsRes.json();
                console.log(`[meal-plan] Got ${spoonacularRecipes.length} Spoonacular recipes via findByIngredients`);
              }
            }
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

      // Build recipe context for lunch/dinner prompts (no breakfast — that's code-selected)
      const lunchContext = [...formatForPrompt(lunchGlossary.recipes), ...spoonacularFormatted].slice(0, 30);
      const dinnerContext = [...formatForPrompt(dinnerGlossary.recipes), ...spoonacularFormatted].slice(0, 30);

      // --- Step 2: Select breakfast (deterministic, NO GPT) ---
      console.log(`[meal-plan] Selecting breakfasts from glossary (${breakfastGlossary.recipes.length} recipes)...`);
      const { breakfastByDay: selectedBreakfasts, breakfastIngredientsByDay } = selectBreakfasts(
        breakfastGlossary.recipes,
        breakfastPreferences || [],
        family,
        numDays,
        dayNames,
        calorieBudget?.breakfast || null,
        weeklyBudget || null,
        dietaryConditions || []
      );
      console.log('[meal-plan] Breakfasts selected (code-level, no GPT)');

      // Build detailed breakfast summary for lunch/dinner ingredient deduplication
      const breakfastSummaryLines: string[] = [];
      for (const day of dayNames) {
        const ingredients = breakfastIngredientsByDay[day] || [];
        breakfastSummaryLines.push(`${day}: ${ingredients.slice(0, 8).join(', ')}`);
      }
      const breakfastSummary = breakfastSummaryLines.join('\n');

      const SYSTEM_MSG = 'You are a professional nutritionist creating meal plans. You MUST only use recipes from the provided reference list — never invent dishes. Always respond with valid JSON.';

      // --- Step 3: Generate lunches ---
      // Build per-day cuisine override maps from dailyCuisineMap
      const lunchCuisineByDay: Record<string, string> = {};
      const dinnerCuisineByDay: Record<string, string> = {};
      for (const day of dayNames) {
        if (dailyCuisineMap[day]?.lunch) lunchCuisineByDay[day] = dailyCuisineMap[day].lunch;
        if (dailyCuisineMap[day]?.dinner) dinnerCuisineByDay[day] = dailyCuisineMap[day].dinner;
      }

      console.log('[meal-plan] Generating lunches...');
      const lunchPrompt = buildLunchPrompt(
        ingredientList,
        dietaryConditions || [],
        family,
        lunchCuisines || [],
        breakfastSummary,
        lunchContext,
        numDays,
        dayNames,
        calorieBudget?.lunch || null,
        breakfastIngredientsByDay,
        weeklyBudget || null,
        lunchCuisineByDay
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

      // Collect lunch ingredients per day for dinner dedup
      const lunchIngredientsByDay: Record<string, string[]> = {};
      for (const lunch of (lunchParsed.lunches || [])) {
        const ingredients = new Set<string>();
        for (const comp of (lunch.components || [])) {
          for (const ing of (comp.ingredients || [])) {
            ingredients.add((ing.name || ing).toString().toLowerCase());
          }
        }
        lunchIngredientsByDay[lunch.day] = [...ingredients];
      }

      // Build combined prior meals ingredient map
      const priorIngredientsByDay: Record<string, string[]> = {};
      for (const day of dayNames) {
        priorIngredientsByDay[day] = [
          ...(breakfastIngredientsByDay[day] || []),
          ...(lunchIngredientsByDay[day] || []),
        ];
      }

      // Build prior meals summary for dinner prompt
      const lunchSummary = (lunchParsed.lunches || []).map((l: { day: string; components: { name: string }[] }) =>
        `${l.day}: ${(l.components || []).map((c: { name: string }) => c.name).join(', ')}`
      ).join('; ');

      // --- Step 4: Generate dinners ---
      console.log('[meal-plan] Generating dinners...');
      const dinnerPrompt = buildDinnerPrompt(
        ingredientList,
        dietaryConditions || [],
        family,
        dinnerCuisines || [],
        `Breakfast: ${breakfastSummary}\nLunch: ${lunchSummary}`,
        dinnerContext,
        numDays,
        dayNames,
        calorieBudget?.dinner || null,
        priorIngredientsByDay,
        weeklyBudget || null,
        dinnerCuisineByDay
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

      // Breakfast is already assembled by selectBreakfasts() — use directly
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const breakfastByDay: Record<string, any> = selectedBreakfasts;

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
        if (breakfast?.memberBreakfasts) {
          for (const mb of breakfast.memberBreakfasts) {
            for (const comp of mb.components) {
              allComponents.push({ component: comp, mealRef: mb, actualMealType: 'breakfast' });
            }
          }
        } else if (breakfast?.options) {
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
          if (meal?.memberBreakfasts) {
            for (const mb of meal.memberBreakfasts) {
              mb.totalCalories = mb.components.reduce((sum: number, c: { nutritionInfo?: { calories: number } }) => sum + (c.nutritionInfo?.calories || 0), 0);
              mb.totalCostPerServing = mb.components.reduce((sum: number, c: { estimatedCostPerServing?: number }) => sum + (c.estimatedCostPerServing || 0), 0);
            }
          } else if (meal?.options) {
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

      // --- Step 6b: Balance scoring (Harvard plate + thali model) ---
      console.log('[meal-plan] Computing balance scores...');
      const balanceScores: Record<string, DailyBalanceScore> = {};
      for (const day of dayNames) {
        // Extract components for each meal
        const bfast = breakfastByDay[day];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let bfastComponents: any[] = [];
        if (bfast?.memberBreakfasts) {
          // Family mode: use first member's components as representative
          bfastComponents = bfast.memberBreakfasts[0]?.components || [];
        } else if (bfast?.components) {
          bfastComponents = bfast.components;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const lunchComponents: any[] = lunchByDay[day]?.components || [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dinnerComponents: any[] = dinnerByDay[day]?.components || [];

        balanceScores[day] = scoreDayBalance(
          bfastComponents,
          lunchComponents,
          dinnerComponents,
          dietaryConditions || []
        );
      }

      const avgBalance = Math.round(
        Object.values(balanceScores).reduce((sum, s) => sum + s.overall, 0) / dayNames.length
      );
      console.log(`[meal-plan] Balance scores computed — weekly average: ${avgBalance}/100`);

      // --- Step 7: Assemble final plan ---
      const days = dayNames.map((day) => ({
        day,
        breakfast: breakfastByDay[day] || { mealType: 'breakfast', components: [], totalCalories: 0, totalCostPerServing: 0 },
        lunch: lunchByDay[day] || { mealType: 'lunch', components: [], totalCalories: 0, totalCostPerServing: 0 },
        dinner: dinnerByDay[day] || { mealType: 'dinner', components: [], totalCalories: 0, totalCostPerServing: 0 },
        balance: balanceScores[day] || null,
      }));

      // Calculate total weekly cost
      let totalWeeklyCost = 0;
      for (const day of days) {
        const meals = [day.breakfast, day.lunch, day.dinner];
        for (const meal of meals) {
          if ('memberBreakfasts' in meal) {
            // Sum all member breakfast costs
            const mbCosts = meal.memberBreakfasts.map((mb: { totalCostPerServing?: number }) => mb.totalCostPerServing || 0);
            totalWeeklyCost += mbCosts.reduce((a: number, b: number) => a + b, 0);
          } else if ('options' in meal) {
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
        ingredients: ingredientList,
        dietaryConditions: dietaryConditions || [],
        lunchCuisines: lunchCuisines || [],
        dinnerCuisines: dinnerCuisines || [],
        days,
        totalWeeklyCost: Math.round(totalWeeklyCost),
        dailyCaloricTarget: calorieTarget,
        weeklyBalanceScore: avgBalance,
        createdAt: now,
      };

      console.log(`[meal-plan] Plan assembled: ${numDays} days, ${allComponents.length} components, est. ₹${plan.totalWeeklyCost}/week`);

      // --- Step 8: Feed to glossary (non-blocking, with validation) ---
      // Only feed recipes whose names match a reference recipe to prevent glossary poisoning
      const referenceNames = new Set([
        ...lunchGlossary.recipes.map((r) => r.name.toLowerCase()),
        ...dinnerGlossary.recipes.map((r) => r.name.toLowerCase()),
        ...breakfastGlossary.recipes.map((r) => r.name.toLowerCase()),
        ...spoonacularRecipes.map((r: { title?: string; name?: string }) => (r.title || r.name || '').toLowerCase()),
      ]);

      const region = inferRegion(allCuisines);
      const glossaryEntries = allComponents
        .filter(({ component }) => referenceNames.has((component.name || '').toLowerCase()))
        .map(({ component, actualMealType }) => ({
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

      console.log(`[meal-plan] Glossary feed: ${glossaryEntries.length} validated of ${allComponents.length} total (rejected ${allComponents.length - glossaryEntries.length} potential hallucinations)`);

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
