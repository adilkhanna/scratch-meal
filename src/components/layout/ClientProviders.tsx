'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { RecipeFlowProvider } from '@/context/RecipeFlowContext';
import { MealPlanFlowProvider } from '@/context/MealPlanFlowContext';
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
          <MealPlanFlowProvider>
            <AuthGuard>
              <div className="min-h-screen flex flex-col">
                <Header />
                <main className="flex-1 -mt-16">{children}</main>
              </div>
              <ChatWidget />
            </AuthGuard>
            <ToastContainer />
          </MealPlanFlowProvider>
        </RecipeFlowProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
