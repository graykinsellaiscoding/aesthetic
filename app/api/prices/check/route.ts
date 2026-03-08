import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase-server";
import { randomUUID } from "crypto";

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminSupabase();
  const now = new Date().toISOString();

  try {
    // Fetch all items
    const { data: items, error } = await supabase
      .from("items")
      .select("id, current_price, list_price");

    if (error) throw error;

    // In production: fetch real prices from affiliate feed CSV
    // For MVP: simulate small price fluctuations
    const snapshots = [];
    const updates = [];

    for (const item of items || []) {
      let newPrice = item.current_price;

      if (Math.random() < 0.05) {
        const direction = Math.random() < 0.6 ? -1 : 1;
        const changePct = 0.05 + Math.random() * 0.2;
        newPrice = Math.round(item.current_price * (1 + direction * changePct));
        newPrice = Math.min(newPrice, item.list_price);
        newPrice = Math.max(newPrice, Math.round(item.list_price * 0.3));

        if (newPrice !== item.current_price) {
          updates.push({ id: item.id, current_price: newPrice });
        }
      }

      snapshots.push({
        id: randomUUID(),
        item_id: item.id,
        seen_at: now,
        price: newPrice,
      });
    }

    // Batch update prices
    for (const u of updates) {
      await supabase
        .from("items")
        .update({ current_price: u.current_price, last_seen_at: now })
        .eq("id", u.id);
    }

    // Batch insert snapshots
    const BATCH = 500;
    for (let i = 0; i < snapshots.length; i += BATCH) {
      await supabase.from("price_history").insert(snapshots.slice(i, i + BATCH));
    }

    return NextResponse.json({
      ok: true,
      checked: items?.length || 0,
      updated: updates.length,
    });
  } catch (err: any) {
    console.error("Price check error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
