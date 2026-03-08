# Good Meals Co. — Scratch Meal Maker

## Overview
A recipe recommendation web app that takes ingredients users have on hand and generates personalized recipes. Users go through a multi-step MCQ flow (ingredients → dietary → cuisine → time) and receive recipes sourced from Spoonacular's verified database, adapted by AI to fit their constraints.

**Live URL**: Hosted on Netlify (auto-deploys from `main` branch)
**Repo**: `adilkhanna/scratch-meal` on GitHub

## Critical Design Principle
**NO hallucinated recipes.** All recipes MUST be sourced from verified databases:
- **Quick Recipe flow**: Spoonacular API → GPT-4o adapts verified recipes (never generates from scratch)
- **Weekly Meal Plan**: Curated recipe glossary (Firestore) is the primary source. Spoonacular supplements when glossary has insufficient matches. GPT-4o uses RAG prompts grounded in these reference recipes — never invents dishes.
- **Breakfast**: Locked to a curated bank of 119 real recipes from trusted food sites. Spoonacular fallback only when glossary has <5 matches (filtered through safe breakfast keywords). GPT is explicitly forbidden from inventing breakfast recipes.

## Tech Stack
- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4
- **Auth**: Firebase Authentication (Google + Email/Password)
- **Database**: Cloud Firestore
- **Backend**: Firebase Cloud Functions (v2)
- **AI**: OpenAI GPT-4o (recipe adaptation), GPT-4o-mini (dietary compliance review), Higgsfield Flux Pro (recipe thumbnails)
- **Recipe Source**: Spoonacular API (verified recipe database)
- **Live Prices**: data.gov.in Mandi Commodity Prices API (vegetables & grains)
- **Animations**: lottie-react with Kawaii animals animation
- **Hosting**: Netlify (frontend), Firebase (functions)
- **Color scheme**: Background `#DBE9E3`, accent blue `#0059FF`, hover blue `#0047CC`

## App Flow (MCQ Steps)
1. **`/`** — Ingredient input (text + photo upload via AI extraction)
2. **`/dietary`** — Dietary preferences (allergies, intolerances, medical, religious, lifestyle — 40+ conditions)
3. **`/cuisine`** — Cuisine preferences (12 cuisines, multi-select, optional)
4. **`/time`** — Cooking time (15/30/45/60/90/120+ minutes) + optional weekly budget (₹500–₹5,000)
5. **`/results`** — Recipe results (sourced from Spoonacular, adapted by GPT-4o), sorted by budget if set

## Recipe Generation Pipeline
```
User inputs → Cloud Function (generateRecipes)
  → Spoonacular API: findByIngredients (15 results)
  → Get details for top 10
  → GPT-4o-mini dietary compliance review (filters unsafe recipes)
  → If ≥2 compliant: GPT-4o adapts them via RAG prompt
  → If <2 compliant: Return error "add more ingredients"
  → If Spoonacular returns 402: Return error "Daily recipe limit reached"
  → If no Spoonacular key: Return error "service unavailable"
  → Estimate cost per serving (live mandi prices for vegetables/grains if enabled, hardcoded for proteins/dairy/oils)
  → If Higgsfield enabled: generate food thumbnails for each recipe (parallel, non-blocking)
```

## Project Structure
```
src/
├── app/
│   ├── page.tsx              # Step 1: Ingredients
│   ├── dietary/page.tsx      # Step 2: Dietary preferences
│   ├── cuisine/page.tsx      # Step 3: Cuisine preferences
│   ├── time/page.tsx         # Step 4: Cooking time
│   ├── results/page.tsx      # Step 5: Recipe results
│   ├── plan/page.tsx         # Meal planner (weekly grid + grocery list)
│   ├── meal-plan/
│   │   ├── generate/page.tsx # Weekly meal plan generation (family size, days, cuisines)
│   │   └── view/page.tsx     # Weekly meal plan viewer (per-person calorie tracking)
│   ├── history/page.tsx      # Past recipe history
│   ├── settings/page.tsx     # User settings (pantry basics, calorie target, account)
│   ├── admin/page.tsx        # Admin panel
│   ├── login/page.tsx        # Auth page
│   └── layout.tsx            # Root layout (viewport: no zoom)
├── components/
│   ├── auth/AuthGuard.tsx    # Auth wrapper
│   ├── chat/                 # Floating help chat widget
│   ├── recipes/
│   │   ├── RecipeCard.tsx    # Full recipe card (expandable, share, favorite, add-to-plan)
│   │   ├── RecipeDetailModal.tsx  # Lightbox modal for meal plan recipes
│   │   ├── StarRating.tsx
│   │   └── HeartButton.tsx
│   ├── layout/
│   │   ├── StepIndicator.tsx # 5-step progress dots
│   │   └── BottomNav.tsx     # Bottom navigation bar
│   └── ui/MomoLoader.tsx     # Kawaii Lottie animation loader
├── context/
│   ├── AuthContext.tsx        # Firebase auth state
│   ├── RecipeFlowContext.tsx  # MCQ flow state (ingredients, dietary, cuisines, timeRange, weeklyBudget)
│   ├── ChatContext.tsx        # Chat widget state
│   └── ToastContext.tsx       # Toast notifications
├── config/
│   ├── dietary-conditions.ts  # 40+ conditions across 5 categories
│   ├── cuisines.ts           # 12 cuisines with emoji flags
│   ├── time-ranges.ts        # 6 time options
│   └── prompts.ts            # Client-side prompt templates (legacy, not actively used)
├── lib/
│   ├── firebase.ts           # Firebase app init
│   ├── firebase-functions.ts # Client-side function wrappers
│   ├── recipe-storage.ts     # Firestore recipe CRUD
│   ├── meal-plan-storage.ts  # Firestore meal plan CRUD
│   └── chat-api.ts           # Chat agent API
└── types/index.ts            # TypeScript types (Recipe, MealPlan, etc.)

functions/src/
├── index.ts                  # Cloud Function exports
├── generateRecipes.ts        # Quick recipe generation entry point
├── generateWeeklyPlan.ts     # Weekly meal plan generation (breakfast/lunch/dinner)
├── seedGlossary.ts           # Seed recipe glossary from JSON (admin-only, upsert)
├── fetchMandiPrices.ts       # Scheduled + on-demand mandi price fetcher
├── extractIngredients.ts     # Photo → ingredients via AI
├── chatAgent.ts              # Chat agent function
├── deleteUser.ts             # Account deletion
├── onUserSignup.ts           # New user setup
└── shared/
    ├── openai-client.ts      # OpenAI client init + Higgsfield keys + mandi config
    ├── higgsfield-client.ts  # Higgsfield AI image generation (Flux Pro V2 API)
    ├── mandi-client.ts       # data.gov.in Mandi Commodity Prices API client
    ├── ingredient-prices.ts  # Indian ingredient prices (live mandi + hardcoded) + async cost calculator
    ├── recipe-generator.ts   # Core recipe generation (Spoonacular + compliance review + GPT-4o RAG + cost estimation)
    ├── meal-plan-prompts.ts  # GPT-4o prompt builders for weekly plan (breakfast/lunch/dinner)
    └── glossary-feeder.ts    # Auto-add generated recipes to glossary + health tag filtering

functions/data/
├── recipe-glossary-seed.json     # 289 curated recipes (master seed file for Firestore)
├── chunk-breakfast-full.json     # 119 curated breakfast recipes (Indian + International)
├── generate-breakfast-bank.py    # Python script to regenerate breakfast bank
├── chunk-*.json                  # Regional recipe chunks (SA, EU, American, East Asian, etc.)
└── combine-chunks.js             # Script to merge chunks into master seed file
```

## Key Features
- **Ingredient input**: Text (comma-separated) or photo upload (AI extraction)
- **Dietary compliance**: 40+ conditions across allergies, intolerances, medical, religious, lifestyle
- **AI compliance reviewer**: GPT-4o-mini pre-screens Spoonacular recipes against dietary conditions
- **Cuisine preferences**: 12 cuisines (optional, skip for diverse results)
- **Meal planner**: Weekly grid (Mon-Sun × Breakfast/Lunch/Dinner), drag recipes into slots
- **Grocery list**: Auto-aggregated from planned meals, checkable items
- **BigBasket integration**: Desktop-only (hidden on mobile/tablet via `lg:` breakpoint). "Open All in Tabs" opens unchecked grocery items as BigBasket search tabs. Uses `bigbasket.com/ps/?q={item}` URL pattern.
- **Recipe lightbox**: Click any recipe in meal plan to see full details in a modal
- **Recipe sharing**: English + Hindi, via Web Share API or clipboard
- **Pantry basics**: User-saved common ingredients auto-merged during generation
- **Recipe thumbnails**: Higgsfield Flux Pro model generates 1:1 food photos per recipe (admin-toggleable, off = no cost)
- **Budget-aware recipes**: Optional weekly budget (₹500–₹5,000) on time page. Cost estimated per serving using live mandi prices (vegetables/grains) + hardcoded prices (proteins/dairy/oils). Recipes sorted within-budget-first, cost badges show "Est. ~₹X/serving" color-coded green/amber/red against budget.
- **Live mandi prices**: Daily wholesale prices from data.gov.in for ~27 commodities (vegetables, grains, lentils). Scheduled Cloud Function fetches daily at 7 PM IST, caches in Firestore. Admin-toggleable. Freshness badge + disclaimer on results page. Graceful fallback to hardcoded if disabled or API fails.
- **Lottie loader**: Kawaii animals animation (`public/animations/momo-loader.json`) used across all loading states
- **Weekly meal plan**: AI-generated 7-day meal plans with breakfast options, daily lunches and dinners. Supports family sizing, per-meal cuisine preferences (separate cuisines for lunch vs dinner), and dietary compliance. Uses curated recipe glossary as primary source with Spoonacular supplementation.
- **Curated breakfast bank**: 119 real breakfast recipes (62 Indian + 57 International) scraped from indianhealthyrecipes.com, ministryofcurry.com, and loveandlemons.com. Stored in `recipe-glossary-seed.json` and Firestore `recipe-glossary` collection.
- **Health condition filtering**: Recipes tagged as `fried` or `high-sugar` are automatically excluded when users have conditions like cardiovascular disease, diabetes, hypertension, fatty liver, gout, keto, etc. Implemented via `getExcludedTags()` in `glossary-feeder.ts`.
- **Per-person calorie tracking**: Optional daily calorie target (set in Settings). Split 25% breakfast / 40% lunch / 35% dinner. View page shows per-person calorie totals with color-coded badges (green/amber/red).
- **Cuisine enforcement**: Lunch and dinner respect separate cuisine selections. Prompts include CRITICAL cuisine instructions that override reference recipe suggestions when cuisines don't match.

## Weekly Meal Plan Pipeline
```
User inputs (family size, days, cuisines, dietary) → Cloud Function (generateWeeklyPlan)
  → Calculate per-meal calorie budgets (25% breakfast / 40% lunch / 35% dinner)
  → Determine health-excluded tags (fried, high-sugar based on conditions)
  → Query recipe-glossary for breakfast recipes (glossary-first, Spoonacular fallback if <5 matches)
  → Query recipe-glossary for lunch/dinner recipes (filtered by cuisine + dietary tags)
  → Optionally call Spoonacular for supplemental lunch/dinner recipes
  → GPT-4o generates breakfast options (RAG: MUST use approved recipes only)
  → GPT-4o generates daily lunches (RAG: reference recipes + cuisine enforcement)
  → GPT-4o generates daily dinners (RAG: reference recipes + cuisine enforcement)
  → Feed generated recipes back to glossary (auto-grows the database)
  → Return complete plan with per-person calorie tracking
```

### Recipe Glossary System
- **Firestore collection**: `recipe-glossary` — master database of curated + generated recipes
- **Seed file**: `functions/data/recipe-glossary-seed.json` (289 recipes: 119 breakfast + 170 lunch/dinner)
- **Seeding**: Admin panel → "Seed Glossary" button → calls `seedRecipeGlossary` Cloud Function (upserts, merges new tags into existing entries)
- **Auto-growth**: After each meal plan generation, new recipes are fed back via `feedToGlossary()` — glossary grows over time, reducing Spoonacular reliance
- **Tag system**: Recipes have `tags` array (e.g., `["fried"]`, `["high-sugar"]`) for health condition filtering
- **Query**: `queryGlossaryForPlan()` filters by cuisine, dietary tags, meal type, and excluded health tags

### Breakfast Architecture
- **Primary source**: Curated glossary (119 real recipes from trusted food sites)
- **Fallback**: Spoonacular (only when glossary has <5 matches, filtered through `SAFE_BREAKFAST_KEYWORDS`)
- **Safe keywords**: oatmeal, oats, eggs, toast, smoothie, pancake, waffle, cereal, granola, yogurt, dosa, idli, poha, upma, paratha, porridge, muesli, fruit bowl, chia, avocado toast
- **Strict rules**: GPT cannot invent breakfast recipes. No heavy lunch/dinner items for breakfast. No weird combinations (e.g., "paneer smoothie", "carrot pancakes with spinach").
- **Health filtering**: Fried items (Medu Vada, Poori, Bhatura, etc.) excluded for cardiovascular/diabetes patients

## Responsive Design
- Viewport: `maximumScale: 1, userScalable: false` (no pinch zoom)
- Nutrition grid: `grid-cols-3 sm:grid-cols-5`
- Input row on homepage: `flex-wrap` with `max-sm:w-full` on button
- BigBasket feature: `hidden lg:flex` / `hidden lg:block` (desktop only)

## Environment Variables
- **Netlify**: `NEXT_PUBLIC_CHAT_AGENT_URL` (chat agent endpoint)
- **Firebase Functions**: OpenAI API key, Spoonacular API key (configured via Firebase secrets)
- **`.env.local`**: Contains `HIGGSFIELD_API_KEY` and `HIGGSFIELD_SECRET` (local dev only — production keys live in Firestore admin-config)

## Deployment

### Frontend (Automatic)
Push to `main` → Netlify auto-deploys. No manual steps needed.

### Cloud Functions (Auto-Deploy Rule for Claude)
**IMPORTANT — Claude must follow this rule**: After ANY code changes to files inside `functions/src/`, automatically run Cloud Functions deployment without prompting the user:
```bash
cd "/Users/adilkhanna/Documents/ AI Code/Scratch Meal Maker" && firebase deploy --only functions
```
Steps Claude must follow:
1. Build functions first: `cd "/Users/adilkhanna/Documents/ AI Code/Scratch Meal Maker/functions" && npm run build`
2. If build passes, deploy: `cd "/Users/adilkhanna/Documents/ AI Code/Scratch Meal Maker" && firebase deploy --only functions`
3. If deploy fails with auth error, run `firebase login --reauth` then retry
4. Report success/failure to the user after deploy completes

### Firebase Auth — Keep Active
Firebase CLI auth tokens expire periodically. If any deploy or function invocation fails with auth errors:
1. Run `firebase login --reauth` to refresh credentials
2. Verify with `firebase projects:list` — should list the project without errors
3. Then retry the deploy

**Before every `firebase deploy`**, confirm auth is valid by running `firebase projects:list`. If it errors, re-auth first.

### API Keys & Secrets
The following secrets must stay configured in Firebase Functions (set via `firebase functions:secrets:set`):
- **OPENAI_API_KEY** — powers GPT-4o recipe adaptation and GPT-4o-mini dietary compliance review
- **SPOONACULAR_API_KEY** — recipe source database; if missing/expired, users get "service unavailable" error

Higgsfield AI keys are stored in Firestore (`admin-config/app` document), managed via the Admin panel:
- **higgsFieldApiKey** — Higgsfield API key
- **higgsFieldSecret** — Higgsfield secret
- **higgsFieldEnabled** — on/off toggle (controls whether recipe images are generated)

Mandi Prices keys are stored in Firestore (`admin-config/app` document), managed via the Admin panel:
- **mandiApiKey** — data.gov.in API key (free tier, register at data.gov.in)
- **mandiPricesEnabled** — on/off toggle (controls whether live mandi prices are used for cost estimation)
- Mandi prices are cached in `mandi-prices` Firestore collection, fetched daily at 7 PM IST by `scheduledMandiPriceFetch`
- Admin can manually refresh via "Refresh Now" button which calls `refreshMandiPrices` callable function

Check secret health: `firebase functions:secrets:access OPENAI_API_KEY` and `firebase functions:secrets:access SPOONACULAR_API_KEY`. If either fails, reconfigure them before deploying.

### Higgsfield API Reference (CRITICAL — confirmed working as of March 2026)
Higgsfield has TWO API versions. We use **V2** (the official SDK format). Do NOT use V1 format — it will fail.

**V2 API (what we use):**
- **Base URL**: `https://platform.higgsfield.ai`
- **Auth**: Single header — `Authorization: Key {apiKey}:{secret}` (colon-separated, NOT two separate headers, NOT Bearer)
- **Image generation endpoint**: `POST /flux-pro/kontext/max/text-to-image` (NO `/v1/` prefix)
- **Request body**: Flat object — `{ prompt, aspect_ratio: "1:1", safety_tolerance: 2 }` (NOT nested in `params` or `input`)
- **Submit response**: `{ request_id: "uuid", status_url: "..." }`
- **Polling endpoint**: `GET /requests/{request_id}/status` (NOT `/v1/job-sets/`)
- **Poll response (completed)**: `{ status: "completed", images: [{ url: "https://..." }] }`
- **Status values**: `queued`, `in_progress`, `completed`, `failed`, `nsfw`
- **Cost**: Credits-based — check balance at cloud.higgsfield.ai before enabling
- **Toggle**: Disable in Admin panel when not testing to preserve credits

**V1 API (DO NOT USE — Soul model is unavailable on this account):**
- V1 used `hf-api-key`/`hf-secret` headers, `/v1/text2image/soul` endpoint, `{ params: {...} }` body, `/v1/job-sets/{id}` polling
- Soul model returns 400 "Unavailable model" — account does not have access
- All previous failed attempts were caused by mixing V1 auth with V2 endpoints

**Common Higgsfield errors:**
- `403 "Not enough credits"` → Top up at cloud.higgsfield.ai
- `400 "prompt is a required property"` → Body is nested wrong (e.g. `{ input: { prompt } }` instead of `{ prompt }`)
- `401/403 auth error` → Wrong auth format — must be `Authorization: Key KEY:SECRET`
- `400 "Unavailable model"` → Wrong endpoint or Soul model (use flux-pro instead)

---

## Troubleshooting Guide

### 1. Recipes not generating / "Failed to generate recipes"
- **Check OpenAI key**: Go to Admin panel → verify OpenAI API key is entered and saved
- **Check Spoonacular key**: Admin panel → verify Spoonacular API key is entered and saved
- **Check Cloud Functions are deployed**: Run `firebase deploy --only functions` from the project root
- **Check function logs**: Run `firebase functions:log --only generateRecipes` to see errors — the pipeline now logs every step with `[recipe-gen]` prefix
- **Common fix**: If you see "not configured" errors, re-enter the API keys in the Admin panel and save

### 1a. "Daily recipe limit reached" error
- **Cause**: Spoonacular API returned 402 — free tier daily quota exhausted (happens during heavy testing)
- **Fix**: Wait 24 hours for quota to reset, or upgrade the Spoonacular plan
- **Logs**: Will show `[recipe-gen] Spoonacular returned X results` then `Spoonacular search failed: 402`

### 2. Recipe images not appearing on cards
- **Check Higgsfield is enabled**: Admin panel → Higgsfield section → toggle must be ON (blue)
- **Check Higgsfield credits**: Most likely cause — check balance at cloud.higgsfield.ai. Logs show `[higgsfield] Submit failed (403): Not enough credits`
- **Check Higgsfield keys**: Admin panel → verify both API Key and Secret are entered and saved. Format in Firestore: raw key and secret (the code combines them as `Key {apiKey}:{secret}`)
- **Check function logs**: `firebase functions:log --only generateRecipes` — look for `[higgsfield]` prefixed log lines
- **Graceful degradation**: Image failures are non-blocking — recipes still appear without thumbnails
- **Old recipes**: Recipes generated before Higgsfield was enabled won't have images. Generate new recipes to see thumbnails.
- **Do NOT change the API format** without reading the Higgsfield API Reference section — many iterations were needed to find the correct V2 format

### 3. App shows blank page or won't load
- **Clear browser cache**: Hard refresh with `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
- **Check Netlify deploy**: Go to Netlify dashboard → check if latest deploy succeeded
- **Check browser console**: Open DevTools (`F12`) → Console tab → look for red errors
- **Firebase down?**: Check https://status.firebase.google.com

### 4. Login not working / auth errors
- **Google Sign-In failing**: Check Firebase Console → Authentication → Sign-in method → Google must be enabled
- **Email/Password failing**: Same place — Email/Password must be enabled
- **"User not found"**: The account may have been deleted. Sign up again.

### 5. Cloud Functions deploy fails
- **Auth expired**: Run `firebase login --reauth`, then retry deploy
- **Build errors**: Run `cd functions && npm run build` first — fix any TypeScript errors before deploying
- **Wrong directory**: Must run deploy from project root (where `firebase.json` lives): `cd "/Users/adilkhanna/Documents/ AI Code/Scratch Meal Maker"`
- **Check Node version**: Cloud Functions require Node 18+. Run `node --version` to verify.

### 6. Frontend deploy fails (Netlify)
- **Build errors**: Run `npm run build` locally to check for errors before pushing
- **Environment variables**: Check Netlify dashboard → Site settings → Environment variables → ensure `NEXT_PUBLIC_CHAT_AGENT_URL` is set
- **Netlify logs**: Check Netlify dashboard → Deploys → click failed deploy → read build log

### 7. Meal plan / grocery list not saving
- **Check Firestore rules**: Ensure Firestore security rules allow authenticated writes
- **Check auth state**: Are you logged in? The bottom nav should show your profile
- **Firestore quota**: Free tier has daily limits. Check Firebase Console → Firestore → Usage

### 8. Weekly meal plan issues
- **Breakfast has lunch/dinner items**: Glossary may not be seeded. Go to Admin panel → click "Seed Glossary" to populate the 119 curated breakfast recipes.
- **Cuisine not respected**: Check Cloud Function logs for `[meal-plan]` — verify cuisine preferences are being passed correctly. The prompt includes CRITICAL cuisine enforcement that overrides reference recipes.
- **Calorie numbers seem wrong**: Calories are always PER PERSON (per single serving), not total for the family. If a dish feeds 3 and totals 900 cal, it reports 300 cal.
- **Fried items showing for health conditions**: Ensure recipes are tagged correctly in the glossary. The `getExcludedTags()` function maps conditions → tags (fried, high-sugar). Run "Seed Glossary" to apply latest tags.
- **GPT hallucinating recipes**: Check that the prompt includes "APPROVED BREAKFAST RECIPES" (not "REFERENCE RECIPES"). Breakfast is locked to glossary-only. Lunch/dinner allow well-known traditional dishes when reference list doesn't match cuisine.
- **Check function logs**: `firebase functions:log --only generateWeeklyPlan`

### 9. Admin panel not loading / can't save
- **Admin access**: Only authorized users can access `/admin`. Check Firestore `admin-config/admins` collection
- **Firestore permissions**: Admin panel reads/writes to `admin-config/app`. Ensure Firestore rules allow this for admin users

### Quick Health Check (run all at once)
```bash
cd "/Users/adilkhanna/Documents/ AI Code/Scratch Meal Maker"
npm run build                          # Frontend builds?
cd functions && npm run build && cd .. # Functions build?
firebase projects:list                 # Auth valid?
firebase deploy --only functions       # Functions deploy?
```
If all 4 pass, the app is healthy. Push to `main` for frontend deploy.

## Conventions
- Accent color: `bg-[#0059FF]` / `hover:bg-[#0047CC]`
- Background: `#DBE9E3` (set in globals.css)
- Font: Display font via CSS variable `--font-display`
- Buttons: `rounded-full` with `text-xs uppercase tracking-widest`
- Cards: `border border-neutral-200 rounded-2xl bg-white`
- All loaders use `<MomoLoader>` component with optional `size` and `message` props
