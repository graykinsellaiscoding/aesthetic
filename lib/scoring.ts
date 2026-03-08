import type {
  Item,
  UserBrandAffinity,
  BrandEdge,
  Intent,
  BudgetTier,
  ScoredItem,
  FeedSections,
  ItemCategory,
  Brand,
  PriceHistory,
  SizeTop,
} from "./types";

// ─── SCORING WEIGHTS (from spec §4) ─────────────────────────────────────────

const W_BRAND_AFFINITY = 0.4;
const W_BRAND_ADJACENCY = 0.2;
const W_INTENT_BOOST = 0.2;
const W_BUDGET_FIT = 0.1;
const W_SALE_BOOST = 0.1;

// ─── BUDGET TIER THRESHOLDS ─────────────────────────────────────────────────
// Maps budget_tier to max price per category. Items ABOVE this are filtered out.

const BUDGET_CEILINGS: Record<BudgetTier, Record<ItemCategory, number>> = {
  value: {
    tee: 60,
    knit: 160,
    outerwear: 320,
    pants: 110,
    shorts: 80,
    shoes: 140,
    accessories: 60,
  },
  mid: {
    tee: 110,
    knit: 320,
    outerwear: 620,
    pants: 220,
    shorts: 150,
    shoes: 280,
    accessories: 120,
  },
  premium: {
    tee: 200,
    knit: 500,
    outerwear: 900,
    pants: 400,
    shorts: 280,
    shoes: 500,
    accessories: 250,
  },
  lux: {
    tee: 9999,
    knit: 9999,
    outerwear: 9999,
    pants: 9999,
    shorts: 9999,
    shoes: 9999,
    accessories: 9999,
  },
};

// ─── INTENT → CATEGORY MAPPING ──────────────────────────────────────────────

const INTENT_CATEGORIES: Record<string, ItemCategory[]> = {
  staples: ["tee", "knit", "pants"],
  outerwear: ["outerwear"],
  office: ["pants", "knit", "shoes", "accessories"],
  event: ["outerwear", "pants", "shoes", "accessories"],
  vacation: ["shorts", "tee", "shoes"],
  browsing: ["tee", "knit", "outerwear", "pants", "shorts", "shoes", "accessories"],
};

// ─── SIZE MATCHING ──────────────────────────────────────────────────────────
// Returns true if the user's size is available for this item.

function sizeMatchesUser(
  item: Item,
  userSizeTop: SizeTop | null,
  userWaist: number | null,
  userShoe: number | null
): boolean {
  if (!item.sizes_available || item.sizes_available.length === 0) return true;

  const category = item.category;

  // Shoe sizing
  if (category === "shoes") {
    if (!userShoe) return true; // no preference set
    const shoeStr = String(userShoe);
    return item.sizes_available.some(
      (s) => s === shoeStr || s === `US ${shoeStr}` || s === `${shoeStr}`
    );
  }

  // Bottom sizing (pants, shorts)
  if (category === "pants" || category === "shorts") {
    if (!userWaist) return true;
    const waistStr = String(userWaist);
    return item.sizes_available.some(
      (s) => s === waistStr || s === `W${waistStr}` || s.startsWith(waistStr)
    );
  }

  // Top sizing (tee, knit, outerwear, accessories)
  if (!userSizeTop) return true;
  return item.sizes_available.some(
    (s) => s.toUpperCase() === userSizeTop.toUpperCase()
  );
}

// ─── BUDGET GATING ──────────────────────────────────────────────────────────
// Returns true if the item is within the user's budget for its category.
// This is a HARD filter — items over budget are excluded, not just down-ranked.

function withinBudget(
  item: Item,
  budgetTier: BudgetTier
): boolean {
  const ceiling = BUDGET_CEILINGS[budgetTier]?.[item.category];
  if (!ceiling) return true;
  return item.current_price <= ceiling;
}

// ─── SCORE A SINGLE ITEM ────────────────────────────────────────────────────

export function scoreItem(
  item: Item,
  brandMap: Map<string, Brand>,
  affinities: UserBrandAffinity[],
  edges: BrandEdge[],
  intents: Intent[],
  budgetTier: BudgetTier
): number {
  let score = 0;
  const affinitySet = new Map(affinities.map((a) => [a.brand_id, a.weight]));

  // 1. Brand affinity (weight: 0.40)
  const affinityWeight = affinitySet.get(item.brand_id);
  if (affinityWeight !== undefined) {
    score += affinityWeight * W_BRAND_AFFINITY;
  }

  // 2. Brand adjacency (weight: 0.20) — only if no direct affinity
  if (affinityWeight === undefined) {
    let maxAdjWeight = 0;
    for (const edge of edges) {
      const isConnected =
        (edge.brand_a_id === item.brand_id && affinitySet.has(edge.brand_b_id)) ||
        (edge.brand_b_id === item.brand_id && affinitySet.has(edge.brand_a_id));
      if (isConnected && edge.weight > maxAdjWeight) {
        maxAdjWeight = edge.weight;
      }
    }
    score += maxAdjWeight * W_BRAND_ADJACENCY;
  }

  // 3. Intent boost (weight: 0.20)
  for (const intent of intents) {
    const matchingCats = INTENT_CATEGORIES[intent.category] || [];
    if (matchingCats.includes(item.category)) {
      score += intent.weight * W_INTENT_BOOST;
      break; // only count best intent match
    }
  }

  // 4. Budget fit (weight: 0.10)
  const ceiling = BUDGET_CEILINGS[budgetTier]?.[item.category];
  if (ceiling && item.current_price <= ceiling) {
    score += W_BUDGET_FIT;
  }

  // 5. Sale boost (weight: 0.10)
  if (item.current_price < item.list_price) {
    score += W_SALE_BOOST;
  }

  return Math.min(1, Math.max(0, score));
}

// ─── BUILD FULL FEED ────────────────────────────────────────────────────────

export interface FeedInput {
  allItems: Item[];
  brands: Brand[];
  affinities: UserBrandAffinity[];
  edges: BrandEdge[];
  intents: Intent[];
  budgetTier: BudgetTier;
  sizeTop: SizeTop | null;
  sizeWaist: number | null;
  sizeShoe: number | null;
  wishlistItemIds: Set<string>;
  priceHistory: PriceHistory[];
}

export function buildFeed(input: FeedInput): FeedSections {
  const {
    allItems,
    brands,
    affinities,
    edges,
    intents,
    budgetTier,
    sizeTop,
    sizeWaist,
    sizeShoe,
    wishlistItemIds,
    priceHistory,
  } = input;

  const brandMap = new Map(brands.map((b) => [b.id, b]));
  const affinityBrandIds = new Set(affinities.map((a) => a.brand_id));

  // Find adjacent brands (connected to user's affinity brands via edges)
  const adjacentBrandIds = new Set<string>();
  for (const edge of edges) {
    if (affinityBrandIds.has(edge.brand_a_id) && !affinityBrandIds.has(edge.brand_b_id)) {
      adjacentBrandIds.add(edge.brand_b_id);
    }
    if (affinityBrandIds.has(edge.brand_b_id) && !affinityBrandIds.has(edge.brand_a_id)) {
      adjacentBrandIds.add(edge.brand_a_id);
    }
  }

  // Build previous price lookup for price drop detection
  const prevPriceMap = new Map<string, number>();
  for (const ph of priceHistory) {
    const existing = prevPriceMap.get(ph.item_id);
    if (!existing || existing < ph.price) {
      prevPriceMap.set(ph.item_id, ph.price);
    }
  }

  // Filter and score all items
  const scoredItems: ScoredItem[] = [];
  for (const item of allItems) {
    // HARD FILTER 1: Size must match user
    if (!sizeMatchesUser(item, sizeTop, sizeWaist, sizeShoe)) continue;

    // HARD FILTER 2: Must be within budget ceiling
    if (!withinBudget(item, budgetTier)) continue;

    const brand = brandMap.get(item.brand_id);
    const score = scoreItem(item, brandMap, affinities, edges, intents, budgetTier);

    scoredItems.push({
      ...item,
      score,
      brand_name: brand?.name || "Unknown",
      brand_tier: brand?.tier || "mid",
    });
  }

  // Sort by score descending
  scoredItems.sort((a, b) => b.score - a.score);

  // ─── Section 1: Best For You ───
  const bestForYou = scoredItems
    .filter((i) => affinityBrandIds.has(i.brand_id))
    .slice(0, 12);

  // ─── Section 2: On Sale in Your Brands ───
  const onSale = scoredItems
    .filter((i) => affinityBrandIds.has(i.brand_id) && i.current_price < i.list_price)
    .slice(0, 8);

  // ─── Section 3: You Might Also Like (adjacent brands) ───
  const alsoLike = scoredItems
    .filter((i) => adjacentBrandIds.has(i.brand_id))
    .slice(0, 10);

  // ─── Section 4: Price Drops (wishlisted items that dropped) ───
  const priceDrops = scoredItems
    .filter((i) => {
      if (!wishlistItemIds.has(i.id)) return false;
      if (i.current_price >= i.list_price) return false;
      // Check against previous price snapshot
      const prevPrice = prevPriceMap.get(i.id);
      return prevPrice !== undefined && i.current_price < prevPrice;
    })
    .sort((a, b) => a.current_price / a.list_price - b.current_price / b.list_price);

  return { bestForYou, onSale, alsoLike, priceDrops };
}
