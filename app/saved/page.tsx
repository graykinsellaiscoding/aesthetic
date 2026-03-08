"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { ItemCard } from "@/components/ItemCard";
import { BottomNav } from "@/components/BottomNav";
import type { ScoredItem } from "@/lib/types";

export default function SavedPage() {
  const [items, setItems] = useState<ScoredItem[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth");
        return;
      }

      // Fetch wishlists with item data
      const { data: wishlists } = await supabase
        .from("wishlists")
        .select(
          `
          item_id,
          items (
            id, brand_id, title, category, image_url, product_url,
            affiliate_url, list_price, current_price, currency,
            sizes_available,
            brands ( name, tier )
          )
        `
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (wishlists) {
        const mapped: ScoredItem[] = wishlists
          .filter((w: any) => w.items)
          .map((w: any) => ({
            ...w.items,
            score: 1,
            brand_name: w.items.brands?.name || "Unknown",
            brand_tier: w.items.brands?.tier || "mid",
          }));
        setItems(mapped);
        setSavedIds(new Set(mapped.map((i) => i.id)));
      }

      setLoading(false);
    }

    load();
  }, [supabase, router]);

  const toggleSave = useCallback(
    async (itemId: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setSavedIds((prev) => {
        const next = new Set(prev);
        if (next.has(itemId)) {
          next.delete(itemId);
          supabase
            .from("wishlists")
            .delete()
            .eq("user_id", user.id)
            .eq("item_id", itemId)
            .then(() => {});
          setItems((prev) => prev.filter((i) => i.id !== itemId));
        }
        return next;
      });
    },
    [supabase]
  );

  return (
    <div className="pt-12 px-5 pb-20 animate-fade-in">
      <h1 className="font-serif text-[28px] font-light text-center mb-1">
        Saved
      </h1>
      <p className="text-center text-xs text-ink-muted tracking-wider mb-7">
        {savedIds.size} item{savedIds.size !== 1 ? "s" : ""}
      </p>

      {loading && (
        <div className="text-center py-20">
          <p className="text-ink-muted text-sm">Loading...</p>
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="text-center py-16">
          <p className="text-4xl opacity-30 mb-3">♡</p>
          <p className="text-ink-muted text-[13px] leading-relaxed">
            Items you save will appear here.
            <br />
            Tap the heart on any piece to start curating.
          </p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="grid grid-cols-2 gap-3.5">
          {items.map((item, i) => (
            <ItemCard
              key={item.id}
              item={item}
              saved={true}
              onSave={toggleSave}
              section="saved"
              index={i}
            />
          ))}
        </div>
      )}

      <BottomNav savedCount={savedIds.size} />
    </div>
  );
}
