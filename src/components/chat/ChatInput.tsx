'use client';

import { useState, useRef, useCallback, ChangeEvent, KeyboardEvent } from 'react';
import { HiOutlinePhotograph, HiPaperAirplane } from 'react-icons/hi';

interface Props {
  onSend: (message: string, photoBase64?: string | null) => void;
  disabled?: boolean;
  isStreaming?: boolean;
}

export default function ChatInput({ onSend, disabled, isStreaming }: Props) {
  const [text, setText] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed && !photoBase64) return;

    onSend(trimmed || 'Here is a photo of my ingredients', photoBase64);
    setText('');
    setPhotoPreview(null);
    setPhotoBase64(null);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [text, photoBase64, onSend]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    // Preview
    setPhotoPreview(URL.createObjectURL(file));

    // Convert to base64
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPhotoBase64(result.split(',')[1]);
    };
    reader.readAsDataURL(file);

    e.target.value = '';
  };

  const removePhoto = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    setPhotoBase64(null);
  };

  const isDisabled = disabled || isStreaming;

  return (
    <div className="bg-[#DBE9E3] border-t border-neutral-300/30 px-4 py-3">
      {/* Photo preview */}
      {photoPreview && (
        <div className="mb-2 flex items-center gap-2">
          <div className="relative w-16 h-16 rounded-xl overflow-hidden ring-1 ring-neutral-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoPreview} alt="Upload" className="w-full h-full object-cover" />
            <button
              onClick={removePhoto}
              className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]"
            >
              ×
            </button>
          </div>
          <span className="text-xs text-neutral-500">Photo attached</span>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isDisabled}
          className="p-2.5 text-[#0059FF]/60 hover:text-[#0059FF] transition-colors disabled:opacity-40"
          aria-label="Upload photo"
        >
          <HiOutlinePhotograph className="w-6 h-6" />
        </button>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder={isStreaming ? 'Thinking...' : 'Type a message...'}
          disabled={isDisabled}
          rows={1}
          className="flex-1 px-4 py-2.5 bg-white/70 rounded-2xl text-sm font-light text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#0059FF]/20 transition-all resize-none disabled:opacity-50"
        />

        <button
          onClick={handleSend}
          disabled={isDisabled || (!text.trim() && !photoBase64)}
          className="p-2.5 text-[#0059FF] hover:bg-[#0059FF] hover:text-white rounded-full transition-all duration-200 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[#0059FF]"
          aria-label="Send message"
        >
          <HiPaperAirplane className="w-5 h-5 rotate-90" />
        </button>
      </div>
    </div>
  );
}
