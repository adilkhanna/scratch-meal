'use client';

import { ReactNode } from 'react';
import { RecipeFlowProvider } from '@/context/RecipeFlowContext';
import { ToastProvider } from '@/context/ToastContext';
import Header from './Header';
import ToastContainer from '@/components/ui/Toast';

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <RecipeFlowProvider>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1 max-w-3xl mx-auto w-full px-4 pb-8">{children}</main>
        </div>
        <ToastContainer />
      </RecipeFlowProvider>
    </ToastProvider>
  );
}
