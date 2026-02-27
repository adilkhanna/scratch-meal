'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { DIETARY_CONDITIONS, DIETARY_CATEGORY_LABELS, DIETARY_CATEGORY_ICONS } from '@/config/dietary-conditions';
import { DietaryCategoryType } from '@/types';
import clsx from 'clsx';
import { HiChevronDown } from 'react-icons/hi';
import { FcGoogle } from 'react-icons/fc';

const CATEGORIES: DietaryCategoryType[] = ['allergies', 'intolerances', 'medical', 'religious', 'lifestyle'];

export default function LoginPage() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const { addToast } = useToast();
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [dietaryPrefs, setDietaryPrefs] = useState<string[]>([]);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const toggleDietary = (id: string) => { setDietaryPrefs((prev) => prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]); };

  const handleGoogle = async () => {
    setSubmitting(true);
    try { await signInWithGoogle(); addToast('Welcome!', 'success'); }
    catch (err) { addToast(err instanceof Error ? err.message : 'Google sign-in failed', 'error'); }
    finally { setSubmitting(false); }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault(); if (!email || !password) return; setSubmitting(true);
    try { await signInWithEmail(email, password); addToast('Welcome back!', 'success'); }
    catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign in failed';
      addToast(msg.includes('invalid-credential') ? 'Invalid email or password.' : msg.includes('user-not-found') ? 'No account found. Please sign up.' : msg, 'error');
    } finally { setSubmitting(false); }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault(); if (!name || !email || !password) return;
    if (password.length < 6) { addToast('Password must be at least 6 characters.', 'error'); return; }
    setSubmitting(true);
    try { await signUpWithEmail(name, email, password, dietaryPrefs); addToast('Account created! Welcome!', 'success'); }
    catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign up failed';
      addToast(msg.includes('email-already-in-use') ? 'Email already in use. Try signing in.' : msg, 'error');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="animate-fade-in max-w-md mx-auto py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-[family-name:var(--font-display)] text-neutral-900 mb-1">Good Meals Co.</h1>
        <p className="text-neutral-500 text-sm font-light mt-2">Turn your fridge ingredients into delicious recipes</p>
      </div>

      <div className="flex bg-neutral-50 rounded-full p-1 mb-6 border border-neutral-200">
        <button onClick={() => setTab('signin')} className={clsx('flex-1 py-2.5 rounded-full text-xs font-medium uppercase tracking-widest transition-colors', tab === 'signin' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400')}>Sign In</button>
        <button onClick={() => setTab('signup')} className={clsx('flex-1 py-2.5 rounded-full text-xs font-medium uppercase tracking-widest transition-colors', tab === 'signup' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400')}>Sign Up</button>
      </div>

      <button onClick={handleGoogle} disabled={submitting} className="w-full flex items-center justify-center gap-3 py-3.5 border border-neutral-200 rounded-full font-medium text-xs uppercase tracking-wider text-neutral-700 bg-white hover:bg-neutral-50 disabled:opacity-50 transition-colors mb-4">
        <FcGoogle className="w-5 h-5" />Continue with Google
      </button>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-neutral-200" /><span className="text-xs text-neutral-400">or</span><div className="flex-1 h-px bg-neutral-200" />
      </div>

      {tab === 'signin' && (
        <form onSubmit={handleEmailSignIn} className="space-y-4 animate-fade-in">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required className="w-full px-6 py-3.5 rounded-full border border-neutral-200 bg-white text-sm font-light text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required className="w-full px-6 py-3.5 rounded-full border border-neutral-200 bg-white text-sm font-light text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10" />
          <button type="submit" disabled={submitting} className="w-full py-3.5 bg-[#0059FF] text-white rounded-full font-medium text-xs uppercase tracking-widest hover:bg-[#0047CC] disabled:opacity-50 transition-colors">{submitting ? 'Signing in...' : 'Sign In'}</button>
        </form>
      )}

      {tab === 'signup' && (
        <form onSubmit={handleEmailSignUp} className="space-y-4 animate-fade-in">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" required className="w-full px-6 py-3.5 rounded-full border border-neutral-200 bg-white text-sm font-light text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10" />
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required className="w-full px-6 py-3.5 rounded-full border border-neutral-200 bg-white text-sm font-light text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (min 6 characters)" required minLength={6} className="w-full px-6 py-3.5 rounded-full border border-neutral-200 bg-white text-sm font-light text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10" />
          <div>
            <label className="block text-xs font-medium uppercase tracking-widest text-neutral-400 mb-2">Dietary preferences <span className="normal-case tracking-normal font-light">(optional)</span></label>
            {dietaryPrefs.length > 0 && <p className="text-xs text-neutral-900 mb-2 font-medium">{dietaryPrefs.length} selected</p>}
            <div className="space-y-2 max-h-64 overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-2">
              {CATEGORIES.map((cat) => {
                const conditions = DIETARY_CONDITIONS.filter((c) => c.category === cat);
                const isExpanded = expandedCat === cat;
                const selectedCount = conditions.filter((c) => dietaryPrefs.includes(c.id)).length;
                return (
                  <div key={cat}>
                    <button type="button" onClick={() => setExpandedCat(isExpanded ? null : cat)} className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-neutral-50 rounded-lg">
                      <span className="flex items-center gap-2">
                        <span>{DIETARY_CATEGORY_ICONS[cat]}</span>
                        <span className="font-medium text-neutral-700">{DIETARY_CATEGORY_LABELS[cat]}</span>
                        {selectedCount > 0 && <span className="bg-[#0059FF] text-white text-xs px-1.5 py-0.5 rounded-full">{selectedCount}</span>}
                      </span>
                      <HiChevronDown className={clsx('w-4 h-4 text-neutral-400 transition-transform', isExpanded && 'rotate-180')} />
                    </button>
                    {isExpanded && (
                      <div className="pl-3 pb-2 grid grid-cols-1 gap-1">
                        {conditions.map((c) => (
                          <button key={c.id} type="button" onClick={() => toggleDietary(c.id)} className={clsx('text-left px-3 py-1.5 rounded-lg text-xs transition-colors', dietaryPrefs.includes(c.id) ? 'bg-[#0059FF]/10 text-[#0059FF] font-medium' : 'text-neutral-500 hover:bg-neutral-50')}>{c.label}</button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <button type="submit" disabled={submitting} className="w-full py-3.5 bg-[#0059FF] text-white rounded-full font-medium text-xs uppercase tracking-widest hover:bg-[#0047CC] disabled:opacity-50 transition-colors">{submitting ? 'Creating account...' : 'Create Account'}</button>
        </form>
      )}
    </div>
  );
}
