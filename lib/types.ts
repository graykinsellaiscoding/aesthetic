// ─── Enums ───────────────────────────────────────────────────────────────────

export type SizeTop = "XS" | "S" | "M" | "L" | "XL" | "XXL";
export type BudgetTier = "value" | "mid" | "premium" | "lux";
export type FitPref = "slim" | "regular" | "relaxed";
export type BrandTier = "value" | "mid" | "premium" | "lux";
export type ItemCategory =
  | "tee"
  | "knit"
  | "outerwear"
  | "pants"
  | "shorts"
  | "shoes"
  | "accessories";
export type AffiliateNetwork = "impact" | "awin" | "cj" | "direct";
export type AffinitySource = "onboarding" | "click" | "purchase" | "save";
export type EdgeSource = "manual" | "cooccurrence" | "clicks" | "purchases";
export type EventType =
  | "view_item"
  | "save_item"
  | "click_out"
  | "purchase_confirm"
  | "dismiss";

// ─── Tables ──────────────────────────────────────────────────────────────────

export interface UserProfile {
  user_id: string;
  size_top: SizeTop | null;
  size_bottom_waist: number | null;
  size_bottom_inseam: number | null;
  size_shoe: number | null;
  budget_tier: BudgetTier;
  fit_pref: FitPref | null;
  palette_pref: string[];
  created_at: string;
  updated_at: string;
}

export interface Brand {
  id: string;
  name: string;
  tier: BrandTier;
  tags: string[];
  logo_url: string | null;
  base_domain: string | null;
}

export interface BrandEdge {
  brand_a_id: string;
  brand_b_id: string;
  weight: number;
  source: EdgeSource;
  updated_at: string;
}

export interface Item {
  id: string;
  brand_id: string;
  title: string;
  category: ItemCategory;
  image_url: string;
  product_url: string;
  affiliate_url: string;
  list_price: number;
  current_price: number;
  currency: string;
  sizes_available: string[];
  merchant_id: string | null;
  last_seen_at: string;
  // Joined fields
  brand?: Brand;
}

export interface Merchant {
  id: string;
  name: string;
  affiliate_network: AffiliateNetwork;
  program_id: string;
  base_domain: string;
}

export interface PriceHistory {
  id: string;
  item_id: string;
  seen_at: string;
  price: number;
}

export interface UserBrandAffinity {
  user_id: string;
  brand_id: string;
  weight: number;
  source: AffinitySource;
}

export interface AppEvent {
  id: string;
  user_id: string;
  ts: string;
  event_type: EventType;
  item_id: string | null;
  brand_id: string | null;
  meta: Record<string, unknown>;
}

export interface Wishlist {
  user_id: string;
  item_id: string;
  created_at: string;
}

export interface Intent {
  user_id: string;
  category: string;
  weight: number;
  updated_at: string;
}

// ─── Feed Types ──────────────────────────────────────────────────────────────

export interface ScoredItem extends Item {
  score: number;
  brand_name: string;
  brand_tier: BrandTier;
}

export interface FeedSections {
  bestForYou: ScoredItem[];
  onSale: ScoredItem[];
  alsoLike: ScoredItem[];
  priceDrops: ScoredItem[];
}

// ─── Onboarding Types ────────────────────────────────────────────────────────

export interface OnboardingData {
  brandIds: string[];
  palettePref: string[];
  budgetTier: BudgetTier;
  intents: string[];
  sizeTop: SizeTop;
  sizeBottomWaist: number;
  sizeBottomInseam: number;
  sizeShoe: number;
}
