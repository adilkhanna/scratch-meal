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

## Phase 2: Live Mandi Prices (Planned)
Replace hardcoded vegetable prices with real-time wholesale prices from data.gov.in.

### What's Planned
- **Data source**: [data.gov.in Mandi Commodity Prices API](https://www.data.gov.in/resource/current-daily-price-various-commodities-various-markets-mandi) — daily wholesale prices by state/market
- **Cloud Function**: Daily scheduled function to fetch and cache mandi prices in Firestore
- **Price freshness**: Show "Prices as of {date}" badge, fall back to hardcoded if API is down
- **Regional pricing**: Use nearest mandi market based on user's state/city (if available)
- **Vegetables only**: Mandi data covers vegetables and some grains — proteins, dairy, oils stay hardcoded

## Phase 3: Smart Pantry & Cost Optimization (Future)
- **Pantry tracking**: Remember what users bought, suggest recipes before ingredients expire
- **Cost optimization**: Suggest ingredient substitutions that reduce cost while maintaining taste
- **Weekly meal plan costing**: Total cost estimate for a full week's meal plan
- **Price alerts**: Notify users when commonly used ingredients drop in price
