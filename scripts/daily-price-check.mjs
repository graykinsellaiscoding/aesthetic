/**
 * Daily Price Check — run via Vercel Cron or pg_cron
 * 
 * 1. Fetches all active items
 * 2. Checks current prices (placeholder — replace with real affiliate feed)
 * 3. Writes new price_history snapshot
 * 4. Detects price drops (current < previous snapshot)
 * 5. Stores drop metadata for in-app notifications
 * 
 * Run: node scripts/daily-price-check.mjs
 * Cron: Vercel cron at 6:00 AM UTC daily
 */

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { config } from "dotenv";

config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkPrices() {
  console.log("📊 Running daily price check...\n");
  const now = new Date().toISOString();

  // 1. Fetch all items with their most recent price snapshot
  const { data: items, error: itemErr } = await supabase
    .from("items")
    .select("id, current_price, list_price, brand_id, category")
    .order("last_seen_at", { ascending: false });

  if (itemErr) throw new Error(`Failed to fetch items: ${itemErr.message}`);
  console.log(`→ Found ${items.length} items to check\n`);

  // 2. Fetch previous price snapshots (most recent per item)
  const { data: prevPrices, error: priceErr } = await supabase
    .from("price_history")
    .select("item_id, price, seen_at")
    .order("seen_at", { ascending: false });

  if (priceErr) throw new Error(`Failed to fetch price history: ${priceErr.message}`);

  // Build lookup: most recent price per item
  const prevPriceMap = new Map();
  for (const ph of prevPrices) {
    if (!prevPriceMap.has(ph.item_id)) {
      prevPriceMap.set(ph.item_id, ph.price);
    }
  }

  // 3. Simulate price changes (in production, this would fetch from affiliate feed)
  // For MVP: ~5% of items get a small price change each day
  let priceChanges = 0;
  let priceDrops = 0;
  const newSnapshots = [];
  const updatedItems = [];

  for (const item of items) {
    let newPrice = item.current_price;

    // Simulate: 5% chance of price change
    if (Math.random() < 0.05) {
      const direction = Math.random() < 0.6 ? -1 : 1; // 60% drops, 40% increases
      const changePct = 0.05 + Math.random() * 0.20; // 5-25% change
      newPrice = Math.round(item.current_price * (1 + direction * changePct));

      // Never go above list price or below 30% of list
      newPrice = Math.min(newPrice, item.list_price);
      newPrice = Math.max(newPrice, Math.round(item.list_price * 0.30));

      if (newPrice !== item.current_price) {
        priceChanges++;
        if (newPrice < item.current_price) priceDrops++;

        updatedItems.push({ id: item.id, current_price: newPrice });
      }
    }

    // Record snapshot
    newSnapshots.push({
      id: randomUUID(),
      item_id: item.id,
      seen_at: now,
      price: newPrice,
    });
  }

  // 4. Batch update items with new prices
  if (updatedItems.length > 0) {
    console.log(`→ Updating ${updatedItems.length} item prices (${priceDrops} drops)...`);
    for (const update of updatedItems) {
      await supabase
        .from("items")
        .update({ current_price: update.current_price, last_seen_at: now })
        .eq("id", update.id);
    }
  }

  // 5. Batch insert new price snapshots
  console.log(`→ Recording ${newSnapshots.length} price snapshots...`);
  const BATCH = 500;
  for (let i = 0; i < newSnapshots.length; i += BATCH) {
    const batch = newSnapshots.slice(i, i + BATCH);
    const { error } = await supabase.from("price_history").insert(batch);
    if (error) console.error(`  Snapshot batch error: ${error.message}`);
  }

  // 6. Find wishlisted items that dropped — these become notifications
  if (priceDrops > 0) {
    const droppedIds = updatedItems
      .filter(u => u.current_price < (prevPriceMap.get(u.id) || Infinity))
      .map(u => u.id);

    if (droppedIds.length > 0) {
      const { data: wishlisted } = await supabase
        .from("wishlists")
        .select("user_id, item_id")
        .in("item_id", droppedIds);

      if (wishlisted && wishlisted.length > 0) {
        console.log(`\n🔔 ${wishlisted.length} wishlisted items had price drops!`);
        // These will be surfaced in the Price Drops feed section
        // In-app notifications are handled by the feed query
      }
    }
  }

  console.log("\n═══════════════════════════════════════════");
  console.log(`✅ Price check complete`);
  console.log(`   ${items.length} items checked`);
  console.log(`   ${priceChanges} prices changed`);
  console.log(`   ${priceDrops} price drops detected`);
  console.log("═══════════════════════════════════════════");
}

checkPrices().catch(err => {
  console.error("❌ Price check failed:", err);
  process.exit(1);
});
