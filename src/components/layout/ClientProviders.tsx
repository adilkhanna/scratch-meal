'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { RecipeFlowProvider } from '@/context/RecipeFlowContext';
import { ToastProvider } from '@/context/ToastContext';
import AuthGuard from '@/components/auth/AuthGuard';
import Header from './Header';
import ToastContainer from '@/components/ui/Toast';

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <RecipeFlowProvider>
          <AuthGuard>
            <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#0f0f0f] via-[#141414] to-[#0f0f0f]">
              <Header />
              <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 pb-12">{children}</main>
            </div>
          </AuthGuard>
          <ToastContainer />
        </RecipeFlowProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
