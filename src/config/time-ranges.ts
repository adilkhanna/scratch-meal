import { TimeRange } from '@/types';

export const TIME_RANGES: { value: TimeRange; label: string; icon: string }[] = [
  { value: '15', label: '15 min', icon: '⚡' },
  { value: '30', label: '30 min', icon: '🕐' },
  { value: '45', label: '45 min', icon: '🕑' },
  { value: '60', label: '1 hour', icon: '🕒' },
  { value: '90', label: '1.5 hours', icon: '🕓' },
  { value: '120', label: '2+ hours', icon: '🕔' },
];
