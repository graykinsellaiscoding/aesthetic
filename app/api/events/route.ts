import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { buildClickOutEventRow } from "@/lib/affiliate";

export async function POST(request: NextRequest) {
  const supabase = createServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { itemId, brandId, price, category, affiliateUrl, section } = body;

  if (!itemId) {
    return NextResponse.json({ error: "Missing itemId" }, { status: 400 });
  }

  const eventRow = buildClickOutEventRow({
    userId: user.id,
    itemId,
    brandId,
    price,
    category,
    affiliateUrl,
    referrerSection: section,
  });

  const { error } = await supabase.from("events").insert(eventRow);

  if (error) {
    console.error("Event insert failed:", error);
    return NextResponse.json({ error: "Failed to log event" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
