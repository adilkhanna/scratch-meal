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
    <header className="sticky top-0 z-50 bg-[#1a1a1a]/80 backdrop-blur-xl border-b border-white/[0.08]">
      <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 font-bold text-xl">
          <span className="text-2xl">🍳</span>
          <span className="hidden sm:inline font-[family-name:var(--font-serif)] gradient-text tracking-tight">
            Good Meals Co.
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'px-4 py-2 rounded-xl text-sm font-medium transition-all',
                pathname === item.href
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'text-[#a0a0a0] hover:text-[#f5f5f5] hover:bg-white/[0.05]'
              )}
            >
              {item.label}
            </Link>
          ))}

          <div className="relative ml-2" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-9 h-9 rounded-full bg-amber-600 text-white flex items-center justify-center text-xs font-bold
                         hover:bg-amber-500 transition-colors ring-1 ring-amber-500/30"
            >
              {user.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.photoURL} alt="" className="w-9 h-9 rounded-full" />
              ) : (
                initials
              )}
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-[#252525] border border-white/[0.1] rounded-2xl shadow-2xl shadow-black/40 py-1 animate-fade-in z-50">
                <div className="px-4 py-2.5 border-b border-white/[0.08]">
                  <p className="text-sm font-semibold text-[#f5f5f5] truncate">
                    {user.displayName || 'User'}
                  </p>
                  <p className="text-xs text-[#666] truncate">{user.email}</p>
                </div>
                <Link
                  href="/settings"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#a0a0a0] hover:bg-white/[0.05] transition-colors"
                >
                  <HiOutlineCog className="w-4 h-4" />
                  Settings
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-amber-400 hover:bg-amber-500/10 transition-colors"
                  >
                    <HiOutlineShieldCheck className="w-4 h-4" />
                    Admin Panel
                  </Link>
                )}
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    signOut();
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <HiOutlineLogout className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 text-[#a0a0a0] hover:text-[#f5f5f5]"
        >
          {mobileOpen ? <HiOutlineX size={24} /> : <HiOutlineMenu size={24} />}
        </button>
      </div>

      {mobileOpen && (
        <nav className="md:hidden border-t border-white/[0.08] bg-[#1a1a1a] px-4 py-2 animate-fade-in">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={clsx(
                'block px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                pathname === item.href
                  ? 'bg-amber-500/10 text-amber-400'
                  : 'text-[#a0a0a0] hover:bg-white/[0.05]'
              )}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/settings"
            onClick={() => setMobileOpen(false)}
            className="block px-4 py-3 rounded-xl text-sm font-medium text-[#a0a0a0] hover:bg-white/[0.05]"
          >
            Settings
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              onClick={() => setMobileOpen(false)}
              className="block px-4 py-3 rounded-xl text-sm font-medium text-amber-400 hover:bg-amber-500/10"
            >
              Admin Panel
            </Link>
          )}
          <button
            onClick={() => {
              setMobileOpen(false);
              signOut();
            }}
            className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10"
          >
            Sign Out
          </button>
        </nav>
      )}
    </header>
  );
}
