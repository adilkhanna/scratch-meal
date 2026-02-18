'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import clsx from 'clsx';
import { HiOutlineMenu, HiOutlineX } from 'react-icons/hi';

const NAV_ITEMS = [
  { href: '/', label: 'New Recipe' },
  { href: '/history', label: 'My Recipes' },
  { href: '/settings', label: 'Settings' },
];

export default function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-stone-200">
      <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-orange-600">
          <span className="text-2xl">🍳</span>
          <span>Scratch Meal Maker</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                pathname === item.href
                  ? 'bg-orange-100 text-orange-700'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 text-stone-600 hover:text-stone-900"
        >
          {mobileOpen ? <HiOutlineX size={24} /> : <HiOutlineMenu size={24} />}
        </button>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <nav className="md:hidden border-t border-stone-200 bg-white px-4 py-2 animate-fade-in">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={clsx(
                'block px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                pathname === item.href
                  ? 'bg-orange-100 text-orange-700'
                  : 'text-stone-600 hover:bg-stone-100'
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
