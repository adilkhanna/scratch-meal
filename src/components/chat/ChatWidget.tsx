'use client';

import { useState } from 'react';
import { ChatProvider } from '@/context/ChatContext';
import ChatContainer from './ChatContainer';
import { HiOutlineChat, HiOutlineX } from 'react-icons/hi';

export default function ChatWidget() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#0059FF] text-white shadow-lg shadow-[#0059FF]/25 flex items-center justify-center hover:bg-[#0047CC] transition-all duration-200 hover:scale-105"
        aria-label={open ? 'Close chat' : 'Open chat help'}
      >
        {open ? <HiOutlineX size={24} /> : <HiOutlineChat size={24} />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[380px] h-[500px] max-sm:left-4 max-sm:right-4 max-sm:bottom-24 max-sm:w-auto max-sm:h-[70vh] bg-white rounded-2xl shadow-2xl shadow-black/10 border border-neutral-200 flex flex-col overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 bg-neutral-50/50">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-xs font-medium uppercase tracking-wider text-neutral-600">Chat Help</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 text-neutral-400 hover:text-neutral-600 transition-colors"
              aria-label="Close chat"
            >
              <HiOutlineX size={16} />
            </button>
          </div>

          {/* Chat content */}
          <div className="flex-1 overflow-hidden">
            <ChatProvider>
              <ChatContainer compact />
            </ChatProvider>
          </div>
        </div>
      )}
    </>
  );
}
