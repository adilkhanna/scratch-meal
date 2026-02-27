'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { loadRecipes } from '@/lib/recipe-storage';
import { Recipe } from '@/types';
import { DIETARY_CONDITIONS } from '@/config/dietary-conditions';
import { HiExclamation, HiOutlineX, HiPlus, HiRefresh } from 'react-icons/hi';

const DEFAULT_PANTRY_BASICS = [
  'Salt', 'Black Pepper', 'Olive Oil', 'Vegetable Oil', 'Sugar', 'Flour',
  'Butter', 'Milk', 'Eggs', 'Bread', 'Rice', 'Garlic', 'Onion', 'Ginger',
  'Cumin', 'Turmeric', 'Chili Powder', 'Coriander Powder', 'Garam Masala',
  'Soy Sauce', 'Vinegar', 'Lemon Juice', 'Tomato Paste', 'Mustard',
];

export default function SettingsPage() {
  const { user } = useAuth();
  const { setValue: setDietary } = useLocalStorage<string[]>('smm-dietary', []);
  const { addToast } = useToast();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [pantryBasics, setPantryBasics] = useState<string[]>([]);
  const [pantryLoaded, setPantryLoaded] = useState(false);
  const [newItem, setNewItem] = useState('');
  const [recipeCount, setRecipeCount] = useState(0);
  const [favCount, setFavCount] = useState(0);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Load pantry basics and recipe stats from Firestore
  const loadData = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const [userSnap, recipes] = await Promise.all([
        getDoc(doc(db, 'users', user.uid)),
        loadRecipes(user.uid),
      ]);

      setRecipeCount(recipes.length);
      setFavCount(recipes.filter((r) => r.isFavorite).length);

      const data = userSnap.data();
      if (data?.pantryBasics && Array.isArray(data.pantryBasics)) {
        setPantryBasics(data.pantryBasics);
      } else {
        // First time — set defaults
        setPantryBasics(DEFAULT_PANTRY_BASICS);
        await setDoc(doc(db, 'users', user.uid), { pantryBasics: DEFAULT_PANTRY_BASICS }, { merge: true });
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
      setPantryBasics(DEFAULT_PANTRY_BASICS);
    } finally {
      setPantryLoaded(true);
      setDataLoaded(true);
    }
  }, [user?.uid]);

  useEffect(() => { loadData(); }, [loadData]);

  const savePantryBasics = async (updated: string[]) => {
    setPantryBasics(updated);
    if (!user?.uid) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), { pantryBasics: updated });
    } catch {
      // If doc doesn't exist yet, use setDoc
      try {
        await setDoc(doc(db, 'users', user.uid), { pantryBasics: updated }, { merge: true });
      } catch (err) {
        console.error('Failed to save pantry basics:', err);
      }
    }
  };

  const addPantryItem = () => {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    if (pantryBasics.some((b) => b.toLowerCase() === trimmed.toLowerCase())) {
      addToast('Already in your pantry!', 'info');
      return;
    }
    const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    savePantryBasics([...pantryBasics, capitalized]);
    setNewItem('');
  };

  const removePantryItem = (item: string) => {
    savePantryBasics(pantryBasics.filter((b) => b !== item));
  };

  const resetToDefaults = () => {
    savePantryBasics(DEFAULT_PANTRY_BASICS);
    addToast('Pantry basics reset to defaults.', 'success');
  };

  const handleClearAll = () => {
    setDietary([]);
    setShowClearConfirm(false);
    addToast('Local data cleared.', 'info');
  };

  if (!dataLoaded || !pantryLoaded) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="text-4xl animate-pulse-soft">⚙️</div>
        <p className="text-sm text-neutral-400 font-light">Loading settings...</p>
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in py-6">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-[family-name:var(--font-display)] text-neutral-900 mb-2">Settings</h1>
          <p className="text-neutral-500 text-sm font-light">Manage your profile and app preferences.</p>
        </div>
        <div className="border border-neutral-200 rounded-2xl bg-white p-5 space-y-4">
          <h2 className="text-xs font-medium uppercase tracking-widest text-neutral-900">Your Profile</h2>
          <div className="flex items-center gap-4">
            {user?.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.photoURL} alt="" className="w-14 h-14 rounded-full" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-neutral-900 text-white flex items-center justify-center text-lg font-bold">
                {(user?.displayName || user?.email || '?').split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-medium text-neutral-900">{user?.displayName || 'User'}</p>
              <p className="text-sm text-neutral-500 font-light">{user?.email}</p>
            </div>
          </div>
        </div>
        <div className="border border-neutral-200 rounded-2xl bg-white p-5 space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-widest text-neutral-900">Your Data</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200">
              <div className="text-2xl font-bold text-neutral-900">{recipeCount}</div>
              <div className="text-xs text-neutral-400 uppercase tracking-wider">Saved recipes</div>
            </div>
            <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200">
              <div className="text-2xl font-bold text-red-500">{favCount}</div>
              <div className="text-xs text-neutral-400 uppercase tracking-wider">Favorites</div>
            </div>
          </div>
        </div>
        <div className="border border-neutral-200 rounded-2xl bg-white p-5 space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-widest text-neutral-900">Saved Dietary Preferences</h2>
          <SavedDietaryDisplay />
        </div>

        {/* Pantry Basics */}
        <div className="border border-neutral-200 rounded-2xl bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-medium uppercase tracking-widest text-neutral-900">Pantry Basics</h2>
              <p className="text-xs text-neutral-400 font-light mt-1">Ingredients always available in your kitchen. These are auto-included when generating recipes.</p>
            </div>
            <button
              onClick={resetToDefaults}
              className="flex items-center gap-1 px-2.5 py-1 text-xs text-neutral-400 hover:text-neutral-900 hover:bg-neutral-50 rounded-full border border-neutral-200 transition-colors shrink-0"
              title="Reset to defaults"
            >
              <HiRefresh className="w-3.5 h-3.5" /> Reset
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {pantryBasics.map((item) => (
              <span key={item} className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-50 text-neutral-700 border border-neutral-200 rounded-full text-xs font-medium">
                {item}
                <button
                  onClick={() => removePantryItem(item)}
                  className="p-0.5 text-neutral-400 hover:text-red-500 transition-colors"
                >
                  <HiOutlineX className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPantryItem(); } }}
              placeholder="Add an ingredient..."
              className="flex-1 px-4 py-2.5 rounded-full border border-neutral-200 bg-white text-sm font-light text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
            />
            <button
              onClick={addPantryItem}
              className="flex items-center gap-1 px-4 py-2.5 bg-[#0059FF] text-white rounded-full text-xs font-medium uppercase tracking-wider hover:bg-[#0047CC] transition-colors"
            >
              <HiPlus className="w-3.5 h-3.5" /> Add
            </button>
          </div>
        </div>

        <div className="border border-red-100 rounded-2xl bg-red-50/50 p-5 space-y-3">
          <h2 className="font-semibold text-red-700 flex items-center gap-2"><HiExclamation className="w-5 h-5" />Danger Zone</h2>
          {showClearConfirm ? (
            <div className="space-y-3">
              <p className="text-sm text-red-600 font-light">This will delete all saved dietary preferences from this device. This cannot be undone.</p>
              <div className="flex gap-2">
                <button onClick={handleClearAll} className="px-4 py-2 bg-red-500 text-white rounded-full text-xs font-medium uppercase tracking-wider hover:bg-red-600">Yes, clear</button>
                <button onClick={() => setShowClearConfirm(false)} className="px-4 py-2 border border-neutral-200 text-neutral-500 rounded-full text-xs font-medium uppercase tracking-wider hover:bg-white">Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowClearConfirm(true)} className="px-4 py-2 border border-red-200 text-red-600 rounded-full text-xs font-medium uppercase tracking-wider hover:bg-red-100 transition-colors">Clear all local data</button>
          )}
        </div>
      </div>
    </div>
  );
}

function SavedDietaryDisplay() {
  const { value: savedConditions, isLoaded } = useLocalStorage<string[]>('smm-dietary', []);
  if (!isLoaded) return null;
  if (savedConditions.length === 0) return <p className="text-sm text-neutral-400 font-light">No dietary preferences saved yet. They&apos;ll be saved when you select them during recipe search.</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {savedConditions.map((id) => {
        const condition = DIETARY_CONDITIONS.find((c) => c.id === id);
        return <span key={id} className="px-3 py-1.5 bg-neutral-50 text-neutral-700 border border-neutral-200 rounded-full text-xs font-medium uppercase tracking-wider">{condition?.label || id}</span>;
      })}
    </div>
  );
}
