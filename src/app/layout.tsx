import type { Metadata } from 'next';
import { DM_Sans, Caprasimo, Darker_Grotesque } from 'next/font/google';
import './globals.css';
import ClientProviders from '@/components/layout/ClientProviders';

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans', weight: ['300', '400', '500', '700'] });
const caprasimo = Caprasimo({ subsets: ['latin'], variable: '--font-caprasimo', weight: '400' });
const darkerGrotesque = Darker_Grotesque({ subsets: ['latin'], variable: '--font-darker-grotesque', weight: ['400', '700'] });

export const metadata: Metadata = {
  title: 'Good Meals Co.',
  description: 'Turn your fridge ingredients into delicious recipes with AI',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${caprasimo.variable} ${darkerGrotesque.variable}`}>
      <body className="antialiased">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
