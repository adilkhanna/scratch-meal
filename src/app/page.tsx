'use client';

import { useRouter } from 'next/navigation';
import StaggeredPageTitle from '@/components/ui/StaggeredPageTitle';
import STEP_THEMES from '@/config/step-themes';

const theme = STEP_THEMES.home;

export default function HomePage() {
  const router = useRouter();

  return (
    <div
      className="min-h-screen flex flex-col animate-radial-glow"
      style={{ background: theme.background, backgroundSize: '200% 200%' }}
    >
      {/* Top content */}
      <div className="max-w-3xl mx-auto text-center space-y-10 pt-24 sm:pt-28 px-6">
        <StaggeredPageTitle
          text="good meals co."
          className="text-[clamp(40px,6vw,67px)] tracking-[-0.25px]"
        />

        <p className="text-[14px] font-[family-name:var(--font-mono-option)] tracking-[1px] uppercase text-black/50">
          Choose how you want to eat
        </p>
      </div>

      {/* Feature cards — centered in remaining space */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-2xl w-full grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Quick Recipes Card */}
          <button
            onClick={() => router.push('/quick-recipes')}
            className="group p-8 border-[1.5px] border-black rounded-[30px] bg-white/30 backdrop-blur-sm text-left hover:bg-black hover:text-white transition-all duration-300"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-full border-[1.5px] border-current flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
                  <path d="M9 18h6" />
                  <path d="M10 22h4" />
                </svg>
              </div>
              <h2 className="text-[20px] font-[family-name:var(--font-display)] lowercase">
                quick recipes.
              </h2>
              <p className="text-[13px] font-[family-name:var(--font-mono-option)] tracking-[0.5px] uppercase opacity-60">
                Got ingredients? Find 5 recipes instantly from our verified database.
              </p>
            </div>
          </button>

          {/* Weekly Meal Plan Card */}
          <button
            onClick={() => router.push('/meal-plan')}
            className="group p-8 border-[1.5px] border-black rounded-[30px] bg-white/30 backdrop-blur-sm text-left hover:bg-black hover:text-white transition-all duration-300"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-full border-[1.5px] border-current flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                  <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" />
                </svg>
              </div>
              <h2 className="text-[20px] font-[family-name:var(--font-display)] lowercase">
                weekly meal plan.
              </h2>
              <p className="text-[13px] font-[family-name:var(--font-mono-option)] tracking-[0.5px] uppercase opacity-60">
                AI plans your entire week of balanced meals for you or your family.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Large brand footer */}
      <div className="mt-auto text-center select-none overflow-hidden">
        <span className="font-[family-name:var(--font-brand)] text-[clamp(80px,15vw,225px)] font-normal text-black leading-none tracking-[-0.25px] block">
          GOOD MEALS CO.
        </span>
      </div>
    </div>
  );
}
