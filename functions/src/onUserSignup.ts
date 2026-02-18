import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import { google } from 'googleapis';

if (!admin.apps.length) admin.initializeApp();

/**
 * Triggered when a new user profile document is created in Firestore.
 * Appends the user's data to a Google Sheet for the admin to review.
 *
 * Required secrets / Firestore config:
 *   admin-config/app.googleSheetsId       — Google Sheets spreadsheet ID
 *   admin-config/app.googleServiceEmail    — Service account email
 *   admin-config/app.googlePrivateKey      — Service account private key (PEM)
 */
export const onUserSignup = onDocumentCreated(
  {
    document: 'users/{userId}',
    maxInstances: 5,
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const data = snap.data();
    const { displayName, email, dietaryPreferences, createdAt } = data;

    // Read Google Sheets config from admin-config
    const configSnap = await admin.firestore().doc('admin-config/app').get();
    const config = configSnap.data();
    if (!config) return;

    const { googleSheetsId, googleServiceEmail, googlePrivateKey } = config;
    if (!googleSheetsId || !googleServiceEmail || !googlePrivateKey) {
      console.log('Google Sheets not configured — skipping sheet sync.');
      return;
    }

    try {
      const authClient = new google.auth.JWT(
        googleServiceEmail,
        undefined,
        googlePrivateKey.replace(/\\n/g, '\n'),
        ['https://www.googleapis.com/auth/spreadsheets']
      );

      const sheets = google.sheets({ version: 'v4', auth: authClient });

      const timestamp =
        createdAt && typeof createdAt.toDate === 'function'
          ? createdAt.toDate().toISOString()
          : new Date().toISOString();

      const dietaryStr = Array.isArray(dietaryPreferences)
        ? dietaryPreferences.join(', ')
        : '';

      await sheets.spreadsheets.values.append({
        spreadsheetId: googleSheetsId,
        range: 'Sheet1!A:D',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[displayName || '', email || '', dietaryStr, timestamp]],
        },
      });

      console.log(`User ${email} synced to Google Sheet.`);
    } catch (err) {
      console.error('Failed to sync user to Google Sheet:', err);
    }
  }
);
