'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { RecipeFlowProvider } from '@/context/RecipeFlowContext';
import { ToastProvider } from '@/context/ToastContext';
import AuthGuard from '@/components/auth/AuthGuard';
import Header from './Header';
import ToastContainer from '@/components/ui/Toast';
import ChatWidget from '@/components/chat/ChatWidget';

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <RecipeFlowProvider>
          <AuthGuard>
            <div className="min-h-screen flex flex-col">
              <Header />
              <main className="flex-1 -mt-16">{children}</main>
            </div>
            <ChatWidget />
          </AuthGuard>
          <ToastContainer />
        </RecipeFlowProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
