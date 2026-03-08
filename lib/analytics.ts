"use client";

import posthog from "posthog-js";

let initialized = false;

export function initPostHog() {
  if (initialized) return;
  if (typeof window === "undefined") return;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

  if (!key) {
    console.warn("[Analytics] PostHog key not configured — events logged to console only.");
    return;
  }

  posthog.init(key, {
    api_host: host || "https://us.i.posthog.com",
    capture_pageview: false, // we handle manually
    capture_pageleave: true,
    persistence: "memory", // respect privacy
  });

  initialized = true;
}

// ─── TRACK EVENTS ────────────────────────────────────────────────────────────

type EventProps = Record<string, unknown>;

function track(event: string, props?: EventProps) {
  if (typeof window === "undefined") return;

  // Always log to console in development
  if (process.env.NODE_ENV === "development") {
    console.log(`[Analytics] ${event}`, props);
  }

  if (initialized) {
    posthog.capture(event, props);
  }
}

// ─── ONBOARDING EVENTS (§3.6: per-screen drop-off) ──────────────────────────

export function trackOnboardingStart() {
  track("onboarding_started");
}

export function trackOnboardingStep(step: number, stepName: string) {
  track("onboarding_step_completed", { step, step_name: stepName });
}

export function trackOnboardingComplete(data: {
  brandCount: number;
  budgetTier: string;
  intentCount: number;
}) {
  track("onboarding_completed", data);
}

export function trackOnboardingDrop(step: number, stepName: string) {
  track("onboarding_dropped", { step, step_name: stepName });
}

// ─── FEED EVENTS (§3.6: scroll depth, items viewed) ─────────────────────────

export function trackFeedView(section: string, itemCount: number) {
  track("feed_section_viewed", { section, item_count: itemCount });
}

export function trackScrollDepth(section: string, depth: number) {
  track("feed_scroll_depth", { section, depth_percent: Math.round(depth * 100) });
}

export function trackItemView(itemId: string, brandId: string, section: string) {
  track("item_viewed", { item_id: itemId, brand_id: brandId, section });
}

// ─── SAVE EVENTS (§3.6: saves per user) ─────────────────────────────────────

export function trackSave(itemId: string, brandId: string, price: number) {
  track("item_saved", { item_id: itemId, brand_id: brandId, price });
}

export function trackUnsave(itemId: string) {
  track("item_unsaved", { item_id: itemId });
}

// ─── CLICK-OUT EVENTS (§3.6: CTR = clicks / items viewed) ───────────────────

export function trackClickOut(
  itemId: string,
  brandId: string,
  price: number,
  category: string,
  section: string
) {
  track("click_out", {
    item_id: itemId,
    brand_id: brandId,
    price,
    category,
    section,
  });
}

// ─── PURCHASE EVENTS (§3.6: manual for MVP) ─────────────────────────────────

export function trackPurchaseConfirm(
  itemId: string,
  brandId: string,
  price: number
) {
  track("purchase_confirmed", {
    item_id: itemId,
    brand_id: brandId,
    price,
    gmv: price,
  });
}

// ─── PRICE DROP NOTIFICATION ─────────────────────────────────────────────────

export function trackPriceDropNotification(itemId: string, oldPrice: number, newPrice: number) {
  track("price_drop_notification_shown", {
    item_id: itemId,
    old_price: oldPrice,
    new_price: newPrice,
    discount_pct: Math.round((1 - newPrice / oldPrice) * 100),
  });
}

// ─── IDENTIFY USER ──────────────────────────────────────────────────────────

export function identifyUser(userId: string, email: string) {
  if (initialized) {
    posthog.identify(userId, { email });
  }
}
