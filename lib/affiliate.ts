/**
 * Affiliate Link Infrastructure
 * 
 * Wraps product URLs with Impact affiliate tracking parameters.
 * Every click-out opens in a new tab with the wrapped link.
 * Every click is logged as a click_out event in the events table.
 */

import type { Item, AffiliateNetwork } from "./types";

// Impact tracking URL template
// Docs: https://integrations.impact.com/impact-brand/docs/tracking-link-creation
const IMPACT_BASE = "https://goto.target.com/c"; // Replace with your Impact tracking domain

interface AffiliateConfig {
  network: AffiliateNetwork;
  programId: string;
  mediaPartnerId: string;
}

// Build an affiliate-wrapped URL for Impact network
function buildImpactUrl(
  productUrl: string,
  config: AffiliateConfig,
  metadata?: { itemId?: string; userId?: string }
): string {
  const params = new URLSearchParams({
    id: config.programId,
    mid: config.mediaPartnerId,
    murl: productUrl,
    // SubID tracking for attribution
    ...(metadata?.itemId && { subId1: metadata.itemId }),
    ...(metadata?.userId && { subId2: metadata.userId }),
  });

  return `${IMPACT_BASE}?${params.toString()}`;
}

// Build an affiliate-wrapped URL for Awin network (future)
function buildAwinUrl(
  productUrl: string,
  publisherId: string,
  merchantId: string,
  metadata?: { itemId?: string }
): string {
  const encoded = encodeURIComponent(productUrl);
  return `https://www.awin1.com/cread.php?awinmid=${merchantId}&awinaffid=${publisherId}&ued=${encoded}&clickref=${metadata?.itemId || ""}`;
}

/**
 * Get the affiliate URL for an item.
 * If the item already has an affiliate_url stored, use it.
 * Otherwise, wrap the product_url with the appropriate network.
 */
export function getAffiliateUrl(
  item: Item,
  network: AffiliateNetwork = "impact",
  userId?: string
): string {
  // If we already have a pre-generated affiliate URL, use it
  if (item.affiliate_url && item.affiliate_url !== "#" && item.affiliate_url.startsWith("http")) {
    return item.affiliate_url;
  }

  // Otherwise, wrap the product URL
  if (!item.product_url || item.product_url === "#") {
    return "#";
  }

  if (network === "impact") {
    return buildImpactUrl(item.product_url, {
      network: "impact",
      programId: process.env.IMPACT_PROGRAM_ID || "default",
      mediaPartnerId: process.env.IMPACT_API_ACCOUNT_SID || "default",
    }, { itemId: item.id, userId });
  }

  if (network === "awin") {
    return buildAwinUrl(item.product_url, "YOUR_PUBLISHER_ID", "YOUR_MERCHANT_ID", {
      itemId: item.id,
    });
  }

  return item.product_url;
}

/**
 * Handle a click-out: log the event server-side.
 * Called from the API route when a user clicks an item.
 */
export interface ClickOutEvent {
  userId: string;
  itemId: string;
  brandId: string;
  price: number;
  category: string;
  affiliateUrl: string;
  sessionId?: string;
  referrerSection?: string;
}

export function buildClickOutEventRow(event: ClickOutEvent) {
  return {
    user_id: event.userId,
    event_type: "click_out" as const,
    item_id: event.itemId,
    brand_id: event.brandId,
    ts: new Date().toISOString(),
    meta: {
      price: event.price,
      category: event.category,
      affiliate_url: event.affiliateUrl,
      session_id: event.sessionId,
      ref: event.referrerSection,
    },
  };
}
