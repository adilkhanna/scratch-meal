'use client';

import Lottie from 'lottie-react';
import momoAnimation from '../../../public/animations/momo-loader.json';

interface Props {
  size?: number;
  message?: string;
}

export default function MomoLoader({ size = 120, message }: Props) {
  return (
    <div className="flex flex-col items-center gap-2">
      <Lottie animationData={momoAnimation} loop autoplay style={{ width: size, height: size }} />
      {message && <p className="text-sm text-neutral-400 font-light">{message}</p>}
    </div>
  );
}
