'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { doc, getDoc, setDoc, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { sendPasswordResetEmail } from 'firebase/auth';
import { db, auth, functions } from '@/lib/firebase';
import { deleteUserAccount, seedRecipeGlossary, migrateUserRecipesToGlossary } from '@/lib/firebase-functions';
import { HiOutlineShieldCheck, HiEye, HiEyeOff, HiOutlineUsers, HiOutlineKey, HiOutlineTrash, HiOutlineMail, HiOutlineRefresh } from 'react-icons/hi';
import MomoLoader from '@/components/ui/MomoLoader';

interface UserRecord { uid: string; displayName: string; email: string; dietaryPreferences: string[]; createdAt: string; }

export default function AdminPage() {
  const router = useRouter();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { addToast } = useToast();
  const [apiKey, setApiKey] = useState('');
  const [savedApiKey, setSavedApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [spoonacularKey, setSpoonacularKey] = useState('');
  const [savedSpoonacularKey, setSavedSpoonacularKey] = useState('');
  const [showSpoonacularKey, setShowSpoonacularKey] = useState(false);
  const [hfApiKey, setHfApiKey] = useState('');
  const [savedHfApiKey, setSavedHfApiKey] = useState('');
  const [showHfApiKey, setShowHfApiKey] = useState(false);
  const [hfSecret, setHfSecret] = useState('');
  const [savedHfSecret, setSavedHfSecret] = useState('');
  const [showHfSecret, setShowHfSecret] = useState(false);
  const [hfEnabled, setHfEnabled] = useState(false);
  const [sheetsId, setSheetsId] = useState('');
  const [serviceEmail, setServiceEmail] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [deletingUid, setDeletingUid] = useState<string | null>(null);
  const [resettingUid, setResettingUid] = useState<string | null>(null);
  const [confirmDeleteUid, setConfirmDeleteUid] = useState<string | null>(null);
  const [mandiApiKey, setMandiApiKey] = useState('');
  const [savedMandiApiKey, setSavedMandiApiKey] = useState('');
  const [showMandiApiKey, setShowMandiApiKey] = useState(false);
  const [mandiEnabled, setMandiEnabled] = useState(false);
  const [mandiLastFetched, setMandiLastFetched] = useState<string | null>(null);
  const [mandiRefreshing, setMandiRefreshing] = useState(false);
  const [seedingGlossary, setSeedingGlossary] = useState(false);
  const [migratingRecipes, setMigratingRecipes] = useState(false);
  const [glossaryStats, setGlossaryStats] = useState<{ count: number } | null>(null);

  const loadConfig = useCallback(async () => {
    try { const configSnap = await getDoc(doc(db, 'admin-config', 'app')); const data = configSnap.data();
      if (data) { setSavedApiKey(data.openaiApiKey || ''); setApiKey(data.openaiApiKey || ''); setSavedSpoonacularKey(data.spoonacularApiKey || ''); setSpoonacularKey(data.spoonacularApiKey || ''); setSavedHfApiKey(data.higgsFieldApiKey || ''); setHfApiKey(data.higgsFieldApiKey || ''); setSavedHfSecret(data.higgsFieldSecret || ''); setHfSecret(data.higgsFieldSecret || ''); setHfEnabled(data.higgsFieldEnabled === true); setSheetsId(data.googleSheetsId || ''); setServiceEmail(data.googleServiceEmail || ''); setPrivateKey(data.googlePrivateKey || ''); setMaintenanceMode(data.maintenanceMode === true); setSavedMandiApiKey(data.mandiApiKey || ''); setMandiApiKey(data.mandiApiKey || ''); setMandiEnabled(data.mandiPricesEnabled === true); }
      // Load mandi metadata
      try { const metaSnap = await getDoc(doc(db, 'mandi-prices', '_metadata')); const meta = metaSnap.data(); if (meta?.lastFetchedAt) { const d = meta.lastFetchedAt.toDate ? meta.lastFetchedAt.toDate() : new Date(meta.lastFetchedAt); setMandiLastFetched(d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })); } } catch { /* metadata may not exist yet */ }
      // Load glossary count
      try { const glossarySnap = await getDocs(query(collection(db, 'recipe-glossary'), limit(1000))); setGlossaryStats({ count: glossarySnap.size }); } catch { /* glossary may not exist yet */ }
    } catch (err) { console.error('Failed to load admin config:', err); }
  }, []);

  const loadUsers = useCallback(async () => {
    try { const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(100)); const snap = await getDocs(q);
      const records: UserRecord[] = snap.docs.map((d) => { const data = d.data(); return { uid: d.id, displayName: data.displayName || '', email: data.email || '', dietaryPreferences: data.dietaryPreferences || [], createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString() : 'Unknown' }; });
      setUsers(records);
    } catch (err) { console.error('Failed to load users:', err); }
  }, []);

  useEffect(() => { if (authLoading) return; if (!user || !isAdmin) { router.replace('/'); return; } Promise.all([loadConfig(), loadUsers()]).finally(() => setLoadingData(false)); }, [authLoading, user, isAdmin, router, loadConfig, loadUsers]);

  const handleSave = async () => {
    setSaving(true);
    try { await setDoc(doc(db, 'admin-config', 'app'), { openaiApiKey: apiKey.trim(), spoonacularApiKey: spoonacularKey.trim(), higgsFieldApiKey: hfApiKey.trim(), higgsFieldSecret: hfSecret.trim(), higgsFieldEnabled: hfEnabled, mandiApiKey: mandiApiKey.trim(), mandiPricesEnabled: mandiEnabled, googleSheetsId: sheetsId.trim(), googleServiceEmail: serviceEmail.trim(), googlePrivateKey: privateKey.trim() }, { merge: true });
      setSavedApiKey(apiKey.trim()); setSavedSpoonacularKey(spoonacularKey.trim()); setSavedHfApiKey(hfApiKey.trim()); setSavedHfSecret(hfSecret.trim()); setSavedMandiApiKey(mandiApiKey.trim()); addToast('Configuration saved!', 'success');
    } catch (err) { addToast('Failed to save configuration.', 'error'); console.error(err); }
    finally { setSaving(false); }
  };

  const handlePasswordReset = async (email: string, uid: string) => {
    setResettingUid(uid);
    try {
      await sendPasswordResetEmail(auth, email);
      addToast(`Password reset email sent to ${email}`, 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to send reset email', 'error');
    } finally {
      setResettingUid(null);
    }
  };

  const handleDeleteUser = async (uid: string, displayName: string) => {
    setDeletingUid(uid);
    try {
      await deleteUserAccount(uid);
      setUsers((prev) => prev.filter((u) => u.uid !== uid));
      addToast(`User "${displayName || 'Unknown'}" has been deleted.`, 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to delete user', 'error');
    } finally {
      setDeletingUid(null);
      setConfirmDeleteUid(null);
    }
  };

  const handleToggleMaintenance = async () => {
    const newValue = !maintenanceMode;
    try {
      // Write to both admin-config (for admin panel state) and public-config (readable by all users)
      await Promise.all([
        setDoc(doc(db, 'admin-config', 'app'), { maintenanceMode: newValue }, { merge: true }),
        setDoc(doc(db, 'public-config', 'app'), { maintenanceMode: newValue }, { merge: true }),
      ]);
      setMaintenanceMode(newValue);
      addToast(newValue ? 'Maintenance mode enabled.' : 'Maintenance mode disabled. App is live.', 'success');
    } catch (err) {
      addToast('Failed to toggle maintenance mode.', 'error');
      console.error(err);
    }
  };

  const maskedKey = savedApiKey ? `${savedApiKey.slice(0, 7)}${'*'.repeat(Math.max(0, savedApiKey.length - 11))}${savedApiKey.slice(-4)}` : '';
  const maskedSpoonacularKey = savedSpoonacularKey ? `${savedSpoonacularKey.slice(0, 4)}${'*'.repeat(Math.max(0, savedSpoonacularKey.length - 8))}${savedSpoonacularKey.slice(-4)}` : '';
  const maskedHfApiKey = savedHfApiKey ? `${savedHfApiKey.slice(0, 4)}${'*'.repeat(Math.max(0, savedHfApiKey.length - 8))}${savedHfApiKey.slice(-4)}` : '';
  const maskedHfSecret = savedHfSecret ? `${savedHfSecret.slice(0, 4)}${'*'.repeat(Math.max(0, savedHfSecret.length - 8))}${savedHfSecret.slice(-4)}` : '';
  const maskedMandiApiKey = savedMandiApiKey ? `${savedMandiApiKey.slice(0, 4)}${'*'.repeat(Math.max(0, savedMandiApiKey.length - 8))}${savedMandiApiKey.slice(-4)}` : '';

  const handleToggleHf = async () => {
    const newValue = !hfEnabled;
    try {
      await setDoc(doc(db, 'admin-config', 'app'), { higgsFieldEnabled: newValue }, { merge: true });
      setHfEnabled(newValue);
      addToast(newValue ? 'Image generation enabled.' : 'Image generation disabled.', 'success');
    } catch {
      addToast('Failed to toggle image generation.', 'error');
    }
  };

  const handleToggleMandi = async () => {
    const newValue = !mandiEnabled;
    try {
      await setDoc(doc(db, 'admin-config', 'app'), { mandiPricesEnabled: newValue }, { merge: true });
      setMandiEnabled(newValue);
      addToast(newValue ? 'Live mandi prices enabled.' : 'Live mandi prices disabled.', 'success');
    } catch {
      addToast('Failed to toggle mandi prices.', 'error');
    }
  };

  const handleRefreshMandi = async () => {
    setMandiRefreshing(true);
    try {
      const fn = httpsCallable(functions, 'refreshMandiPrices');
      await fn({});
      // Re-fetch metadata
      const metaSnap = await getDoc(doc(db, 'mandi-prices', '_metadata'));
      const meta = metaSnap.data();
      if (meta?.lastFetchedAt) {
        const d = meta.lastFetchedAt.toDate ? meta.lastFetchedAt.toDate() : new Date(meta.lastFetchedAt);
        setMandiLastFetched(d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }));
      }
      addToast('Mandi prices refreshed!', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to refresh mandi prices.', 'error');
    } finally {
      setMandiRefreshing(false);
    }
  };

  const handleSeedGlossary = async () => {
    setSeedingGlossary(true);
    try {
      const result = await seedRecipeGlossary();
      addToast(`Glossary seeded: ${result.added} added, ${result.skipped} skipped (${result.total} total in file).`, 'success');
      // Refresh count
      const glossarySnap = await getDocs(query(collection(db, 'recipe-glossary'), limit(1000)));
      setGlossaryStats({ count: glossarySnap.size });
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to seed glossary.', 'error');
    } finally {
      setSeedingGlossary(false);
    }
  };

  const handleMigrateRecipes = async () => {
    setMigratingRecipes(true);
    try {
      const result = await migrateUserRecipesToGlossary();
      addToast(`Migration done: ${result.added} added, ${result.skipped} skipped, ${result.errors} errors (${result.totalUsers} users scanned).`, 'success');
      // Refresh count
      const glossarySnap = await getDocs(query(collection(db, 'recipe-glossary'), limit(1000)));
      setGlossaryStats({ count: glossarySnap.size });
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to migrate recipes.', 'error');
    } finally {
      setMigratingRecipes(false);
    }
  };

  if (authLoading || loadingData) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <MomoLoader message="Loading admin panel..." />
    </div>
  );
  if (!isAdmin) return null;

  return (
    <div className="animate-fade-in py-6">
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <HiOutlineShieldCheck className="w-7 h-7 text-neutral-500" />
          <div>
            <h1 className="text-3xl sm:text-4xl font-[family-name:var(--font-display)] text-neutral-900">Admin Panel</h1>
            <p className="text-neutral-500 text-sm font-light">Manage API keys, Google Sheets, and view users.</p>
          </div>
        </div>

        {/* Maintenance Mode Toggle */}
        <div className="border border-neutral-200 rounded-2xl bg-white p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${maintenanceMode ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`} />
              <div>
                <h2 className="text-xs font-medium uppercase tracking-widest text-neutral-900">Maintenance Mode</h2>
                <p className="text-xs text-neutral-400 font-light mt-0.5">
                  {maintenanceMode ? 'App is in maintenance mode. Non-admin users see a maintenance page.' : 'App is live for all users.'}
                </p>
              </div>
            </div>
            <button onClick={handleToggleMaintenance} className={`relative w-12 h-6 rounded-full transition-colors ${maintenanceMode ? 'bg-black' : 'bg-neutral-300'}`}>
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${maintenanceMode ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>

        <div className="border border-neutral-200 rounded-2xl bg-white p-5 space-y-4">
          <div className="flex items-center gap-2"><HiOutlineKey className="w-5 h-5 text-neutral-500" /><h2 className="text-xs font-medium uppercase tracking-widest text-neutral-900">OpenAI API Key</h2></div>
          <p className="text-xs text-neutral-400 font-light">This key is used server-side by Cloud Functions. Users never see it.</p>
          {savedApiKey && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <div className="w-2 h-2 bg-green-500 rounded-full" /><span className="text-sm text-green-700 font-medium">Key configured</span>
              <code className="ml-auto text-xs text-neutral-500 font-mono">{showKey ? savedApiKey : maskedKey}</code>
              <button onClick={() => setShowKey(!showKey)} className="p-1 text-neutral-400 hover:text-neutral-700 transition-colors">{showKey ? <HiEyeOff className="w-4 h-4" /> : <HiEye className="w-4 h-4" />}</button>
            </div>
          )}
          <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm font-mono text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10" />
        </div>
        <div className="border border-neutral-200 rounded-2xl bg-white p-5 space-y-4">
          <div className="flex items-center gap-2"><HiOutlineKey className="w-5 h-5 text-neutral-500" /><h2 className="text-xs font-medium uppercase tracking-widest text-neutral-900">Spoonacular API Key</h2></div>
          <p className="text-xs text-neutral-400 font-light">Used to ground AI recipes in real Spoonacular data (RAG). Optional — falls back to pure GPT-4o if not set.</p>
          {savedSpoonacularKey && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <div className="w-2 h-2 bg-green-500 rounded-full" /><span className="text-sm text-green-700 font-medium">Key configured</span>
              <code className="ml-auto text-xs text-neutral-500 font-mono">{showSpoonacularKey ? savedSpoonacularKey : maskedSpoonacularKey}</code>
              <button onClick={() => setShowSpoonacularKey(!showSpoonacularKey)} className="p-1 text-neutral-400 hover:text-neutral-700 transition-colors">{showSpoonacularKey ? <HiEyeOff className="w-4 h-4" /> : <HiEye className="w-4 h-4" />}</button>
            </div>
          )}
          <input type="password" value={spoonacularKey} onChange={(e) => setSpoonacularKey(e.target.value)} placeholder="Your Spoonacular API key..." className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm font-mono text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10" />
        </div>
        <div className="border border-neutral-200 rounded-2xl bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HiOutlineKey className="w-5 h-5 text-neutral-500" />
              <div>
                <h2 className="text-xs font-medium uppercase tracking-widest text-neutral-900">Higgsfield AI — Recipe Images</h2>
                <p className="text-xs text-neutral-400 font-light mt-0.5">Generates food thumbnails for each recipe. ~$0.60-1.15 per batch (5 images).</p>
              </div>
            </div>
            <button onClick={handleToggleHf} className={`relative w-12 h-6 rounded-full transition-colors ${hfEnabled ? 'bg-black' : 'bg-neutral-300'}`}>
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${hfEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${hfEnabled ? 'bg-green-500' : 'bg-neutral-300'}`} />
            <span className={`text-xs font-medium ${hfEnabled ? 'text-green-700' : 'text-neutral-400'}`}>{hfEnabled ? 'Enabled' : 'Disabled'}</span>
          </div>
          <div>
            <label className="block text-[10px] font-medium uppercase tracking-widest text-neutral-400 mb-1">API Key</label>
            {savedHfApiKey && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" /><span className="text-sm text-green-700 font-medium">Key configured</span>
                <code className="ml-auto text-xs text-neutral-500 font-mono">{showHfApiKey ? savedHfApiKey : maskedHfApiKey}</code>
                <button onClick={() => setShowHfApiKey(!showHfApiKey)} className="p-1 text-neutral-400 hover:text-neutral-700 transition-colors">{showHfApiKey ? <HiEyeOff className="w-4 h-4" /> : <HiEye className="w-4 h-4" />}</button>
              </div>
            )}
            <input type="password" value={hfApiKey} onChange={(e) => setHfApiKey(e.target.value)} placeholder="Higgsfield API key..." className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm font-mono text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10" />
          </div>
          <div>
            <label className="block text-[10px] font-medium uppercase tracking-widest text-neutral-400 mb-1">Secret Key</label>
            {savedHfSecret && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" /><span className="text-sm text-green-700 font-medium">Secret configured</span>
                <code className="ml-auto text-xs text-neutral-500 font-mono">{showHfSecret ? savedHfSecret : maskedHfSecret}</code>
                <button onClick={() => setShowHfSecret(!showHfSecret)} className="p-1 text-neutral-400 hover:text-neutral-700 transition-colors">{showHfSecret ? <HiEyeOff className="w-4 h-4" /> : <HiEye className="w-4 h-4" />}</button>
              </div>
            )}
            <input type="password" value={hfSecret} onChange={(e) => setHfSecret(e.target.value)} placeholder="Higgsfield secret key..." className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm font-mono text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10" />
          </div>
        </div>
        {/* Live Mandi Prices */}
        <div className="border border-neutral-200 rounded-2xl bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HiOutlineKey className="w-5 h-5 text-neutral-500" />
              <div>
                <h2 className="text-xs font-medium uppercase tracking-widest text-neutral-900">Live Mandi Prices — data.gov.in</h2>
                <p className="text-xs text-neutral-400 font-light mt-0.5">Real-time vegetable & grain prices from Indian wholesale markets. Free API.</p>
              </div>
            </div>
            <button onClick={handleToggleMandi} className={`relative w-12 h-6 rounded-full transition-colors ${mandiEnabled ? 'bg-black' : 'bg-neutral-300'}`}>
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${mandiEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${mandiEnabled ? 'bg-green-500' : 'bg-neutral-300'}`} />
              <span className={`text-xs font-medium ${mandiEnabled ? 'text-green-700' : 'text-neutral-400'}`}>{mandiEnabled ? 'Enabled' : 'Disabled'}</span>
            </div>
            {mandiLastFetched && (
              <span className="text-xs text-neutral-400 font-light">Last fetched: {mandiLastFetched}</span>
            )}
            <button onClick={handleRefreshMandi} disabled={mandiRefreshing || !savedMandiApiKey} className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full border border-neutral-200 text-neutral-700 hover:bg-black hover:text-white hover:border-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed ml-auto">
              <HiOutlineRefresh className={`w-3.5 h-3.5 ${mandiRefreshing ? 'animate-spin' : ''}`} />
              {mandiRefreshing ? 'Refreshing...' : 'Refresh Now'}
            </button>
          </div>
          <div>
            <label className="block text-[10px] font-medium uppercase tracking-widest text-neutral-400 mb-1">data.gov.in API Key</label>
            {savedMandiApiKey && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" /><span className="text-sm text-green-700 font-medium">Key configured</span>
                <code className="ml-auto text-xs text-neutral-500 font-mono">{showMandiApiKey ? savedMandiApiKey : maskedMandiApiKey}</code>
                <button onClick={() => setShowMandiApiKey(!showMandiApiKey)} className="p-1 text-neutral-400 hover:text-neutral-700 transition-colors">{showMandiApiKey ? <HiEyeOff className="w-4 h-4" /> : <HiEye className="w-4 h-4" />}</button>
              </div>
            )}
            <input type="password" value={mandiApiKey} onChange={(e) => setMandiApiKey(e.target.value)} placeholder="data.gov.in API key..." className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm font-mono text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10" />
          </div>
        </div>
        {/* Recipe Glossary */}
        <div className="border border-neutral-200 rounded-2xl bg-white p-5 space-y-4">
          <div className="flex items-center gap-2">
            <HiOutlineKey className="w-5 h-5 text-neutral-500" />
            <div>
              <h2 className="text-xs font-medium uppercase tracking-widest text-neutral-900">Recipe Glossary</h2>
              <p className="text-xs text-neutral-400 font-light mt-0.5">Proprietary recipe database that grows with every user interaction. Powers the Weekly Meal Plan.</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${glossaryStats && glossaryStats.count > 0 ? 'bg-green-500' : 'bg-neutral-300'}`} />
              <span className="text-xs font-medium text-neutral-700">
                {glossaryStats ? `${glossaryStats.count} recipes in glossary` : 'Loading...'}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleSeedGlossary}
              disabled={seedingGlossary}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-full border border-neutral-200 text-neutral-700 hover:bg-black hover:text-white hover:border-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {seedingGlossary ? (
                <><div className="w-3.5 h-3.5 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" /> Seeding...</>
              ) : (
                'Seed 200 Recipes'
              )}
            </button>
            <button
              onClick={handleMigrateRecipes}
              disabled={migratingRecipes}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-full border border-neutral-200 text-neutral-700 hover:bg-black hover:text-white hover:border-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {migratingRecipes ? (
                <><div className="w-3.5 h-3.5 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" /> Migrating...</>
              ) : (
                'Import User Recipes'
              )}
            </button>
          </div>
        </div>
        <div className="border border-neutral-200 rounded-2xl bg-white p-5 space-y-4">
          <h2 className="text-xs font-medium uppercase tracking-widest text-neutral-900">Google Sheets Integration</h2>
          <p className="text-xs text-neutral-400 font-light">User sign-up data gets automatically pushed to a Google Sheet.</p>
          <div><label className="block text-[10px] font-medium uppercase tracking-widest text-neutral-400 mb-1">Spreadsheet ID</label><input type="text" value={sheetsId} onChange={(e) => setSheetsId(e.target.value)} placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms" className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm font-mono text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10" /></div>
          <div><label className="block text-[10px] font-medium uppercase tracking-widest text-neutral-400 mb-1">Service Account Email</label><input type="email" value={serviceEmail} onChange={(e) => setServiceEmail(e.target.value)} placeholder="smm@project.iam.gserviceaccount.com" className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10" /></div>
          <div><label className="block text-[10px] font-medium uppercase tracking-widest text-neutral-400 mb-1">Service Account Private Key</label><textarea value={privateKey} onChange={(e) => setPrivateKey(e.target.value)} placeholder="-----BEGIN PRIVATE KEY-----\n..." rows={3} className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm font-mono text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 resize-none" /></div>
        </div>
        <button onClick={handleSave} disabled={saving} className="w-full py-4 bg-black text-white rounded-full font-medium text-xs uppercase tracking-widest hover:bg-black/80 disabled:opacity-50 transition-colors">{saving ? 'Saving...' : 'Save Configuration'}</button>

        {/* Registered Users */}
        <div className="border border-neutral-200 rounded-2xl bg-white p-5 space-y-4">
          <div className="flex items-center gap-2"><HiOutlineUsers className="w-5 h-5 text-neutral-500" /><h2 className="text-xs font-medium uppercase tracking-widest text-neutral-900">Registered Users ({users.length})</h2></div>
          {users.length === 0 ? <p className="text-sm text-neutral-400 font-light">No users yet.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200">
                    <th className="text-left py-2.5 px-2 text-[10px] font-medium uppercase tracking-widest text-neutral-400">Name</th>
                    <th className="text-left py-2.5 px-2 text-[10px] font-medium uppercase tracking-widest text-neutral-400">Email</th>
                    <th className="text-left py-2.5 px-2 text-[10px] font-medium uppercase tracking-widest text-neutral-400 hidden sm:table-cell">Dietary Prefs</th>
                    <th className="text-left py-2.5 px-2 text-[10px] font-medium uppercase tracking-widest text-neutral-400 hidden sm:table-cell">Joined</th>
                    <th className="text-right py-2.5 px-2 text-[10px] font-medium uppercase tracking-widest text-neutral-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.uid} className="border-b border-neutral-100">
                      <td className="py-2.5 px-2 text-neutral-900">{u.displayName || '—'}</td>
                      <td className="py-2.5 px-2 text-neutral-500">{u.email}</td>
                      <td className="py-2.5 px-2 hidden sm:table-cell">{u.dietaryPreferences.length > 0 ? (
                        <div className="flex flex-wrap gap-1">{u.dietaryPreferences.slice(0, 3).map((p) => (<span key={p} className="px-2 py-0.5 bg-neutral-50 text-neutral-600 rounded-full text-xs">{p}</span>))}{u.dietaryPreferences.length > 3 && <span className="text-xs text-neutral-400">+{u.dietaryPreferences.length - 3}</span>}</div>
                      ) : <span className="text-neutral-400">None</span>}</td>
                      <td className="py-2.5 px-2 text-neutral-500 hidden sm:table-cell">{u.createdAt}</td>
                      <td className="py-2.5 px-2">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handlePasswordReset(u.email, u.uid)}
                            disabled={resettingUid === u.uid}
                            title="Send password reset email"
                            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-50 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {resettingUid === u.uid ? (
                              <div className="w-4 h-4 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
                            ) : (
                              <HiOutlineMail className="w-4 h-4" />
                            )}
                          </button>
                          {confirmDeleteUid === u.uid ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDeleteUser(u.uid, u.displayName)}
                                disabled={deletingUid === u.uid}
                                className="px-2 py-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                              >
                                {deletingUid === u.uid ? 'Deleting...' : 'Confirm'}
                              </button>
                              <button
                                onClick={() => setConfirmDeleteUid(null)}
                                className="px-2 py-1 text-xs text-neutral-500 hover:text-neutral-700 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteUid(u.uid)}
                              title="Delete user"
                              className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <HiOutlineTrash className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
