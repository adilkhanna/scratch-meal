'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { doc, getDoc, setDoc, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { HiOutlineShieldCheck, HiEye, HiEyeOff, HiOutlineUsers, HiOutlineKey } from 'react-icons/hi';

interface UserRecord { uid: string; displayName: string; email: string; dietaryPreferences: string[]; createdAt: string; }

export default function AdminPage() {
  const router = useRouter();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { addToast } = useToast();
  const [apiKey, setApiKey] = useState('');
  const [savedApiKey, setSavedApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [sheetsId, setSheetsId] = useState('');
  const [serviceEmail, setServiceEmail] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadConfig = useCallback(async () => {
    try { const configSnap = await getDoc(doc(db, 'admin-config', 'app')); const data = configSnap.data();
      if (data) { setSavedApiKey(data.openaiApiKey || ''); setApiKey(data.openaiApiKey || ''); setSheetsId(data.googleSheetsId || ''); setServiceEmail(data.googleServiceEmail || ''); setPrivateKey(data.googlePrivateKey || ''); }
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
    try { await setDoc(doc(db, 'admin-config', 'app'), { openaiApiKey: apiKey.trim(), googleSheetsId: sheetsId.trim(), googleServiceEmail: serviceEmail.trim(), googlePrivateKey: privateKey.trim() }, { merge: true });
      setSavedApiKey(apiKey.trim()); addToast('Configuration saved!', 'success');
    } catch (err) { addToast('Failed to save configuration.', 'error'); console.error(err); }
    finally { setSaving(false); }
  };

  const maskedKey = savedApiKey ? `${savedApiKey.slice(0, 7)}${'*'.repeat(Math.max(0, savedApiKey.length - 11))}${savedApiKey.slice(-4)}` : '';

  if (authLoading || loadingData) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3"><div className="text-4xl animate-pulse-soft">🔧</div><p className="text-sm text-[#a89f94]">Loading admin panel...</p></div>
    </div>
  );
  if (!isAdmin) return null;

  return (
    <div className="animate-fade-in py-6">
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <HiOutlineShieldCheck className="w-7 h-7 text-olive-600" />
          <div>
            <h1 className="text-2xl font-bold text-[#2d2d2a] font-[family-name:var(--font-serif)]">Admin Panel</h1>
            <p className="text-[#7a7568] text-sm">Manage API keys, Google Sheets, and view users.</p>
          </div>
        </div>
        <div className="border border-cream-200 rounded-xl bg-white p-5 space-y-4">
          <div className="flex items-center gap-2"><HiOutlineKey className="w-5 h-5 text-olive-600" /><h2 className="font-semibold text-[#2d2d2a]">OpenAI API Key</h2></div>
          <p className="text-xs text-[#a89f94]">This key is used server-side by Cloud Functions. Users never see it.</p>
          {savedApiKey && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <div className="w-2 h-2 bg-green-500 rounded-full" /><span className="text-sm text-green-700 font-medium">Key configured</span>
              <code className="ml-auto text-xs text-[#7a7568] font-mono">{showKey ? savedApiKey : maskedKey}</code>
              <button onClick={() => setShowKey(!showKey)} className="p-1 text-[#a89f94] hover:text-[#5a5347] transition-colors">{showKey ? <HiEyeOff className="w-4 h-4" /> : <HiEye className="w-4 h-4" />}</button>
            </div>
          )}
          <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." className="w-full px-3 py-2.5 rounded-lg border border-cream-200 bg-white text-sm font-mono text-[#2d2d2a] placeholder:text-[#a89f94] focus:outline-none focus:ring-2 focus:ring-olive-500/30" />
        </div>
        <div className="border border-cream-200 rounded-xl bg-white p-5 space-y-4">
          <h2 className="font-semibold text-[#2d2d2a]">Google Sheets Integration</h2>
          <p className="text-xs text-[#a89f94]">User sign-up data gets automatically pushed to a Google Sheet.</p>
          <div><label className="block text-xs font-medium text-[#7a7568] mb-1">Spreadsheet ID</label><input type="text" value={sheetsId} onChange={(e) => setSheetsId(e.target.value)} placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms" className="w-full px-3 py-2.5 rounded-lg border border-cream-200 bg-white text-sm font-mono text-[#2d2d2a] placeholder:text-[#a89f94] focus:outline-none focus:ring-2 focus:ring-olive-500/30" /></div>
          <div><label className="block text-xs font-medium text-[#7a7568] mb-1">Service Account Email</label><input type="email" value={serviceEmail} onChange={(e) => setServiceEmail(e.target.value)} placeholder="smm@project.iam.gserviceaccount.com" className="w-full px-3 py-2.5 rounded-lg border border-cream-200 bg-white text-sm text-[#2d2d2a] placeholder:text-[#a89f94] focus:outline-none focus:ring-2 focus:ring-olive-500/30" /></div>
          <div><label className="block text-xs font-medium text-[#7a7568] mb-1">Service Account Private Key</label><textarea value={privateKey} onChange={(e) => setPrivateKey(e.target.value)} placeholder="-----BEGIN PRIVATE KEY-----\n..." rows={3} className="w-full px-3 py-2.5 rounded-lg border border-cream-200 bg-white text-sm font-mono text-[#2d2d2a] placeholder:text-[#a89f94] focus:outline-none focus:ring-2 focus:ring-olive-500/30 resize-none" /></div>
        </div>
        <button onClick={handleSave} disabled={saving} className="w-full py-3.5 bg-olive-600 text-white rounded-xl font-semibold text-sm hover:bg-olive-700 disabled:opacity-50 transition-colors">{saving ? 'Saving...' : 'Save Configuration'}</button>
        <div className="border border-cream-200 rounded-xl bg-white p-5 space-y-4">
          <div className="flex items-center gap-2"><HiOutlineUsers className="w-5 h-5 text-olive-600" /><h2 className="font-semibold text-[#2d2d2a]">Registered Users ({users.length})</h2></div>
          {users.length === 0 ? <p className="text-sm text-[#a89f94]">No users yet.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-cream-200"><th className="text-left py-2 px-2 font-medium text-[#a89f94]">Name</th><th className="text-left py-2 px-2 font-medium text-[#a89f94]">Email</th><th className="text-left py-2 px-2 font-medium text-[#a89f94]">Dietary Prefs</th><th className="text-left py-2 px-2 font-medium text-[#a89f94]">Joined</th></tr></thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.uid} className="border-b border-cream-100">
                      <td className="py-2.5 px-2 text-[#2d2d2a]">{u.displayName || '—'}</td>
                      <td className="py-2.5 px-2 text-[#7a7568]">{u.email}</td>
                      <td className="py-2.5 px-2">{u.dietaryPreferences.length > 0 ? (
                        <div className="flex flex-wrap gap-1">{u.dietaryPreferences.slice(0, 3).map((p) => (<span key={p} className="px-2 py-0.5 bg-olive-50 text-olive-600 rounded-full text-xs">{p}</span>))}{u.dietaryPreferences.length > 3 && <span className="text-xs text-[#a89f94]">+{u.dietaryPreferences.length - 3}</span>}</div>
                      ) : <span className="text-[#a89f94]">None</span>}</td>
                      <td className="py-2.5 px-2 text-[#7a7568]">{u.createdAt}</td>
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
