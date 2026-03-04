import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { fetchMandiPrices, quintalToKg, commodityToKey } from './shared/mandi-client';

if (!admin.apps.length) admin.initializeApp();

/**
 * Scheduled: runs daily at 7 PM IST (1:30 PM UTC).
 * Fetches live mandi prices from data.gov.in and caches in Firestore.
 */
export const scheduledMandiPriceFetch = onSchedule(
  {
    schedule: '30 13 * * *', // 1:30 PM UTC = 7:00 PM IST
    timeZone: 'Asia/Kolkata',
    memory: '256MiB',
    maxInstances: 1,
  },
  async () => {
    await runMandiPriceFetch();
  }
);

/**
 * On-demand: admin can trigger manually from admin panel.
 */
export const refreshMandiPrices = onCall(
  { maxInstances: 1, memory: '256MiB', timeoutSeconds: 60 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be signed in.');
    }
    await runMandiPriceFetch();
    return { success: true };
  }
);

/**
 * Core fetch logic shared by scheduled and on-demand triggers.
 */
async function runMandiPriceFetch(): Promise<void> {
  const configSnap = await admin.firestore().doc('admin-config/app').get();
  const config = configSnap.data();

  if (!config?.mandiApiKey) {
    console.log('[mandi] No API key configured. Skipping.');
    return;
  }

  if (!config?.mandiPricesEnabled) {
    console.log('[mandi] Mandi prices disabled in admin. Skipping.');
    return;
  }

  console.log('[mandi] Starting mandi price fetch...');
  const firestore = admin.firestore();
  const batch = firestore.batch();
  let updatedCount = 0;
  const errors: string[] = [];

  try {
    const prices = await fetchMandiPrices(config.mandiApiKey);
    console.log(`[mandi] Fetched ${prices.size} commodity prices from API`);

    for (const [commodityName, record] of prices) {
      const key = commodityToKey(commodityName);
      const modalPrice = parseInt(record.modal_price) || 0;
      const minPrice = parseInt(record.min_price) || 0;
      const maxPrice = parseInt(record.max_price) || 0;

      if (modalPrice <= 0) {
        errors.push(`${commodityName}: invalid modal_price "${record.modal_price}"`);
        continue;
      }

      batch.set(firestore.doc(`mandi-prices/${key}`), {
        commodity: commodityName,
        pricePerKg: quintalToKg(modalPrice),
        minPricePerKg: quintalToKg(minPrice),
        maxPricePerKg: quintalToKg(maxPrice),
        market: record.market,
        state: record.state,
        arrivalDate: record.arrival_date,
        fetchedAt: admin.firestore.FieldValue.serverTimestamp(),
        rawModalPrice: modalPrice,
      });
      updatedCount++;
    }

    // Write metadata
    batch.set(firestore.doc('mandi-prices/_metadata'), {
      lastFetchedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastFetchStatus: errors.length > 0 ? 'partial' : 'success',
      commoditiesFetched: prices.size,
      commoditiesUpdated: updatedCount,
      errors: errors.slice(0, 10),
    });

    await batch.commit();
    console.log(`[mandi] Updated ${updatedCount} commodities. Errors: ${errors.length}`);
  } catch (err) {
    console.error('[mandi] Fetch failed:', err);
    // Write failure metadata
    await firestore.doc('mandi-prices/_metadata').set({
      lastFetchedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastFetchStatus: 'failed',
      commoditiesFetched: 0,
      commoditiesUpdated: 0,
      errors: [err instanceof Error ? err.message : 'Unknown error'],
    });
  }
}
