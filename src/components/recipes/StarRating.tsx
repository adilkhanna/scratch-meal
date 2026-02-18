'use client';

import { HiStar } from 'react-icons/hi';
import clsx from 'clsx';

interface Props {
  rating: number;
  onRate: (rating: number) => void;
  size?: 'sm' | 'md';
}

export default function StarRating({ rating, onRate, size = 'md' }: Props) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={(e) => {
            e.stopPropagation();
            onRate(star === rating ? 0 : star);
          }}
          className="transition-colors hover:scale-110"
        >
          <HiStar
            className={clsx(
              size === 'sm' ? 'w-4 h-4' : 'w-6 h-6',
              star <= rating ? 'text-amber-400' : 'text-stone-200'
            )}
          />
        </button>
      ))}
    </div>
  );
}
