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

  const handleClearAll = () => {
    setHistory([]);
    setDietary([]);
    setShowClearConfirm(false);
    addToast('All local data cleared.', 'info');
  };

  if (!isLoaded) return null;

  return (
    <div className="animate-fade-in py-6">
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-[#f5f5f5] font-[family-name:var(--font-serif)] mb-1">
            Settings
          </h1>
          <p className="text-[#a0a0a0] text-sm">Manage your profile and app preferences.</p>
        </div>

        {/* User Profile */}
        <div className="border border-white/[0.08] rounded-xl bg-white/[0.05] backdrop-blur-sm p-5 space-y-4">
          <h2 className="font-semibold text-[#d4d4d4]">Your Profile</h2>
          <div className="flex items-center gap-4">
            {user?.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.photoURL} alt="" className="w-14 h-14 rounded-full ring-2 ring-amber-500/30" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-amber-600 text-white flex items-center justify-center text-lg font-bold ring-2 ring-amber-500/30">
                {(user?.displayName || user?.email || '?')
                  .split(' ')
                  .map((s) => s[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-semibold text-[#f5f5f5]">
                {user?.displayName || 'User'}
              </p>
              <p className="text-sm text-[#a0a0a0]">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="border border-white/[0.08] rounded-xl bg-white/[0.05] backdrop-blur-sm p-5 space-y-3">
          <h2 className="font-semibold text-[#d4d4d4]">Your Data</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/[0.05] rounded-lg p-3 border border-white/[0.06]">
              <div className="text-2xl font-bold text-amber-400">{history.length}</div>
              <div className="text-xs text-[#666]">Saved recipes</div>
            </div>
            <div className="bg-white/[0.05] rounded-lg p-3 border border-white/[0.06]">
              <div className="text-2xl font-bold text-red-400">
                {history.filter((r: Recipe) => r.isFavorite).length}
              </div>
              <div className="text-xs text-[#666]">Favorites</div>
            </div>
          </div>
        </div>

        {/* Dietary Preferences Quick View */}
        <div className="border border-white/[0.08] rounded-xl bg-white/[0.05] backdrop-blur-sm p-5 space-y-3">
          <h2 className="font-semibold text-[#d4d4d4]">Saved Dietary Preferences</h2>
          <SavedDietaryDisplay />
        </div>

        {/* Clear data */}
        <div className="border border-red-500/20 rounded-xl bg-red-500/[0.05] p-5 space-y-3">
          <h2 className="font-semibold text-red-400 flex items-center gap-2">
            <HiExclamation className="w-5 h-5" />
            Danger Zone
          </h2>
          {showClearConfirm ? (
            <div className="space-y-3">
              <p className="text-sm text-red-400/80">
                This will delete all saved recipes and dietary preferences from this device. This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleClearAll}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600"
                >
                  Yes, delete everything
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="px-4 py-2 border border-white/[0.1] text-[#a0a0a0] rounded-lg text-sm font-medium hover:bg-white/[0.05]"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="px-4 py-2 border border-red-500/25 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/10 transition-colors"
            >
              Clear all local data
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SavedDietaryDisplay() {
  const { value: savedConditions, isLoaded } = useLocalStorage<string[]>('smm-dietary', []);

  if (!isLoaded) return null;

  if (savedConditions.length === 0) {
    return (
      <p className="text-sm text-[#666]">
        No dietary preferences saved yet. They&apos;ll be saved when you select them during recipe search.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {savedConditions.map((id) => {
        const condition = DIETARY_CONDITIONS.find((c) => c.id === id);
        return (
          <span
            key={id}
            className="px-3 py-1.5 bg-amber-500/15 text-amber-300 border border-amber-500/20 rounded-full text-xs font-medium"
          >
            {condition?.label || id}
          </span>
        );
      })}
    </div>
  );
}
