# Good Meals Co. — Scratch Meal Maker

## Overview
A recipe recommendation web app that takes ingredients users have on hand and generates personalized recipes. Users go through a multi-step MCQ flow (ingredients → dietary → cuisine → time) and receive recipes sourced from Spoonacular's verified database, adapted by AI to fit their constraints.

**Live URL**: Hosted on Netlify (auto-deploys from `main` branch)
**Repo**: `adilkhanna/scratch-meal` on GitHub

## Critical Design Principle
**NO hallucinated recipes.** All recipes MUST be sourced from Spoonacular's real recipe database. GPT-4o is used ONLY to adapt verified Spoonacular recipes to fit the user's ingredients and constraints — never to generate recipes from scratch. If Spoonacular can't provide enough compliant recipes, show an error asking the user to add more ingredients rather than falling back to AI-generated recipes.

## Tech Stack
- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4
- **Auth**: Firebase Authentication (Google + Email/Password)
- **Database**: Cloud Firestore
- **Backend**: Firebase Cloud Functions (v2)
- **AI**: OpenAI GPT-4o (recipe adaptation), GPT-4o-mini (dietary compliance review), Higgsfield Soul (recipe thumbnails)
- **Recipe Source**: Spoonacular API (verified recipe database)
- **Animations**: lottie-react with Kawaii animals animation
- **Hosting**: Netlify (frontend), Firebase (functions)
- **Color scheme**: Background `#DBE9E3`, accent blue `#0059FF`, hover blue `#0047CC`

## App Flow (MCQ Steps)
1. **`/`** — Ingredient input (text + photo upload via AI extraction)
2. **`/dietary`** — Dietary preferences (allergies, intolerances, medical, religious, lifestyle — 40+ conditions)
3. **`/cuisine`** — Cuisine preferences (12 cuisines, multi-select, optional)
4. **`/time`** — Cooking time (15/30/45/60/90/120+ minutes)
5. **`/results`** — Recipe results (sourced from Spoonacular, adapted by GPT-4o)

## Recipe Generation Pipeline
```
User inputs → Cloud Function (generateRecipes)
  → Spoonacular API: findByIngredients (15 results)
  → Get details for top 10
  → GPT-4o-mini dietary compliance review (filters unsafe recipes)
  → If ≥3 compliant: GPT-4o adapts them via RAG prompt
  → If <3 compliant: Return error "add more ingredients"
  → If no Spoonacular key: Return error "service unavailable"
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
│   ├── history/page.tsx      # Past recipe history
│   ├── settings/page.tsx     # User settings (pantry basics, account)
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
│   ├── RecipeFlowContext.tsx  # MCQ flow state (ingredients, dietary, cuisines, timeRange)
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
├── generateRecipes.ts        # Recipe generation entry point
├── extractIngredients.ts     # Photo → ingredients via AI
├── chatAgent.ts              # Chat agent function
├── deleteUser.ts             # Account deletion
├── onUserSignup.ts           # New user setup
└── shared/
    ├── openai-client.ts      # OpenAI client init + Higgsfield keys
    ├── higgsfield-client.ts  # Higgsfield AI image generation (Soul model)
    └── recipe-generator.ts   # Core recipe generation (Spoonacular + compliance review + GPT-4o RAG)
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
- **Lottie loader**: Kawaii animals animation (`public/animations/momo-loader.json`) used across all loading states

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

Check secret health: `firebase functions:secrets:access OPENAI_API_KEY` and `firebase functions:secrets:access SPOONACULAR_API_KEY`. If either fails, reconfigure them before deploying.

---

## Troubleshooting Guide

### 1. Recipes not generating / "Failed to generate recipes"
- **Check OpenAI key**: Go to Admin panel → verify OpenAI API key is entered and saved
- **Check Spoonacular key**: Admin panel → verify Spoonacular API key is entered and saved
- **Check Cloud Functions are deployed**: Run `firebase deploy --only functions` from the project root
- **Check function logs**: Run `firebase functions:log --only generateRecipes` to see errors
- **Common fix**: If you see "not configured" errors, re-enter the API keys in the Admin panel and save

### 2. Recipe images not appearing on cards
- **Check Higgsfield is enabled**: Admin panel → Higgsfield section → toggle must be ON (blue)
- **Check Higgsfield keys**: Admin panel → verify both API Key and Secret are entered and saved
- **Check Higgsfield credits**: If keys are valid but images still fail, your Higgsfield account may be out of credits
- **Graceful degradation**: Image failures are non-blocking — recipes still appear without thumbnails
- **Old recipes**: Recipes generated before Higgsfield was enabled won't have images. Generate new recipes to see thumbnails.

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

### 8. Admin panel not loading / can't save
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
