import type { Metadata } from 'next';
import './globals.css';
import ClientProviders from '@/components/layout/ClientProviders';

export const metadata: Metadata = {
  title: 'Scratch Meal Maker',
  description: 'Turn your fridge ingredients into delicious recipes with AI',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
