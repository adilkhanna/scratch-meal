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

  const navItems = [
    { href: '/', label: 'New Recipe' },
    { href: '/history', label: 'My Recipes' },
  ];

  const initials = (user.displayName || user.email || '?')
    .split(' ')
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-cream-200">
      <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 font-bold text-xl">
          <span className="text-2xl">🍳</span>
          <span className="hidden sm:inline font-[family-name:var(--font-serif)] text-olive-800 tracking-tight">
            Good Meals Co.
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                pathname === item.href
                  ? 'bg-olive-100 text-olive-800'
                  : 'text-[#7a7568] hover:text-olive-800 hover:bg-cream-50'
              )}
            >
              {item.label}
            </Link>
          ))}

          <div className="relative ml-2" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-9 h-9 rounded-full bg-olive-600 text-white flex items-center justify-center text-xs font-bold hover:bg-olive-700 transition-colors"
            >
              {user.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.photoURL} alt="" className="w-9 h-9 rounded-full" />
              ) : (
                initials
              )}
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white border border-cream-200 rounded-xl shadow-lg shadow-black/5 py-1 animate-fade-in z-50">
                <div className="px-4 py-2.5 border-b border-cream-200">
                  <p className="text-sm font-semibold text-[#2d2d2a] truncate">{user.displayName || 'User'}</p>
                  <p className="text-xs text-[#a89f94] truncate">{user.email}</p>
                </div>
                <Link href="/settings" onClick={() => setDropdownOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#7a7568] hover:bg-cream-50 transition-colors">
                  <HiOutlineCog className="w-4 h-4" />
                  Settings
                </Link>
                {isAdmin && (
                  <Link href="/admin" onClick={() => setDropdownOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-olive-700 hover:bg-olive-50 transition-colors">
                    <HiOutlineShieldCheck className="w-4 h-4" />
                    Admin Panel
                  </Link>
                )}
                <button onClick={() => { setDropdownOpen(false); signOut(); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                  <HiOutlineLogout className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>

        <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 text-[#7a7568] hover:text-[#2d2d2a]">
          {mobileOpen ? <HiOutlineX size={24} /> : <HiOutlineMenu size={24} />}
        </button>
      </div>

      {mobileOpen && (
        <nav className="md:hidden border-t border-cream-200 bg-white px-4 py-2 animate-fade-in">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={clsx('block px-4 py-3 rounded-lg text-sm font-medium transition-colors', pathname === item.href ? 'bg-olive-100 text-olive-800' : 'text-[#7a7568] hover:bg-cream-50')}>
              {item.label}
            </Link>
          ))}
          <Link href="/settings" onClick={() => setMobileOpen(false)} className="block px-4 py-3 rounded-lg text-sm font-medium text-[#7a7568] hover:bg-cream-50">Settings</Link>
          {isAdmin && <Link href="/admin" onClick={() => setMobileOpen(false)} className="block px-4 py-3 rounded-lg text-sm font-medium text-olive-700 hover:bg-olive-50">Admin Panel</Link>}
          <button onClick={() => { setMobileOpen(false); signOut(); }} className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50">Sign Out</button>
        </nav>
      )}
    </header>
  );
}
