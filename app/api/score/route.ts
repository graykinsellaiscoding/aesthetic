import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { buildFeed } from "@/lib/scoring";
import type { BudgetTier, SizeTop } from "@/lib/types";

export async function GET(request: NextRequest) {
  const supabase = createServerSupabase();

  // 1. Get authenticated user
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Fetch user profile
  const { data: profile } = await supabase
    .from("user_profile")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // 3. Fetch all data needed for scoring in parallel
  const [
    { data: items },
    { data: brands },
    { data: affinities },
    { data: edges },
    { data: intents },
    { data: wishlists },
    { data: priceHistory },
  ] = await Promise.all([
    supabase.from("items").select("*").order("last_seen_at", { ascending: false }),
    supabase.from("brands").select("*"),
    supabase.from("user_brand_affinity").select("*").eq("user_id", user.id),
    supabase.from("brand_edges").select("*"),
    supabase.from("intent").select("*").eq("user_id", user.id),
    supabase.from("wishlists").select("item_id").eq("user_id", user.id),
    supabase
      .from("price_history")
      .select("*")
      .order("seen_at", { ascending: false })
      .limit(5000),
  ]);

  // 4. Build feed with scoring, size filtering, budget gating
  const wishlistItemIds = new Set((wishlists || []).map((w: any) => w.item_id));

  const feed = buildFeed({
    allItems: items || [],
    brands: brands || [],
    affinities: affinities || [],
    edges: edges || [],
    intents: intents || [],
    budgetTier: profile.budget_tier as BudgetTier,
    sizeTop: profile.size_top as SizeTop | null,
    sizeWaist: profile.size_bottom_waist,
    sizeShoe: profile.size_shoe,
    wishlistItemIds,
    priceHistory: priceHistory || [],
  });

  return NextResponse.json({
    feed,
    profile: {
      budgetTier: profile.budget_tier,
      sizeTop: profile.size_top,
    },
  });
}
