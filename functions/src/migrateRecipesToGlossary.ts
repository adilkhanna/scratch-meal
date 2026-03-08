/**
 * One-time migration: reads all saved user recipes from Firestore
 * and adds them to the recipe-glossary collection.
 * These are Spoonacular-verified recipes that real users generated.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { inferRegion } from './shared/glossary-feeder';

if (!admin.apps.length) admin.initializeApp();

export const migrateUserRecipesToGlossary = onCall(
  {
    maxInstances: 1,
    timeoutSeconds: 300,
    memory: '1GiB',
    enforceAppCheck: false,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be signed in.');
    }

    // Check admin
    const configSnap = await admin.firestore().doc('admin-config/app').get();
    const adminUids = configSnap.data()?.adminUids || [];
    if (!adminUids.includes(request.auth.uid)) {
      throw new HttpsError('permission-denied', 'Admin access required.');
    }

    const db = admin.firestore();
    const glossaryCol = db.collection('recipe-glossary');

    // Get all users
    const usersSnap = await db.collection('users').get();
    console.log(`[migrate-recipes] Found ${usersSnap.size} users`);

    let addedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const seenNames = new Set<string>();

    for (const userDoc of usersSnap.docs) {
      const recipesSnap = await db
        .collection('users')
        .doc(userDoc.id)
        .collection('recipes')
        .get();

      for (const recipeDoc of recipesSnap.docs) {
        try {
          const recipe = recipeDoc.data();
          if (!recipe.name) {
            skippedCount++;
            continue;
          }

          // Deduplicate by name (case-insensitive)
          const nameKey = recipe.name.toLowerCase().trim();
          if (seenNames.has(nameKey)) {
            skippedCount++;
            continue;
          }
          seenNames.add(nameKey);

          // Generate glossary ID
          const slug = nameKey
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .slice(0, 50);
          const glossaryId = `user-${slug}`;

          // Check if already in glossary
          const existing = await glossaryCol.doc(glossaryId).get();
          if (existing.exists) {
            // Bump useCount
            await glossaryCol.doc(glossaryId).update({
              useCount: (existing.data()?.useCount || 0) + 1,
              lastUsedAt: new Date().toISOString(),
            });
            skippedCount++;
            continue;
          }

          // Infer cuisine from the recipe's data
          const cuisines: string[] = [];
          if (recipe.dietaryConditions?.some((c: string) =>
            ['hindu_vegetarian', 'jain_vegetarian'].includes(c)
          )) {
            cuisines.push('Indian');
          }
          // Try to infer from recipe name or existing fields
          if (cuisines.length === 0) {
            cuisines.push('Global');
          }

          // Infer dietary tags
          const dietaryTags: string[] = [];
          if (recipe.dietaryConditions) {
            for (const condition of recipe.dietaryConditions) {
              if (condition.includes('vegan')) dietaryTags.push('vegan');
              if (condition.includes('vegetarian')) dietaryTags.push('vegetarian');
              if (condition.includes('gluten') || condition.includes('celiac')) dietaryTags.push('gluten-free');
              if (condition.includes('dairy') || condition.includes('lactose')) dietaryTags.push('dairy-free');
              if (condition.includes('halal')) dietaryTags.push('halal');
              if (condition.includes('keto') || condition.includes('low_carb')) dietaryTags.push('low-carb');
              if (condition.includes('nut')) dietaryTags.push('nut-free');
            }
          }

          // Infer meal types from cook time
          const cookMins = parseInt(recipe.cookTime) || 30;
          const mealTypes: string[] = [];
          if (cookMins <= 20) mealTypes.push('breakfast');
          mealTypes.push('lunch', 'dinner');

          const region = inferRegion(cuisines);

          const glossaryEntry = {
            id: glossaryId,
            name: recipe.name,
            description: recipe.description || '',
            cookTime: recipe.cookTime || '30 mins',
            difficulty: recipe.difficulty || 'Medium',
            ingredients: recipe.ingredients || [],
            instructions: recipe.instructions || [],
            tips: recipe.tips || [],
            nutritionInfo: recipe.nutritionInfo || null,
            cuisine: cuisines,
            dietaryTags: [...new Set(dietaryTags)],
            mealTypes,
            region,
            source: 'spoonacular' as const,
            spoonacularId: recipe.sourceRecipe?.spoonacularId || null,
            useCount: 1,
            avgRating: recipe.rating || 0,
            lastUsedAt: recipe.createdAt || new Date().toISOString(),
            createdAt: recipe.createdAt || new Date().toISOString(),
          };

          await glossaryCol.doc(glossaryId).set(glossaryEntry);
          addedCount++;
          console.log(`[migrate-recipes] Added: ${recipe.name} (${glossaryId})`);
        } catch (err) {
          errorCount++;
          console.error(`[migrate-recipes] Error processing recipe:`, err);
        }
      }
    }

    console.log(`[migrate-recipes] Done: added=${addedCount}, skipped=${skippedCount}, errors=${errorCount}`);
    return { added: addedCount, skipped: skippedCount, errors: errorCount, totalUsers: usersSnap.size };
  }
);
