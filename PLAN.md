# Good Meals Co. — Product Roadmap

## Phase 1: Budget-Aware Recipes (Hardcoded Prices) — DONE
Estimated cost per serving using ~50 hardcoded Indian ingredient prices.

### What's Built
- **Ingredient price table** (`functions/src/shared/ingredient-prices.ts`): ~50 entries across vegetables, proteins, dairy, grains, lentils, oils with INR prices per kg/litre/unit
- **Cost calculator**: Unit conversions (cups→litre, grams→kg), fraction parsing ("1/2", "1 1/2"), keyword matching with longest-match priority ("coconut milk" before "milk"), ₹15 default for unmatched
- **Weekly budget UI** on `/time` page: toggle + slider (₹500–₹5,000, step ₹100), shows per-meal estimate
- **Cost badge** on recipe cards: `~₹85/serving`, color-coded green (within budget) / amber (≤1.3x) / red (over) / gray (no budget)
- **Cost badge** on recipe detail modal: neutral color (no budget context)
- **Budget-aware sorting** on results page: within-budget recipes first, then by cost ascending
- **Budget pill** on results page: "Budget: ₹2,000/week | 3 of 5 within budget"

## Phase 2: Live Mandi Prices — DONE
Replace hardcoded vegetable/grain prices with real-time wholesale prices from data.gov.in Mandi API.

### What's Built
- **Mandi API client** (`functions/src/shared/mandi-client.ts`): Fetches daily wholesale prices from data.gov.in for ~27 commodities (vegetables, grains, lentils). Uses Delhi/Azadpur mandi as national benchmark.
- **Scheduled Cloud Function** (`scheduledMandiPriceFetch`): Runs daily at 7 PM IST, fetches mandi prices and caches in Firestore `mandi-prices` collection
- **On-demand refresh** (`refreshMandiPrices`): Admin-triggered manual refresh callable from admin panel
- **Async cost estimation** (`ingredient-prices.ts`): Loads mandi prices from Firestore with 10-min in-memory cache. Vegetables/grains use live mandi prices, proteins/dairy/oils fall back to hardcoded prices.
- **Price transparency**: Cost badges show "Est. ~₹85/serving" prefix to indicate estimates. Results page shows green freshness pill "Live mandi prices as of {date}" + disclaimer about mixed price sources.
- **Admin panel**: Toggle mandi prices on/off, enter data.gov.in API key, see last-fetched timestamp, manual "Refresh Now" button
- **Graceful degradation**: If mandi data unavailable, falls back silently to hardcoded prices with no freshness badge
- **Firestore rules**: `mandi-prices` collection readable by authenticated users

## Phase 3: Smart Pantry & Cost Optimization (Future)
- **Pantry tracking**: Remember what users bought, suggest recipes before ingredients expire
- **Cost optimization**: Suggest ingredient substitutions that reduce cost while maintaining taste
- **Weekly meal plan costing**: Total cost estimate for a full week's meal plan
- **Price alerts**: Notify users when commonly used ingredients drop in price

## Phase 4: User Feedback Improvements (March 2026)

### Changes Implemented
1. **Smart Per-Member Dietary** — Replaced union-of-all-conditions with smart common/minority split. Main dishes satisfy shared conditions; per-member alts only when specific conflicts arise. Max 1 alt per dish.
2. **"Why This Dish?" Explanations** — Every lunch/dinner component now includes an `explanation` field. Info icon on each dish card shows rationale in a blue popover.
3. **Glossary Expansion** — Added 150+ real recipes across Chinese (25), Thai (20), Mexican (20), Korean (15), Mediterranean (15), Japanese (15), Vietnamese (10), European (15), American (10). Total glossary: ~440 recipes.
4. **Regional Eating Patterns** — Created SKILL.md with per-region eating habits. Fixed incorrect mealType tags (e.g., Curd Rice removed from breakfast).
5. **Per-Day Cuisine Selection** — Users select cuisine per day for lunch and dinner separately. Backend passes per-day overrides to GPT prompts.
6. **Appetizing Meal Rules** — APPETIZING_RULES constant with flavor pairing principles, banned bland combos, per-cuisine guidelines.
7. **Balanced Meal Scoring** — Harvard Healthy Eating Plate + Indian thali model, condition-adjusted plate ratios, 0-100 scoring per day.

### Architecture Changes
- `computeSmartDietary()` in generateWeeklyPlan.ts — common vs minority condition computation
- `MealComponent.explanation` field — GPT-generated rationale per dish
- `GeneratedMeal.memberAlts` — per-member alternative dishes keyed by component index
- `SKILL.md` — Regional eating patterns reference document
- Glossary expanded from 289 to ~440 recipes with 9 new cuisine-specific chunk files
