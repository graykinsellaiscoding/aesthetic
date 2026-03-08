# Aesthetic — Personalized Menswear Discovery

A taste-based menswear curation web app. Less catalog, more conviction.

## Architecture

```
aesthetic/
├── app/
│   ├── auth/page.tsx          # Email/password login & signup
│   ├── onboarding/page.tsx    # 5-screen onboarding flow
│   ├── feed/page.tsx          # Personalized feed (4 sections)
│   ├── saved/page.tsx         # Wishlist view
│   ├── profile/page.tsx       # User preferences & stats
│   ├── api/
│   │   ├── score/route.ts     # Server-side feed scoring engine
│   │   ├── events/route.ts    # Click-out event logging
│   │   └── prices/check/      # Vercel Cron daily price check
│   ├── layout.tsx             # Root layout + PostHog init
│   ├── page.tsx               # Auth redirect logic
│   └── globals.css            # Tailwind + editorial design tokens
├── components/
│   ├── ItemCard.tsx           # Product card with save + click tracking
│   ├── BottomNav.tsx          # Mobile-style bottom navigation
│   ├── Notification.tsx       # In-app price drop alerts
│   └── AnalyticsProvider.tsx  # PostHog initialization
├── lib/
│   ├── scoring.ts             # Feed scoring algorithm (§4 of spec)
│   ├── affiliate.ts           # Impact/Awin link wrapping
│   ├── analytics.ts           # PostHog event tracking
│   ├── types.ts               # TypeScript types for all DB tables
│   ├── supabase-browser.ts    # Client-side Supabase client
│   └── supabase-server.ts     # Server-side Supabase client
├── scripts/
│   ├── 001-schema.sql         # Complete Postgres schema + RLS
│   ├── seed-database.mjs      # Seed 40 brands + 1,500 items
│   └── daily-price-check.mjs  # Price recheck script
├── middleware.ts               # Supabase auth session refresh
└── vercel.json                 # Cron job config
```

## Quick Start

### 1. Create Supabase Project

Go to [supabase.com](https://supabase.com) and create a new project (free tier).

### 2. Run Database Migration

In the Supabase Dashboard → SQL Editor → New Query, paste the contents of `scripts/001-schema.sql` and run it.

### 3. Configure Environment

```bash
cp .env.local.example .env.local
```

Fill in your Supabase URL, anon key, and service role key from the Supabase Dashboard → Settings → API.

### 4. Install & Seed

```bash
npm install
npm run seed      # Seeds 40 brands, adjacency graph, ~1,500 items
```

### 5. Run Development Server

```bash
npm run dev       # http://localhost:3000
```

### 6. Deploy to Vercel

```bash
npx vercel        # Follow prompts, add env vars in Vercel dashboard
```

## Key Implementation Details

### Feed Scoring (lib/scoring.ts)

Each item is scored server-side with a weighted sum:

| Signal            | Weight | Description                                       |
|-------------------|--------|---------------------------------------------------|
| Brand affinity    | 0.40   | User picked this brand in onboarding              |
| Brand adjacency   | 0.20   | Connected to a favorite brand via brand_edges      |
| Intent boost      | 0.20   | Item category matches user's shopping intent       |
| Budget fit        | 0.10   | Price within user's budget ceiling for category    |
| Sale boost        | 0.10   | Item is currently on sale                          |

**Hard filters** (items are excluded, not just down-ranked):
- Size filtering: Item must have user's size in `sizes_available`
- Budget gating: Item price must be under the ceiling for user's `budget_tier` + category

### Analytics (lib/analytics.ts)

All events tracked via PostHog (client) + events table (server):
- Onboarding completion rate (per-screen drop-off)
- Feed scroll depth
- Saves per user
- Click-through rate (clicks / items viewed)
- Purchase confirmations (manual for MVP)

### Affiliate Links (lib/affiliate.ts)

Every item card click:
1. Wraps the product URL with Impact tracking parameters
2. Logs a `click_out` event server-side via `/api/events`
3. Opens the affiliate link in a new tab
4. Tracks via PostHog client-side

### Daily Price Check

Runs via Vercel Cron at 6:00 AM UTC:
1. Fetches all items
2. Checks prices (simulated for MVP — replace with real affiliate feed CSV)
3. Writes price_history snapshots
4. Items that dropped are surfaced in the "Price Drops" feed section

## Replacing Mock Data with Real Products

### Option A: CSV Import (Recommended for MVP)

1. Export product feeds from Impact/Awin as CSV
2. Map columns to the `items` table schema
3. Run a modified seed script to import

### Option B: API Integration

Replace the simulated price check in `scripts/daily-price-check.mjs` with real Impact API calls:
- [Impact Product Feed API](https://integrations.impact.com/impact-brand/docs/product-data-feed)
- [Awin Product Feed](https://wiki.awin.com/index.php/Product_Feeds)

### Real Product Images

The seed script uses placeholder image URLs. Replace with:
1. Product image URLs from affiliate feeds
2. Or proxy through Supabase Storage for consistent sizing

## Cost

| Service         | Tier    | Cost        |
|-----------------|---------|-------------|
| Supabase        | Free    | $0/mo       |
| Vercel          | Hobby   | $0/mo       |
| PostHog         | Free    | $0/mo       |
| Impact          | Free    | $0 (rev share) |
| **Total**       |         | **$0/mo**   |

## Success Metrics (from spec §9)

Target from 40–60 beta users within 30 days:
- ≥ 70% onboarding completion
- ≥ 40% return within 7 days
- ≥ 20% click-out rate
- ≥ 5–10 confirmed purchases
- ≥ $150–300 GMV per purchasing user
