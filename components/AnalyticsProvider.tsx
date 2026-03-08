"use client";

import { useEffect } from "react";
import { initPostHog } from "@/lib/analytics";

export function AnalyticsProvider() {
  useEffect(() => {
    initPostHog();
  }, []);

  return null;
}
