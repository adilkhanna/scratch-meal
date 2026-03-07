'use client';

const CHAR_DELAY = 0.015; // seconds per character

/** Renders text with per-character staggered fade-up animation (same feel as onboarding) */
function StaggeredChars({ text, baseDelay = 0 }: { text: string; baseDelay?: number }) {
  let charIdx = 0;

  return (
    <>
      {text.split(/(\s+)/).map((segment, si) => {
        if (/^\s+$/.test(segment)) {
          charIdx += segment.length;
          return <span key={si}> </span>;
        }
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

interface StaggeredPageTitleProps {
  text: string;
  color?: string;
  className?: string;
}

export default function StaggeredPageTitle({
  text,
  color = '#520000',
  className = '',
}: StaggeredPageTitleProps) {
  return (
    <h1
      className={`font-[family-name:var(--font-onboarding)] text-center leading-[1.1] ${className}`}
      style={{ color }}
    >
      <StaggeredChars text={text} />
    </h1>
  );
}
