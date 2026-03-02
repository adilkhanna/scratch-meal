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
- **AI**: OpenAI GPT-4o (recipe adaptation), GPT-4o-mini (dietary compliance review)
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
    ├── openai-client.ts      # OpenAI client init
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

## Deployment
- **Frontend**: Push to `main` → Netlify auto-deploys
- **Functions**: `firebase deploy --only functions` (requires `firebase login` auth)
- **Firebase auth may expire**: Run `firebase login --reauth` if deploy fails

## Conventions
- Accent color: `bg-[#0059FF]` / `hover:bg-[#0047CC]`
- Background: `#DBE9E3` (set in globals.css)
- Font: Display font via CSS variable `--font-display`
- Buttons: `rounded-full` with `text-xs uppercase tracking-widest`
- Cards: `border border-neutral-200 rounded-2xl bg-white`
- All loaders use `<MomoLoader>` component with optional `size` and `message` props
