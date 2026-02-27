'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { ChatMessage, MemoryFact, Recipe } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { streamChat } from '@/lib/chat-api';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getFirebaseAuth } from '@/lib/firebase';

interface ChatContextState {
  messages: ChatMessage[];
  isStreaming: boolean;
  isGeneratingRecipes: boolean;
  conversationId: string | null;
  memory: MemoryFact[];
  sendMessage: (text: string, photoBase64?: string | null) => Promise<void>;
  startNewConversation: () => void;
}

const ChatContext = createContext<ChatContextState | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isGeneratingRecipes, setIsGeneratingRecipes] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [memory, setMemory] = useState<MemoryFact[]>([]);

  // Load user memory on mount
  useEffect(() => {
    if (!user) return;
    const loadMemory = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const data = userDoc.data();
        if (data?.memory) {
          setMemory(data.memory as MemoryFact[]);
        }
      } catch {
        // Silent fail — memory is optional
      }
    };
    loadMemory();
  }, [user]);

  const startNewConversation = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setIsStreaming(false);
    setIsGeneratingRecipes(false);
  }, []);

  const sendMessage = useCallback(
    async (text: string, photoBase64?: string | null) => {
      if (!user) {
        addToast('You must be signed in to chat.', 'error');
        return;
      }
      if (isStreaming) return;

      // Add user message to state immediately (optimistic)
      const userMsg: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        role: 'user',
        content: text,
        timestamp: new Date().toISOString(),
        metadata: photoBase64 ? { photoBase64 } : undefined,
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsStreaming(true);

      // Create a placeholder assistant message that we'll update
      const assistantMsgId = `msg-${Date.now()}-assistant`;
      const assistantMsg: ChatMessage = {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      try {
        const auth = getFirebaseAuth();
        const idToken = await auth.currentUser?.getIdToken();
        if (!idToken) throw new Error('Not authenticated');

        const eventStream = streamChat(idToken, text, conversationId, photoBase64);

        for await (const event of eventStream) {
          switch (event.type) {
            case 'text':
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, content: m.content + event.content }
                    : m
                )
              );
              break;

            case 'generating':
              setIsGeneratingRecipes(true);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, content: m.content + '\n\n' + event.message }
                    : m
                )
              );
              break;

            case 'recipes':
              setIsGeneratingRecipes(false);
              // Add recipe metadata to the assistant message
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, metadata: { ...m.metadata, recipes: event.recipes as Recipe[] } }
                    : m
                )
              );
              break;

            case 'done':
              setConversationId(event.conversationId);
              break;

            case 'error':
              addToast(event.message, 'error');
              break;
          }
        }
      } catch (err) {
        addToast(err instanceof Error ? err.message : 'Chat failed', 'error');
        // Remove the empty assistant message on error
        setMessages((prev) => prev.filter((m) => m.id !== assistantMsgId || m.content));
      } finally {
        setIsStreaming(false);
        setIsGeneratingRecipes(false);
      }
    },
    [user, isStreaming, conversationId, addToast]
  );

  return (
    <ChatContext.Provider
      value={{
        messages,
        isStreaming,
        isGeneratingRecipes,
        conversationId,
        memory,
        sendMessage,
        startNewConversation,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used within a ChatProvider');
  return context;
}
