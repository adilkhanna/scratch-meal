'use client';

import { Recipe } from '@/types';

export type ChatSSEEvent =
  | { type: 'text'; content: string }
  | { type: 'generating'; message: string }
  | { type: 'recipes'; recipes: Recipe[] }
  | { type: 'done'; conversationId: string }
  | { type: 'error'; message: string };

export async function* streamChat(
  idToken: string,
  message: string,
  conversationId?: string | null,
  photoBase64?: string | null
): AsyncGenerator<ChatSSEEvent> {
  // Use the Cloud Function URL. In production this comes from the Firebase project.
  // The function URL follows the pattern: https://<region>-<project>.cloudfunctions.net/chatAgent
  const functionUrl = process.env.NEXT_PUBLIC_CHAT_AGENT_URL;
  if (!functionUrl) {
    yield { type: 'error', message: 'Chat agent URL not configured. Set NEXT_PUBLIC_CHAT_AGENT_URL.' };
    return;
  }

  const body: Record<string, unknown> = { message };
  if (conversationId) body.conversationId = conversationId;
  if (photoBase64) body.photoBase64 = photoBase64;

  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    yield { type: 'error', message: errText || `HTTP ${response.status}` };
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    yield { type: 'error', message: 'No response stream' };
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Parse SSE events from buffer
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep incomplete line in buffer

    let currentEvent = '';
    let currentData = '';

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        currentEvent = line.slice(7).trim();
      } else if (line.startsWith('data: ')) {
        currentData = line.slice(6);
      } else if (line === '' && currentEvent && currentData) {
        // Empty line = end of event
        try {
          const parsed = JSON.parse(currentData);
          switch (currentEvent) {
            case 'text':
              yield { type: 'text', content: parsed.content };
              break;
            case 'generating':
              yield { type: 'generating', message: parsed.message };
              break;
            case 'recipes':
              yield { type: 'recipes', recipes: parsed.recipes };
              break;
            case 'done':
              yield { type: 'done', conversationId: parsed.conversationId };
              break;
            case 'error':
              yield { type: 'error', message: parsed.message };
              break;
          }
        } catch {
          // Ignore parse errors for malformed chunks
        }
        currentEvent = '';
        currentData = '';
      }
    }
  }
}
