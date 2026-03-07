'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ONBOARDING_SLIDES } from '@/config/onboarding-slides';

interface OnboardingScreenProps {
  userName: string;
  onComplete: () => void;
}

export default function OnboardingScreen({ userName, onComplete }: OnboardingScreenProps) {
  const [current, setCurrent] = useState(0);
  const slide = ONBOARDING_SLIDES[current];
  const isLast = current === ONBOARDING_SLIDES.length - 1;

  const title = slide.dynamic
    ? slide.title.replace('{username}', userName || 'there')
    : slide.title;

  const next = () => {
    if (isLast) {
      onComplete();
    } else {
      setCurrent((prev) => prev + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-[#111] flex items-center justify-center p-4 sm:p-8">
      {/* Card */}
      <div className="relative w-full max-w-4xl rounded-3xl sm:rounded-[40px] lg:rounded-[60px] overflow-hidden flex flex-col"
        style={{ maxHeight: '90vh' }}
      >
        {/* Animated radial glow background */}
        <div
          className="absolute inset-0 animate-radial-glow"
          style={{
            background: 'radial-gradient(ellipse at 50% 45%, rgba(255, 80, 80, 0.35) 0%, rgba(255, 120, 80, 0.15) 35%, rgba(255, 255, 255, 0) 70%), linear-gradient(180deg, #fff 0%, #fff 100%)',
          }}
        />

        {/* Content area */}
        <div className="relative flex-1 flex flex-col items-center px-6 pt-8 pb-4 sm:px-12 sm:pt-10 sm:pb-6 lg:px-16 lg:pt-12">
          {/* Brand */}
          <p className="text-sm sm:text-lg lg:text-[20px] font-[family-name:var(--font-brand)] font-bold tracking-[-0.25px] text-black mb-4 sm:mb-6">
            GOOD MEALS CO.
          </p>

          {/* Animated text container */}
          <div key={current} className="animate-text-enter flex-1 flex flex-col items-center justify-center text-center">
            {/* Title */}
            <h1 className="font-[family-name:var(--font-onboarding)] text-4xl sm:text-6xl lg:text-[80px] text-black leading-tight mb-4 sm:mb-6 lg:mb-8">
              {title}
            </h1>

            {/* Body */}
            <p className="font-[family-name:var(--font-onboarding)] text-lg sm:text-2xl lg:text-[42px] text-black leading-snug lg:leading-[1.3] max-w-xl lg:max-w-2xl">
              {slide.body}
            </p>
          </div>

          {/* Arrow button */}
          <button
            onClick={next}
            className="mt-4 sm:mt-6 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full border border-neutral-300 hover:border-neutral-500 transition-colors"
            aria-label={isLast ? 'Get started' : 'Next slide'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16l4-4-4-4" />
              <path d="M8 12h8" />
            </svg>
          </button>

          {/* Progress dots + skip */}
          <div className="mt-4 sm:mt-6 flex items-center gap-4">
            <button
              onClick={onComplete}
              className="text-xs text-neutral-400 hover:text-neutral-600 uppercase tracking-widest transition-colors"
            >
              Skip
            </button>
            <div className="flex gap-1.5">
              {ONBOARDING_SLIDES.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-colors ${
                    i === current ? 'bg-black' : 'bg-neutral-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Food image strip */}
        <div className="relative h-24 sm:h-36 lg:h-48 mx-3 sm:mx-4 mb-3 sm:mb-4 rounded-2xl sm:rounded-[30px] lg:rounded-[45px] overflow-hidden">
          <Image
            key={slide.image}
            src={slide.image}
            alt="Food illustration"
            fill
            className="object-cover"
            priority
          />
        </div>
      </div>
    </div>
  );
}
