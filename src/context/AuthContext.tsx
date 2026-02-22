'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '@/lib/firebase';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  maintenanceMode: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (
    name: string,
    email: string,
    password: string,
    dietaryPrefs: string[]
  ) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  // Check admin status and maintenance mode
  const checkAdmin = useCallback(async (uid: string) => {
    try {
      const adminDoc = await getDoc(doc(db, 'admin-config', 'app'));
      const data = adminDoc.data();
      const adminUids: string[] = data?.adminUids || [];
      setIsAdmin(adminUids.includes(uid));
      setMaintenanceMode(data?.maintenanceMode === true);
    } catch {
      setIsAdmin(false);
      setMaintenanceMode(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await checkAdmin(firebaseUser.uid);
      } else {
        setIsAdmin(false);
        // Still check maintenance mode for unauthenticated users
        try {
          const adminDoc = await getDoc(doc(db, 'admin-config', 'app'));
          setMaintenanceMode(adminDoc.data()?.maintenanceMode === true);
        } catch {
          setMaintenanceMode(false);
        }
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [checkAdmin]);

  // Save user profile to Firestore
  const saveUserProfile = async (
    uid: string,
    displayName: string,
    email: string,
    dietaryPreferences: string[]
  ) => {
    await setDoc(
      doc(db, 'users', uid),
      {
        displayName,
        email,
        dietaryPreferences,
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
  };

  const signInWithGoogle = useCallback(async () => {
    const result = await signInWithPopup(auth, googleProvider);
    // Check if first-time user — create profile if needed
    const userDoc = await getDoc(doc(db, 'users', result.user.uid));
    if (!userDoc.exists()) {
      await saveUserProfile(
        result.user.uid,
        result.user.displayName || '',
        result.user.email || '',
        []
      );
    }
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const signUpWithEmail = useCallback(
    async (name: string, email: string, password: string, dietaryPrefs: string[]) => {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName: name });
      await saveUserProfile(result.user.uid, name, email, dietaryPrefs);
    },
    []
  );

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin,
        maintenanceMode,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
