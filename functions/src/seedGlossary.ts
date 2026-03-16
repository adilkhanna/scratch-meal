import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

if (!admin.apps.length) admin.initializeApp();

export const seedRecipeGlossary = onCall(
  {
    maxInstances: 1,
    timeoutSeconds: 300,
    memory: '512MiB',
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

    // Fetch ALL existing recipe IDs in one query (avoids N+1 reads)
    const existingIds = new Set<string>();
    const allDocs = await glossaryCol.select().get(); // select() = ID-only, no field data
    allDocs.forEach((doc) => existingIds.add(doc.id));
    const alreadySeeded = existingIds.size > 0;
    console.log(`[seed-glossary] Existing glossary has ${existingIds.size} recipes`);

    // Load seed data
    let seedData;
    try {
      const seedPath = path.join(__dirname, '..', 'data', 'recipe-glossary-seed.json');
      const raw = fs.readFileSync(seedPath, 'utf-8');
      seedData = JSON.parse(raw);
    } catch (err) {
      console.error('[seed-glossary] Failed to read seed file:', err);
      throw new HttpsError('internal', 'Seed data file not found.');
    }

    if (!Array.isArray(seedData) || seedData.length === 0) {
      throw new HttpsError('internal', 'Seed data is empty or invalid.');
    }

    console.log(`[seed-glossary] Loading ${seedData.length} recipes from seed file (already seeded: ${alreadySeeded})`);

    // Batch write (Firestore max 500 per batch)
    let addedCount = 0;
    let skippedCount = 0;
    let updatedCount = 0;
    const batchSize = 400;

    for (let i = 0; i < seedData.length; i += batchSize) {
      const batch = db.batch();
      const slice = seedData.slice(i, i + batchSize);

      for (const recipe of slice) {
        if (!recipe.id || !recipe.name) {
          skippedCount++;
          continue;
        }

        const ref = glossaryCol.doc(recipe.id);

        if (existingIds.has(recipe.id)) {
          // Merge new fields (like tags) into existing recipes
          const newData: Record<string, unknown> = {};
          if (recipe.tags && recipe.tags.length > 0) newData.tags = recipe.tags;
          if (recipe.source === 'curated') newData.source = 'curated';
          if (Object.keys(newData).length > 0) {
            batch.update(ref, newData);
            updatedCount++;
          }
          skippedCount++;
          continue;
        }

        batch.set(ref, {
          ...recipe,
          source: recipe.source || 'seed',
          tags: recipe.tags || [],
          useCount: recipe.useCount || 0,
          avgRating: recipe.avgRating || 0,
          lastUsedAt: recipe.lastUsedAt || new Date().toISOString(),
          createdAt: recipe.createdAt || new Date().toISOString(),
        });
        addedCount++;
      }

      await batch.commit();
    }

    console.log(`[seed-glossary] Done: added ${addedCount}, updated ${updatedCount}, skipped ${skippedCount}`);
    return { added: addedCount, updated: updatedCount, skipped: skippedCount, total: seedData.length };
  }
);
