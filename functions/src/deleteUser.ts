import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

if (!admin.apps.length) admin.initializeApp();

export const deleteUser = onCall(
  {
    maxInstances: 5,
    timeoutSeconds: 30,
    memory: '256MiB',
    enforceAppCheck: false,
  },
  async (request) => {
    // Auth check
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be signed in.');
    }

    // Admin check
    const configSnap = await admin.firestore().doc('admin-config/app').get();
    const adminUids: string[] = configSnap.data()?.adminUids || [];
    if (!adminUids.includes(request.auth.uid)) {
      throw new HttpsError('permission-denied', 'Only admins can delete users.');
    }

    // Validate input
    const { uid } = request.data;
    if (!uid || typeof uid !== 'string') {
      throw new HttpsError('invalid-argument', 'uid is required.');
    }

    // Prevent self-deletion
    if (uid === request.auth.uid) {
      throw new HttpsError('invalid-argument', 'You cannot delete your own account.');
    }

    // Delete Firebase Auth user
    try {
      await admin.auth().deleteUser(uid);
    } catch (err: unknown) {
      // If user not found in Auth, still proceed to clean up Firestore
      if (err instanceof Error && err.message.includes('user-not-found')) {
        console.log(`Auth user ${uid} not found, proceeding to Firestore cleanup.`);
      } else {
        const message = err instanceof Error ? err.message : 'Failed to delete auth user';
        throw new HttpsError('internal', message);
      }
    }

    // Delete Firestore user document
    try {
      await admin.firestore().doc(`users/${uid}`).delete();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete user document';
      throw new HttpsError('internal', message);
    }

    return { success: true };
  }
);
