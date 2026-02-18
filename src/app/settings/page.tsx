'use client';

import { useState } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useToast } from '@/context/ToastContext';
import { Recipe } from '@/types';
import { HiEye, HiEyeOff, HiExclamation } from 'react-icons/hi';

export default function SettingsPage() {
  const { value: apiKey, setValue: setApiKey, isLoaded } = useLocalStorage<string>(
    'smm-api-key',
    ''
  );
  const { value: history, setValue: setHistory } = useLocalStorage<Recipe[]>('smm-history', []);
  const { setValue: setDietary } = useLocalStorage<string[]>('smm-dietary', []);
  const { addToast } = useToast();
  const [showKey, setShowKey] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleSaveKey = () => {
    const trimmed = keyInput.trim();
    if (!trimmed) {
      addToast('Please enter an API key.', 'error');
      return;
    }
    if (!trimmed.startsWith('sk-')) {
      addToast('API key should start with "sk-".', 'error');
      return;
    }
    setApiKey(trimmed);
    setKeyInput('');
    addToast('API key saved successfully!', 'success');
  };

  const handleClearAll = () => {
    setApiKey('');
    setHistory([]);
    setDietary([]);
    setShowClearConfirm(false);
    addToast('All data cleared.', 'info');
  };

  const maskedKey = apiKey
    ? `${apiKey.slice(0, 7)}${'*'.repeat(Math.max(0, apiKey.length - 11))}${apiKey.slice(-4)}`
    : '';

  if (!isLoaded) return null;

  return (
    <div className="animate-fade-in py-6">
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 mb-1">Settings</h1>
          <p className="text-stone-500 text-sm">Manage your API key and app preferences.</p>
        </div>

        {/* API Key */}
        <div className="border border-stone-200 rounded-xl bg-white p-5 space-y-4">
          <div>
            <h2 className="font-semibold text-stone-800">OpenAI API Key</h2>
            <p className="text-xs text-stone-400 mt-1">
              Required for photo recognition and recipe generation. Your key is stored locally and never sent to our servers.
            </p>
          </div>

          {apiKey ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-sm text-green-700 font-medium">Key configured</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm text-stone-600 bg-stone-100 rounded-lg px-3 py-2 font-mono">
                  {showKey ? apiKey : maskedKey}
                </code>
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="p-2 text-stone-400 hover:text-stone-600 transition-colors"
                >
                  {showKey ? <HiEyeOff className="w-5 h-5" /> : <HiEye className="w-5 h-5" />}
                </button>
              </div>
              <button
                onClick={() => {
                  setApiKey('');
                  addToast('API key removed.', 'info');
                }}
                className="text-xs text-red-500 hover:text-red-600 font-medium"
              >
                Remove key
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="password"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder="sk-..."
                  className="flex-1 px-3 py-2.5 rounded-lg border border-stone-200 text-sm font-mono
                             placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <button
                  onClick={handleSaveKey}
                  className="px-4 py-2.5 bg-orange-500 text-white rounded-lg text-sm font-medium
                             hover:bg-orange-600 transition-colors"
                >
                  Save
                </button>
              </div>
              <p className="text-xs text-stone-400">
                Get your API key from{' '}
                <span className="font-medium text-stone-500">platform.openai.com</span>
              </p>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="border border-stone-200 rounded-xl bg-white p-5 space-y-3">
          <h2 className="font-semibold text-stone-800">Your Data</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-stone-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-orange-600">{history.length}</div>
              <div className="text-xs text-stone-500">Saved recipes</div>
            </div>
            <div className="bg-stone-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-red-500">
                {history.filter((r: Recipe) => r.isFavorite).length}
              </div>
              <div className="text-xs text-stone-500">Favorites</div>
            </div>
          </div>
        </div>

        {/* Clear data */}
        <div className="border border-red-100 rounded-xl bg-red-50/50 p-5 space-y-3">
          <h2 className="font-semibold text-red-700 flex items-center gap-2">
            <HiExclamation className="w-5 h-5" />
            Danger Zone
          </h2>
          {showClearConfirm ? (
            <div className="space-y-3">
              <p className="text-sm text-red-600">
                This will delete your API key, all saved recipes, and dietary preferences. This cannot be undone.
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
                  className="px-4 py-2 border border-stone-200 text-stone-600 rounded-lg text-sm font-medium hover:bg-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
            >
              Clear all data
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
