'use client';

import { useAuth } from '@/context/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

const PUBLIC_PATHS = ['/login'];

function MaintenancePage() {
  return (
    <div className="min-h-screen bg-[#f0ede6] flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Brand watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
        <span className="text-[8rem] sm:text-[12rem] font-[family-name:var(--font-display)] text-[#7a8c6e]/[0.08] leading-none text-center">
          Good Meals Co.
        </span>
      </div>

      {/* Content */}
      <div className="relative z-10 text-center max-w-md animate-fade-in">
        <div className="text-5xl mb-6">🔧</div>
        <h1 className="text-3xl sm:text-4xl font-[family-name:var(--font-display)] text-neutral-900 mb-3">
          We&apos;re Updating
        </h1>
        <p className="text-neutral-500 font-light text-sm leading-relaxed mb-8">
          Good Meals Co. is currently undergoing maintenance. We&apos;ll be back
          shortly with something delicious.
        </p>
        <a
          href="mailto:adil@unomono.in"
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-neutral-900 text-white rounded-full font-medium text-xs uppercase tracking-widest hover:bg-neutral-700 transition-colors"
        >
          Contact Us
        </a>
        <p className="text-xs text-neutral-400 mt-4">
          adil@unomono.in
        </p>
      </div>
    </div>
  );
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin, maintenanceMode } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const isPublic = PUBLIC_PATHS.includes(pathname);
    if (!user && !isPublic) router.replace('/login');
    if (user && isPublic) router.replace('/');
  }, [user, loading, pathname, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="text-4xl animate-pulse-soft">🍳</div>
          <p className="text-sm text-neutral-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Maintenance mode gate — admins bypass, unauthenticated users still see login
  if (maintenanceMode && user && !isAdmin) {
    return <MaintenancePage />;
  }

  const isPublic = PUBLIC_PATHS.includes(pathname);
  if (!user && !isPublic) return null;
  if (user && isPublic) return null;

  return <>{children}</>;
}
