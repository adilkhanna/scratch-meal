'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import clsx from 'clsx';
import { HiOutlineMenu, HiOutlineX, HiOutlineLogout, HiOutlineCog, HiOutlineShieldCheck } from 'react-icons/hi';

export default function Header() {
  const pathname = usePathname();
  const { user, isAdmin, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!user) return null;

  const leftNav = [
    { href: '/history', label: 'My Recipes' },
    { href: '/', label: 'New Recipes' },
  ];

  const rightNav = [
    { href: '/plan', label: 'Meal Plan' },
    { href: '/settings', label: 'Settings' },
  ];

  const initials = (user.displayName || user.email || '?')
    .split(' ')
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-50 bg-[#DBE9E3]/90 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-6 sm:px-8 h-16 flex items-center justify-between">
        {/* Left nav */}
        <div className="hidden md:flex items-center gap-8">
          {leftNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'text-xs font-medium tracking-[0.15em] uppercase transition-colors',
                pathname === item.href
                  ? 'text-neutral-900'
                  : 'text-neutral-500 hover:text-neutral-900'
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Center brand */}
        <Link href="/" className="font-[family-name:var(--font-brand)] text-[25px] font-bold text-black tracking-tight leading-none">
          GOOD MEALS CO.
        </Link>

        {/* Right nav + avatar */}
        <div className="hidden md:flex items-center gap-8">
          {rightNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'text-xs font-medium tracking-[0.15em] uppercase transition-colors',
                pathname === item.href
                  ? 'text-neutral-900'
                  : 'text-neutral-500 hover:text-neutral-900'
              )}
            >
              {item.label}
            </Link>
          ))}

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-9 h-9 rounded-full bg-neutral-300 text-white flex items-center justify-center text-xs font-bold hover:bg-neutral-400 transition-colors"
            >
              {user.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.photoURL} alt="" className="w-9 h-9 rounded-full" />
              ) : (
                initials
              )}
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white border border-neutral-200 rounded-2xl shadow-lg shadow-black/5 py-1 animate-fade-in z-50">
                <div className="px-4 py-2.5 border-b border-neutral-200">
                  <p className="text-sm font-medium text-neutral-900 truncate">{user.displayName || 'User'}</p>
                  <p className="text-xs text-neutral-400 truncate">{user.email}</p>
                </div>
                {isAdmin && (
                  <Link href="/admin" onClick={() => setDropdownOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-xs uppercase tracking-wider text-neutral-500 hover:bg-neutral-50 transition-colors">
                    <HiOutlineShieldCheck className="w-4 h-4" />
                    Admin Panel
                  </Link>
                )}
                <button onClick={() => { setDropdownOpen(false); signOut(); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs uppercase tracking-wider text-red-600 hover:bg-red-50 transition-colors">
                  <HiOutlineLogout className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>

        <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 text-neutral-500 hover:text-neutral-900">
          {mobileOpen ? <HiOutlineX size={24} /> : <HiOutlineMenu size={24} />}
        </button>
      </div>

      {mobileOpen && (
        <nav className="md:hidden border-t border-neutral-300/50 bg-[#DBE9E3] px-6 py-3 animate-fade-in space-y-1">
          {[...leftNav, ...rightNav].map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={clsx('block px-3 py-3 text-xs font-medium tracking-widest uppercase transition-colors', pathname === item.href ? 'text-neutral-900' : 'text-neutral-500 hover:text-neutral-900')}>
              {item.label}
            </Link>
          ))}
          {isAdmin && <Link href="/admin" onClick={() => setMobileOpen(false)} className="block px-3 py-3 text-xs font-medium tracking-widest uppercase text-neutral-500 hover:text-neutral-900">Admin Panel</Link>}
          <button onClick={() => { setMobileOpen(false); signOut(); }} className="w-full text-left px-3 py-3 text-xs font-medium tracking-widest uppercase text-red-600 hover:bg-red-50">Sign Out</button>
        </nav>
      )}
    </header>
  );
}
