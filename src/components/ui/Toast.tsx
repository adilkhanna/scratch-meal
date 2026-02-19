'use client';

import { useToast } from '@/context/ToastContext';
import clsx from 'clsx';
import { HiOutlineX, HiCheckCircle, HiExclamationCircle, HiInformationCircle } from 'react-icons/hi';

const ICONS = { success: HiCheckCircle, error: HiExclamationCircle, info: HiInformationCircle };
const COLORS = {
  success: 'bg-green-50 border-green-200 text-green-700',
  error: 'bg-red-50 border-red-200 text-red-700',
  info: 'bg-olive-50 border-olive-200 text-olive-700',
};

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => {
        const Icon = ICONS[toast.type];
        return (
          <div key={toast.id} className={clsx('flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg shadow-black/5 animate-slide-up', COLORS[toast.type])}>
            <Icon className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium flex-1">{toast.message}</p>
            <button onClick={() => removeToast(toast.id)} className="shrink-0 hover:opacity-70"><HiOutlineX className="w-4 h-4" /></button>
          </div>
        );
      })}
    </div>
  );
}
