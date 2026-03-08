"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { ItemCard } from "@/components/ItemCard";
import { BottomNav } from "@/components/BottomNav";
import { Notification } from "@/components/Notification";
import { trackFeedView, trackScrollDepth } from "@/lib/analytics";
import type { FeedSections, ScoredItem } from "@/lib/types";

export default function FeedPage() {
  const [feed, setFeed] = useState<FeedSections | null>(null);
  const [loading, setLoading] = useState(true);
  const [savedItems, setSavedItems] = useState<Set<string>>(new Set());
  const [notification, setNotification] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  // Load feed and wishlists
  useEffect(() => {
    async function load() {
      // Check auth
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth");
        return;
      }

      // Fetch feed from scoring API
      const res = await fetch("/api/score");
      if (!res.ok) {
        if (res.status === 404) router.push("/onboarding");
        return;
      }
      const data = await res.json();
      setFeed(data.feed);

      // Fetch wishlists
      const { data: wishlists } = await supabase
        .from("wishlists")
        .select("item_id")
        .eq("user_id", user.id);

      if (wishlists) {
        setSavedItems(new Set(wishlists.map((w: any) => w.item_id)));
      }

      setLoading(false);

      // Track feed section views
      if (data.feed) {
        Object.entries(data.feed).forEach(([section, items]) => {
          if ((items as ScoredItem[]).length > 0) {
            trackFeedView(section, (items as ScoredItem[]).length);
          }
        });
      }
    }

    load();
  }, [supabase, router]);

  // Show price drop notification after delay
  useEffect(() => {
    if (!feed?.priceDrops?.length) return;
    const timer = setTimeout(() => {
      setNotification(
        `Price drop on ${feed.priceDrops.length} item${
          feed.priceDrops.length > 1 ? "s" : ""
        } in your saves!`
      );
    }, 3000);
    return () => clearTimeout(timer);
  }, [feed]);

  // Toggle save/unsave
  const toggleSave = useCallback(
    async (itemId: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setSavedItems((prev) => {
        const next = new Set(prev);
        if (next.has(itemId)) {
          next.delete(itemId);
          // Remove from DB
          supabase
            .from("wishlists")
            .delete()
            .eq("user_id", user.id)
            .eq("item_id", itemId)
            .then(() => {});
        } else {
          next.add(itemId);
          // Add to DB
          supabase
            .from("wishlists")
            .insert({ user_id: user.id, item_id: itemId })
            .then(() => {});
          // Also record save event
          supabase
            .from("events")
            .insert({
              user_id: user.id,
              event_type: "save_item",
              item_id: itemId,
              ts: new Date().toISOString(),
              meta: {},
            })
            .then(() => {});
        }
        return next;
      });
    },
    [supabase]
  );

  // Track scroll depth
  useEffect(() => {
    if (!feed) return;

    function handleScroll() {
      const depth = window.scrollY / (document.body.scrollHeight - window.innerHeight);
      if (depth > 0.25) trackScrollDepth("feed", 0.25);
      if (depth > 0.5) trackScrollDepth("feed", 0.5);
      if (depth > 0.75) trackScrollDepth("feed", 0.75);
      if (depth > 0.95) trackScrollDepth("feed", 1.0);
    }

    let ticking = false;
    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [feed]);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <p className="font-serif text-2xl font-light tracking-[6px] uppercase text-ink mb-2">
            Aesthetic
          </p>
          <p className="text-xs text-ink-muted tracking-wider">
            Curating your feed...
          </p>
        </div>
      </div>
    );
  }

  const sections: {
    key: keyof FeedSections;
    icon: string;
    title: string;
  }[] = [
    { key: "bestForYou", icon: "🔥", title: "Best For You" },
    { key: "onSale", icon: "💸", title: "On Sale in Your Brands" },
    { key: "alsoLike", icon: "🧠", title: "You Might Also Like" },
    { key: "priceDrops", icon: "📉", title: "Price Drops" },
  ];

  return (
    <div className="pb-20 animate-fade-in">
      {/* Notification */}
      {notification && (
        <Notification
          message={notification}
          onDismiss={() => setNotification(null)}
        />
      )}

      {/* Header */}
      <div className="pt-12 pb-4 px-6 text-center border-b border-border-light">
        <h1 className="font-serif text-2xl font-light tracking-[6px] uppercase text-ink">
          Aesthetic
        </h1>
        <p className="text-[11px] text-ink-muted tracking-[1px] uppercase mt-1">
          {today}
        </p>
      </div>

      {/* Feed Sections */}
      {feed &&
        sections.map(({ key, icon, title }) => {
          const items = feed[key];
          if (!items || items.length === 0) return null;

          return (
            <div key={key}>
              <div className="pt-7 pb-3 px-5">
                <div className="flex items-baseline gap-2.5 mb-4">
                  <span className="text-base">{icon}</span>
                  <span className="font-serif text-[22px] italic">{title}</span>
                  <span className="text-[11px] text-ink-muted tracking-wider">
                    {items.length} items
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  {items.map((item, i) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      saved={savedItems.has(item.id)}
                      onSave={toggleSave}
                      section={key}
                      index={i}
                    />
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="mx-6 h-px bg-border-light mt-1" />
            </div>
          );
        })}

      {/* Empty state */}
      {feed &&
        Object.values(feed).every((items) => items.length === 0) && (
          <div className="text-center py-20 px-6">
            <p className="text-ink-muted text-sm">
              No items match your preferences right now.
              <br />
              Try adjusting your profile to see more.
            </p>
          </div>
        )}

      <BottomNav savedCount={savedItems.size} />
    </div>
  );
}
