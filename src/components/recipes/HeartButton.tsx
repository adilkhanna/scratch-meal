'use client';

import { HiHeart, HiOutlineHeart } from 'react-icons/hi';
import clsx from 'clsx';

interface Props { isFavorite: boolean; onToggle: () => void; size?: 'sm' | 'md'; }

export default function HeartButton({ isFavorite, onToggle, size = 'md' }: Props) {
  return (
    <button onClick={(e) => { e.stopPropagation(); onToggle(); }} className={clsx('transition-all hover:scale-110', isFavorite ? 'text-red-500' : 'text-cream-300 hover:text-red-400')}>
      {isFavorite ? <HiHeart className={size === 'sm' ? 'w-5 h-5' : 'w-6 h-6'} /> : <HiOutlineHeart className={size === 'sm' ? 'w-5 h-5' : 'w-6 h-6'} />}
    </button>
  );
}
