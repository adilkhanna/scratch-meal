import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import OpenAI from 'openai';
import { getOpenAIClient } from './shared/openai-client';
import { extractIngredientsFromImage } from './shared/ingredient-extractor';
import { generateRecipesCore } from './shared/recipe-generator';
import { extractMemoryFacts, MemoryFact } from './shared/memory-extractor';

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

// --- SSE helpers ---

function sendSSE(res: import('express').Response, event: string, data: unknown) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

// --- System prompt builder ---

function buildSystemPrompt(
  displayName: string,
  dietaryPreferences: string[],
  pantryBasics: string[],
  memory: MemoryFact[]
): string {
  const dietaryStr = dietaryPreferences.length > 0
    ? dietaryPreferences.join(', ')
    : 'None saved yet';
  const pantryStr = pantryBasics.length > 0
    ? pantryBasics.join(', ')
    : 'Salt, Pepper, Oil, Sugar, Flour';
  const memoryStr = memory.length > 0
    ? memory.map((m) => `- ${m.fact}`).join('\n')
    : '- New user, no memory yet';

  return `You are the Good Meals Co. cooking assistant — warm, knowledgeable, and efficient. You help people figure out what to cook with what they have.

PERSONALITY:
- Friendly but concise. 1-3 sentences max unless explaining something specific.
- If the user provides everything in one message, skip pleasantries and generate recipes.
- Never lecture about health. Never be preachy.
- Use casual, warm language.

USER: ${displayName}
DIETARY PREFERENCES (saved): ${dietaryStr}
PANTRY BASICS (always available — don't ask about these): ${pantryStr}

MEMORY (things you know about this person):
${memoryStr}

YOUR CAPABILITIES:
1. INGREDIENT COLLECTION: Ask what ingredients they have. They can type them or upload food photos. If a photo was uploaded, you'll see a message like "[PHOTO_INGREDIENTS: tomato, onion, garlic]" — acknowledge those ingredients naturally.
2. DIETARY CHECK: If no dietary preferences are saved, casually ask if they have any allergies or dietary restrictions. If preferences ARE saved, skip this unless they mention something new.
3. TIME CHECK: Ask how much time they have for cooking. Accept natural language like "quick", "30 minutes", "I have an hour". Map to the nearest value: 15, 30, 45, 60, 90, or 120 minutes.
4. RECIPE GENERATION: Once you have (a) at least 1 ingredient, (b) a time range, and optionally (c) dietary info — tell the user you're generating recipes. Then output the special token on its own line:
[GENERATE_RECIPES]{"ingredients": ["ingredient1", "ingredient2"], "dietaryConditions": ["condition1"], "timeRange": "30"}
5. RECIPE FEEDBACK: When the user comments on recipes, acknowledge their feedback warmly.

RULES:
- NEVER generate recipe JSON yourself. ONLY use the [GENERATE_RECIPES] token to trigger the external recipe system.
- Pantry basics are ALWAYS available — never ask the user about them. Include them automatically when generating.
- If the user provides all information in one message (ingredients + time + any preferences), go DIRECTLY to [GENERATE_RECIPES]. Do not ask unnecessary follow-up questions.
- Keep responses concise. 1-3 sentences max.
- After recipe generation, ask if they'd like different options or if they're happy with the results.
- When greeting a returning user with memory, reference what you know naturally (e.g., "Hey! Last time you loved that chicken curry — what are we making today?").`;
}

// --- Main handler ---

export const chatAgent = onRequest(
  {
    maxInstances: 20,
    timeoutSeconds: 180,
    memory: '512MiB',
    cors: true,
  },
  async (req, res) => {
    // Only allow POST
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    // Authenticate via Firebase ID token
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization token' });
      return;
    }

    let uid: string;
    try {
      const token = authHeader.split('Bearer ')[1];
      const decoded = await admin.auth().verifyIdToken(token);
      uid = decoded.uid;
    } catch {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    // Parse request body
    const { message, photoBase64, conversationId } = req.body;
    if (!message && !photoBase64) {
      res.status(400).json({ error: 'message or photoBase64 is required' });
      return;
    }

    try {
      // Load user profile
      const userDoc = await db.doc(`users/${uid}`).get();
      const userData = userDoc.data() || {};
      const displayName = userData.displayName || 'there';
      const dietaryPreferences: string[] = userData.dietaryPreferences || [];
      const pantryBasics: string[] = userData.pantryBasics || [];
      const memory: MemoryFact[] = userData.memory || [];

      // Get OpenAI client
      const { openai, spoonacularKey } = await getOpenAIClient();

      // Handle photo extraction if present
      let userContent = message || '';
      if (photoBase64) {
        const extracted = await extractIngredientsFromImage(openai, photoBase64);
        if (extracted.length > 0) {
          const ingredientList = extracted.join(', ');
          userContent = userContent
            ? `${userContent}\n\n[PHOTO_INGREDIENTS: ${ingredientList}]`
            : `[PHOTO_INGREDIENTS: ${ingredientList}]`;
        }
      }

      // Load or create conversation
      let convId = conversationId;
      let existingMessages: { role: string; content: string }[] = [];

      if (convId) {
        // Load last 20 messages from existing conversation
        const msgsSnap = await db
          .collection(`users/${uid}/conversations/${convId}/messages`)
          .orderBy('timestamp', 'desc')
          .limit(20)
          .get();
        existingMessages = msgsSnap.docs
          .map((d) => ({ role: d.data().role, content: d.data().content }))
          .reverse();
      } else {
        // Create new conversation
        const convRef = db.collection(`users/${uid}/conversations`).doc();
        convId = convRef.id;
        await convRef.set({
          id: convId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          status: 'active',
          extractedRecipeIds: [],
          messageCount: 0,
        });
      }

      // Save user message to Firestore
      const userMsgRef = db.collection(`users/${uid}/conversations/${convId}/messages`).doc();
      await userMsgRef.set({
        id: userMsgRef.id,
        role: 'user',
        content: userContent,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        metadata: photoBase64 ? { photoAttached: true } : {},
      });

      // Build messages array for OpenAI
      const systemPrompt = buildSystemPrompt(displayName, dietaryPreferences, pantryBasics, memory);
      const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...existingMessages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user', content: userContent },
      ];

      // Set up SSE streaming
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');

      // Stream GPT-4o response
      const stream = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: openaiMessages,
        stream: true,
        max_tokens: 1000,
        temperature: 0.7,
      });

      let fullResponse = '';
      let generateTriggered = false;

      for await (const chunk of stream) {
        const delta = chunk.choices?.[0]?.delta?.content;
        if (!delta) continue;

        fullResponse += delta;

        // Check if we've hit the [GENERATE_RECIPES] token
        if (fullResponse.includes('[GENERATE_RECIPES]')) {
          generateTriggered = true;
          // Send the text before the token
          const preToken = fullResponse.split('[GENERATE_RECIPES]')[0].trim();
          if (preToken) {
            sendSSE(res, 'text', { content: preToken });
          }
          break;
        }

        // Send text chunks
        sendSSE(res, 'text', { content: delta });
      }

      // If recipe generation was triggered
      if (generateTriggered) {
        // Collect remaining tokens to get the full JSON
        let jsonPart = fullResponse.split('[GENERATE_RECIPES]')[1] || '';

        // If streaming was interrupted, continue collecting
        for await (const chunk of stream) {
          const delta = chunk.choices?.[0]?.delta?.content;
          if (delta) {
            jsonPart += delta;
            fullResponse += delta;
          }
        }

        jsonPart = jsonPart.trim();

        try {
          const params = JSON.parse(jsonPart);
          const ingredients = params.ingredients || [];
          const dietary = params.dietaryConditions || [];
          const time = params.timeRange || '30';

          // Merge pantry basics with ingredients
          const allIngredients = [...new Set([...ingredients, ...pantryBasics.map((p: string) => p.toLowerCase())])];

          sendSSE(res, 'generating', { message: 'Generating 5 recipes for you...' });

          // Call existing recipe generation pipeline
          const result = await generateRecipesCore(openai, allIngredients, dietary, time, spoonacularKey);

          // Add metadata to recipes
          const now = new Date().toISOString();
          const recipesWithMeta = result.recipes.map((r: Record<string, unknown>) => ({
            ...r,
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            rating: 0,
            isFavorite: false,
            createdAt: now,
            searchedIngredients: ingredients,
            dietaryConditions: dietary,
            requestedTimeRange: time,
          }));

          // Save recipes to Firestore
          const batch = db.batch();
          const recipeIds: string[] = [];
          for (const recipe of recipesWithMeta) {
            const recipeRef = db.doc(`users/${uid}/recipes/${recipe.id}`);
            batch.set(recipeRef, recipe);
            recipeIds.push(recipe.id);
          }
          await batch.commit();

          // Update conversation with recipe IDs
          await db.doc(`users/${uid}/conversations/${convId}`).update({
            extractedRecipeIds: admin.firestore.FieldValue.arrayUnion(...recipeIds),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          // Send recipes to client
          sendSSE(res, 'recipes', { recipes: recipesWithMeta });

          // Update fullResponse for storage (remove the JSON params)
          const preToken = fullResponse.split('[GENERATE_RECIPES]')[0].trim();
          fullResponse = preToken + '\n\n[Generated 5 recipes]';
        } catch (parseErr) {
          console.error('Failed to parse recipe generation params:', parseErr, jsonPart);
          sendSSE(res, 'text', {
            content: "\n\nI had trouble generating recipes. Could you tell me your ingredients and how much time you have again?",
          });
          fullResponse = fullResponse.split('[GENERATE_RECIPES]')[0] +
            "\n\nI had trouble generating recipes. Could you tell me your ingredients and how much time you have again?";
        }
      }

      // Save assistant message to Firestore
      const assistantMsgRef = db.collection(`users/${uid}/conversations/${convId}/messages`).doc();
      await assistantMsgRef.set({
        id: assistantMsgRef.id,
        role: 'assistant',
        content: fullResponse.split('[GENERATE_RECIPES]')[0].trim() || fullResponse,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Update conversation metadata
      await db.doc(`users/${uid}/conversations/${convId}`).update({
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        messageCount: admin.firestore.FieldValue.increment(2),
      });

      // Send done event
      sendSSE(res, 'done', { conversationId: convId });

      // Async memory extraction (don't block the response)
      extractMemoryAsync(openai, uid, convId, memory).catch((err) =>
        console.warn('Memory extraction failed:', err)
      );

      res.end();
    } catch (err) {
      console.error('Chat agent error:', err);
      // If headers already sent (streaming started), send error via SSE
      if (res.headersSent) {
        sendSSE(res, 'error', {
          message: err instanceof Error ? err.message : 'An error occurred',
        });
        res.end();
      } else {
        res.status(500).json({
          error: err instanceof Error ? err.message : 'Internal server error',
        });
      }
    }
  }
);

// --- Async memory extraction ---

async function extractMemoryAsync(
  openai: OpenAI,
  uid: string,
  conversationId: string,
  existingMemory: MemoryFact[]
) {
  // Load recent messages for the transcript
  const msgsSnap = await db
    .collection(`users/${uid}/conversations/${conversationId}/messages`)
    .orderBy('timestamp', 'asc')
    .limit(30)
    .get();

  if (msgsSnap.size < 4) return; // Need at least a few exchanges

  const transcript = msgsSnap.docs
    .map((d) => `${d.data().role}: ${d.data().content}`)
    .join('\n\n');

  const newFacts = await extractMemoryFacts(openai, transcript, existingMemory);
  if (newFacts.length === 0) return;

  // Merge with existing, cap at 50
  const combined = [...existingMemory, ...newFacts].slice(-50);

  await db.doc(`users/${uid}`).update({
    memory: combined,
    memoryUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}
