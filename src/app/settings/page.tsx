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
import STEP_THEMES from '@/config/step-themes';
import StaggeredPageTitle from '@/components/ui/StaggeredPageTitle';
import { HiExclamation, HiOutlineX, HiPlus, HiRefresh } from 'react-icons/hi';
import MomoLoader from '@/components/ui/MomoLoader';

const theme = STEP_THEMES.general;

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
    <div className="min-h-screen animate-radial-glow flex items-center justify-center" style={{ background: theme.background, backgroundSize: '200% 200%' }}>
      <MomoLoader message="Loading settings..." />
    </div>
  );

  return (
    <div className="min-h-screen animate-radial-glow" style={{ background: theme.background, backgroundSize: '200% 200%' }}>
      <div className="max-w-3xl mx-auto px-6 sm:px-8 pt-24 pb-16">
        <div className="space-y-8">
          <div>
            <StaggeredPageTitle text="settings." className="text-[clamp(36px,5.5vw,67px)] tracking-[-0.25px]" />
            <p className="text-[12px] tracking-[1px] uppercase text-neutral-500 text-center mt-3">Manage your profile and app preferences</p>
          </div>

          {/* Your Profile */}
          <div className="border-[1.5px] border-black rounded-[30px] bg-white/50 p-5 space-y-4">
            <h2 className="text-[14px] font-medium tracking-[1px] uppercase text-neutral-900">Your Profile</h2>
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

          {/* Your Data */}
          <div className="border-[1.5px] border-black rounded-[30px] bg-white/50 p-5 space-y-3">
            <h2 className="text-[14px] font-medium tracking-[1px] uppercase text-neutral-900">Your Data</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/40 rounded-[20px] p-4 border-[1.5px] border-black/20">
                <div className="text-2xl font-bold text-neutral-900">{recipeCount}</div>
                <div className="text-[12px] tracking-[1px] uppercase text-neutral-400">Saved recipes</div>
              </div>
              <div className="bg-white/40 rounded-[20px] p-4 border-[1.5px] border-black/20">
                <div className="text-2xl font-bold text-red-500">{favCount}</div>
                <div className="text-[12px] tracking-[1px] uppercase text-neutral-400">Favorites</div>
              </div>
            </div>
          </div>

          {/* Saved Dietary Preferences */}
          <div className="border-[1.5px] border-black rounded-[30px] bg-white/50 p-5 space-y-3">
            <h2 className="text-[14px] font-medium tracking-[1px] uppercase text-neutral-900">Saved Dietary Preferences</h2>
            <SavedDietaryDisplay />
          </div>

          {/* Pantry Basics */}
          <div className="border-[1.5px] border-black rounded-[30px] bg-white/50 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[14px] font-medium tracking-[1px] uppercase text-neutral-900">Pantry Basics</h2>
                <p className="text-[12px] tracking-[1px] uppercase text-neutral-400 mt-1">Ingredients always available in your kitchen. Auto-included when generating recipes.</p>
              </div>
              <button
                onClick={resetToDefaults}
                className="flex items-center gap-1 px-3 py-1.5 text-[12px] tracking-[1px] uppercase font-medium border-[1.5px] border-black rounded-[30px] bg-transparent text-black hover:bg-black hover:text-white transition-colors shrink-0"
                title="Reset to defaults"
              >
                <HiRefresh className="w-3.5 h-3.5" /> Reset
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {pantryBasics.map((item) => (
                <span key={item} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/40 text-neutral-700 border-[1.5px] border-black/20 rounded-full text-xs font-medium">
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
                className="flex-1 px-4 py-2.5 rounded-full border-[1.5px] border-black/20 bg-white/50 text-sm font-light text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-black transition-colors"
              />
              <button
                onClick={addPantryItem}
                className="flex items-center gap-1 px-4 py-2.5 border-[1.5px] border-black rounded-[30px] bg-transparent text-black text-[14px] font-medium tracking-[1px] uppercase hover:bg-black hover:text-white transition-colors"
              >
                <HiPlus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="border-[1.5px] border-red-300 rounded-[30px] bg-red-50/50 p-5 space-y-3">
            <h2 className="text-[14px] font-medium tracking-[1px] uppercase text-red-700 flex items-center gap-2"><HiExclamation className="w-5 h-5" />Danger Zone</h2>
            {showClearConfirm ? (
              <div className="space-y-3">
                <p className="text-sm text-red-600 font-light">This will delete all saved dietary preferences from this device. This cannot be undone.</p>
                <div className="flex gap-2">
                  <button onClick={handleClearAll} className="px-4 py-2 border-[1.5px] border-red-500 bg-red-500 text-white rounded-[30px] text-[14px] font-medium tracking-[1px] uppercase hover:bg-red-600 hover:border-red-600 transition-colors">Yes, clear</button>
                  <button onClick={() => setShowClearConfirm(false)} className="px-4 py-2 border-[1.5px] border-black rounded-[30px] bg-transparent text-black text-[14px] font-medium tracking-[1px] uppercase hover:bg-black hover:text-white transition-colors">Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowClearConfirm(true)} className="px-4 py-2 border-[1.5px] border-red-300 text-red-600 rounded-[30px] text-[14px] font-medium tracking-[1px] uppercase hover:bg-red-100 transition-colors">Clear all local data</button>
            )}
          </div>
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
        return <span key={id} className="px-3 py-1.5 bg-white/40 text-neutral-700 border-[1.5px] border-black/20 rounded-full text-xs font-medium uppercase tracking-wider">{condition?.label || id}</span>;
      })}
    </div>
  );
}
