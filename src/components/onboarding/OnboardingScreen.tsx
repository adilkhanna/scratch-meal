'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { ONBOARDING_SLIDES } from '@/config/onboarding-slides';

interface OnboardingScreenProps {
  userName: string;
  onComplete: () => void;
}

// Collect unique image paths for preloading
const UNIQUE_IMAGES = [...new Set(ONBOARDING_SLIDES.map((s) => s.image))];

const CHAR_DELAY = 0.015; // seconds per character

/** Renders text with per-character staggered fade-up animation */
function StaggeredText({ text, baseDelay = 0 }: { text: string; baseDelay?: number }) {
  let charIdx = 0;

  return (
    <>
      {text.split(/(\s+)/).map((segment, si) => {
        // Spaces — render as normal inline space (allows word wrapping)
        if (/^\s+$/.test(segment)) {
          charIdx += segment.length;
          return <span key={si}> </span>;
        }
        // Words — wrap in nowrap span so letters stay together
        return (
          <span key={si} className="inline-block whitespace-nowrap">
            {segment.split('').map((char) => {
              const delay = baseDelay + charIdx * CHAR_DELAY;
              charIdx++;
              return (
                <span
                  key={charIdx}
                  className="inline-block opacity-0"
                  style={{
                    animation: `char-enter 0.65s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s forwards`,
                  }}
                >
                  {char}
                </span>
              );
            })}
          </span>
        );
      })}
    </>
  );
}

export default function OnboardingScreen({ userName, onComplete }: OnboardingScreenProps) {
  const [current, setCurrent] = useState(0);
  const slide = ONBOARDING_SLIDES[current];
  const isLast = current === ONBOARDING_SLIDES.length - 1;

  // Preload all food images on mount
  useEffect(() => {
    UNIQUE_IMAGES.forEach((src) => {
      const img = new window.Image();
      img.src = src;
    });
  }, []);

  const title = slide.dynamic
    ? slide.title.replace('{username}', userName || 'there')
    : slide.title;

  // Body starts 0.4s after the title begins (matching previous stagger feel)
  const bodyBaseDelay = 0.55;

  const next = () => {
    if (isLast) {
      onComplete();
    } else {
      setCurrent((prev) => prev + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden flex flex-col">
      {/* Full-bleed animated radial glow background */}
      <div
        className="absolute inset-0 animate-radial-glow"
        style={{
          background: 'radial-gradient(ellipse at 50% 45%, rgba(255, 80, 80, 0.35) 0%, rgba(255, 120, 80, 0.15) 35%, rgba(255, 255, 255, 0) 70%), linear-gradient(180deg, #fff 0%, #fff 100%)',
        }}
      />

      {/* Content area */}
      <div className="relative flex-1 flex flex-col items-center px-6 pt-10 sm:pt-14 lg:pt-16">
        {/* Brand */}
        <p className="text-sm sm:text-lg lg:text-[20px] font-[family-name:var(--font-brand)] font-bold tracking-[-0.25px] text-black mb-6 sm:mb-8">
          GOOD MEALS CO.
        </p>

        {/* Staggered text container — key change triggers re-mount for animations */}
        <div key={current} className="flex-1 flex flex-col items-center justify-center text-center px-2">
          {/* Title — per-letter stagger from 0s */}
          <h1 className="font-[family-name:var(--font-onboarding)] text-5xl sm:text-7xl lg:text-[100px] text-black leading-[1.1] mb-6 sm:mb-8 lg:mb-10">
            <StaggeredText text={title} baseDelay={0} />
          </h1>

          {/* Body — per-letter stagger starting at 0.4s */}
          <p className="font-[family-name:var(--font-onboarding)] text-xl sm:text-3xl lg:text-[48px] text-black leading-snug lg:leading-[1.3] max-w-xs sm:max-w-lg lg:max-w-2xl">
            <StaggeredText text={slide.body} baseDelay={bodyBaseDelay} />
          </p>
        </div>

        {/* Arrow button */}
        <button
          onClick={next}
          className="mb-6 sm:mb-8 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full border border-neutral-400/50 hover:border-neutral-500 transition-colors"
          aria-label={isLast ? 'Get started' : 'Next slide'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16l4-4-4-4" />
            <path d="M8 12h8" />
          </svg>
        </button>
      </div>

      {/* Food image strip — full bleed at bottom */}
      <div className="relative h-28 sm:h-40 lg:h-56 mx-4 sm:mx-6 mb-4 sm:mb-6 rounded-2xl sm:rounded-[30px] lg:rounded-[45px] overflow-hidden">
        <Image
          src={slide.image}
          alt="Food illustration"
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Hidden preload: ensure Next.js Image optimization kicks in for all images */}
      <div className="hidden">
        {UNIQUE_IMAGES.map((src) => (
          <Image key={src} src={src} alt="" width={1} height={1} priority />
        ))}
      </div>
    </div>
  );
}
