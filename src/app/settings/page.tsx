'use client';

import { useState } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Recipe } from '@/types';
import { DIETARY_CONDITIONS } from '@/config/dietary-conditions';
import { HiExclamation } from 'react-icons/hi';

export default function SettingsPage() {
  const { user } = useAuth();
  const { value: history, setValue: setHistory, isLoaded } = useLocalStorage<Recipe[]>('smm-history', []);
  const { setValue: setDietary } = useLocalStorage<string[]>('smm-dietary', []);
  const { addToast } = useToast();
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleClearAll = () => { setHistory([]); setDietary([]); setShowClearConfirm(false); addToast('All local data cleared.', 'info'); };

  if (!isLoaded) return null;

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
              <div className="text-2xl font-bold text-neutral-900">{history.length}</div>
              <div className="text-xs text-neutral-400 uppercase tracking-wider">Saved recipes</div>
            </div>
            <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200">
              <div className="text-2xl font-bold text-red-500">{history.filter((r: Recipe) => r.isFavorite).length}</div>
              <div className="text-xs text-neutral-400 uppercase tracking-wider">Favorites</div>
            </div>
          </div>
        </div>
        <div className="border border-neutral-200 rounded-2xl bg-white p-5 space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-widest text-neutral-900">Saved Dietary Preferences</h2>
          <SavedDietaryDisplay />
        </div>
        <div className="border border-red-100 rounded-2xl bg-red-50/50 p-5 space-y-3">
          <h2 className="font-semibold text-red-700 flex items-center gap-2"><HiExclamation className="w-5 h-5" />Danger Zone</h2>
          {showClearConfirm ? (
            <div className="space-y-3">
              <p className="text-sm text-red-600 font-light">This will delete all saved recipes and dietary preferences from this device. This cannot be undone.</p>
              <div className="flex gap-2">
                <button onClick={handleClearAll} className="px-4 py-2 bg-red-500 text-white rounded-full text-xs font-medium uppercase tracking-wider hover:bg-red-600">Yes, delete everything</button>
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
