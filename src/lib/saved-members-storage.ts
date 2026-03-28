import {
  collection,
  getDocs,
  setDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { db } from './firebase';

export interface SavedMember {
  name: string;
  breakfastPreferences: string[];
  dietaryConditions: string[];
  updatedAt: string;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50);
}

export async function getSavedMembers(
  userId: string
): Promise<SavedMember[]> {
  const col = collection(db, 'users', userId, 'savedMembers');
  const snap = await getDocs(col);
  return snap.docs.map((d) => d.data() as SavedMember);
}

export async function saveMember(
  userId: string,
  member: SavedMember
): Promise<void> {
  const ref = doc(db, 'users', userId, 'savedMembers', slugify(member.name));
  await setDoc(ref, { ...member, updatedAt: new Date().toISOString() });
}

export async function deleteSavedMember(
  userId: string,
  name: string
): Promise<void> {
  const ref = doc(db, 'users', userId, 'savedMembers', slugify(name));
  await deleteDoc(ref);
}

export async function saveMembersFromPlan(
  userId: string,
  breakfastPreferences: { memberName: string; preferences: string[] }[],
  memberDietaryConditions: Record<string, string[]>
): Promise<void> {
  for (const pref of breakfastPreferences) {
    await saveMember(userId, {
      name: pref.memberName,
      breakfastPreferences: pref.preferences,
      dietaryConditions: memberDietaryConditions[pref.memberName] || [],
      updatedAt: new Date().toISOString(),
    });
  }
}
