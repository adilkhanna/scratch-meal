'use client';

import { useRef, useEffect } from 'react';
import { useChat } from '@/context/ChatContext';
import { useAuth } from '@/context/AuthContext';
import ChatBubble from './ChatBubble';
import ChatInput from './ChatInput';
import QuickActions from './QuickActions';
import TypingIndicator from './TypingIndicator';

export default function ChatContainer({ compact = false }: { compact?: boolean }) {
  const { messages, isStreaming, isGeneratingRecipes, sendMessage, startNewConversation } = useChat();
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  const handleSend = (text: string, photoBase64?: string | null) => {
    sendMessage(text, photoBase64);
  };

  const isEmpty = messages.length === 0;
  const firstName = user?.displayName?.split(' ')[0] || 'there';

  return (
    <div className={compact ? "flex flex-col h-full" : "flex flex-col h-[calc(100vh-4rem)]"}>
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full space-y-8 animate-fade-in">
            {/* Hero */}
            <div className="text-center space-y-3">
              <h1 className="font-[family-name:var(--font-display)] text-[clamp(32px,5vw,52px)] text-[#0059FF] leading-[0.96] tracking-[-0.25px]">
                Hey {firstName}!
              </h1>
              <p className="text-sm text-neutral-500 font-light max-w-md">
                Tell me what ingredients you have, snap a photo of your fridge, or just tell me what you&apos;re in the mood for.
              </p>
            </div>

            {/* Quick action chips */}
            <QuickActions onAction={handleSend} disabled={isStreaming} />

            {/* Footer branding */}
            {!compact && (
              <div className="mt-auto pt-8 select-none opacity-20">
                <span className="font-[family-name:var(--font-brand)] text-[clamp(48px,10vw,120px)] font-normal text-[#0059FF] leading-none tracking-[-0.25px] block">
                  GOOD MEALS CO.
                </span>
              </div>
            )}
          </div>
        )}

        {!isEmpty && (
          <>
            {messages.map((msg, i) => {
              const isLastAssistant =
                msg.role === 'assistant' && i === messages.length - 1;
              return (
                <ChatBubble
                  key={msg.id}
                  message={msg}
                  isStreaming={isLastAssistant && isStreaming}
                />
              );
            })}

            {isGeneratingRecipes && (
              <div className="flex justify-start animate-fade-in">
                <div className="bg-white border border-neutral-200 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-[#0059FF] border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-neutral-500 font-light">
                      Generating recipes...
                    </span>
                  </div>
                </div>
              </div>
            )}

            {isStreaming && !isGeneratingRecipes && messages[messages.length - 1]?.content === '' && (
              <div className="flex justify-start">
                <div className="bg-white border border-neutral-200 rounded-2xl rounded-bl-md">
                  <TypingIndicator />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* New conversation button (when recipes have been generated) */}
      {!isEmpty && !isStreaming && messages.some((m) => m.metadata?.recipes) && (
        <div className="flex justify-center py-2">
          <button
            onClick={startNewConversation}
            className="text-xs text-[#0059FF]/60 hover:text-[#0059FF] uppercase tracking-wider font-medium transition-colors"
          >
            + Start new conversation
          </button>
        </div>
      )}

      {/* Input bar */}
      <ChatInput onSend={handleSend} isStreaming={isStreaming} />
    </div>
  );
}
