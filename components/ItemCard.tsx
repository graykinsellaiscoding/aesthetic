"use client";

import { useCallback, useRef, useEffect, useState } from "react";
import { trackClickOut, trackItemView, trackSave, trackUnsave } from "@/lib/analytics";
import type { ScoredItem } from "@/lib/types";

interface ItemCardProps {
  item: ScoredItem;
  saved: boolean;
  onSave: (itemId: string) => void;
  section: string;
  index: number;
}

export function ItemCard({ item, saved, onSave, section, index }: ItemCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [viewed, setViewed] = useState(false);

  const onSale = item.current_price < item.list_price;
  const discount = onSale
    ? Math.round((1 - item.current_price / item.list_price) * 100)
    : 0;

  // Track item view when visible (IntersectionObserver)
  useEffect(() => {
    if (!ref.current || viewed) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          trackItemView(item.id, item.brand_id, section);
          setViewed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [item.id, item.brand_id, section, viewed]);

  // Handle click-out to affiliate link
  const handleClickOut = useCallback(() => {
    // Track client-side
    trackClickOut(
      item.id,
      item.brand_id,
      item.current_price,
      item.category,
      section
    );

    // Track server-side (fire-and-forget)
    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId: item.id,
        brandId: item.brand_id,
        price: item.current_price,
        category: item.category,
        affiliateUrl: item.affiliate_url,
        section,
      }),
    }).catch(() => {});

    // Open affiliate link in new tab
    if (item.affiliate_url && item.affiliate_url !== "#") {
      window.open(item.affiliate_url, "_blank", "noopener,noreferrer");
    }
  }, [item, section]);

  // Handle save/unsave
  const handleSave = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (saved) {
        trackUnsave(item.id);
      } else {
        trackSave(item.id, item.brand_id, item.current_price);
      }
      onSave(item.id);
    },
    [saved, item, onSave]
  );

  return (
    <div
      ref={ref}
      className="relative animate-slide-up"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Image */}
      <div className="aspect-[4/5] overflow-hidden rounded-sm bg-border-light relative">
        {!imageLoaded && <div className="absolute inset-0 img-loading" />}
        <img
          src={item.image_url}
          alt={`${item.brand_name} ${item.title}`}
          className={`w-full h-full object-cover transition-all duration-500 hover:scale-[1.04] ${
            imageLoaded ? "opacity-100" : "opacity-0"
          }`}
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
        />

        {/* Save button */}
        <button
          onClick={handleSave}
          className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center text-[15px] transition-all z-[2] backdrop-blur-sm ${
            saved
              ? "bg-white/90 text-accent"
              : "bg-white/90 text-ink-secondary hover:scale-110"
          }`}
          aria-label={saved ? "Remove from saved" : "Save item"}
        >
          {saved ? "♥" : "♡"}
        </button>

        {/* Sale tag */}
        {onSale && (
          <div className="absolute top-2 left-2 px-2 py-0.5 bg-accent text-white text-[9px] font-medium tracking-[1px] uppercase z-[2]">
            {discount}% off
          </div>
        )}
      </div>

      {/* Info */}
      <div className="pt-2 px-0.5 cursor-pointer" onClick={handleClickOut}>
        <p className="text-[10px] uppercase tracking-[1.2px] text-ink-muted font-medium mb-0.5">
          {item.brand_name}
        </p>
        <p className="font-serif text-sm text-ink leading-tight">{item.title}</p>
        <div className="mt-1 text-xs text-ink-secondary flex items-center gap-1.5">
          {onSale ? (
            <>
              <span className="text-accent font-medium">${item.current_price}</span>
              <span className="line-through text-ink-muted text-[11px]">
                ${item.list_price}
              </span>
            </>
          ) : (
            <span>${item.current_price}</span>
          )}
        </div>
      </div>
    </div>
  );
}
