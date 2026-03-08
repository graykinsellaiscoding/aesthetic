"use client";

import { useEffect, useState } from "react";

interface NotificationProps {
  message: string;
  icon?: string;
  duration?: number;
  onDismiss?: () => void;
}

export function Notification({
  message,
  icon = "📉",
  duration = 4000,
  onDismiss,
}: NotificationProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  if (!visible) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 max-w-[390px] w-[calc(100%-40px)] bg-ink text-white py-3.5 px-5 text-[13px] z-50 animate-slide-down flex items-center gap-2.5 rounded-sm shadow-lg">
      <span className="text-base">{icon}</span>
      <span>{message}</span>
    </div>
  );
}
