"use client";

import { usePathname, useRouter } from "next/navigation";

const TABS = [
  { id: "feed", path: "/feed", icon: "◉", label: "Feed" },
  { id: "saved", path: "/saved", icon: "♡", activeIcon: "♥", label: "Saved" },
  { id: "profile", path: "/profile", icon: "○", label: "Profile" },
];

interface BottomNavProps {
  savedCount?: number;
}

export function BottomNav({ savedCount = 0 }: BottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 max-w-[430px] w-full bg-bg/92 backdrop-blur-xl border-t border-border flex justify-around pt-2.5 pb-[22px] z-20 bottom-safe">
      {TABS.map((tab) => {
        const isActive = pathname === tab.path;
        const showBadge = tab.id === "saved" && savedCount > 0 && !isActive;
        const icon =
          tab.id === "saved" && savedCount > 0
            ? tab.activeIcon || tab.icon
            : tab.icon;

        return (
          <button
            key={tab.id}
            onClick={() => router.push(tab.path)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 bg-transparent border-none transition-colors ${
              isActive ? "text-ink" : "text-ink-muted"
            }`}
          >
            <span className="text-xl leading-none">{icon}</span>
            <span className="text-[9px] tracking-[1px] uppercase">
              {tab.label}
              {tab.id === "saved" && savedCount > 0
                ? ` (${savedCount})`
                : ""}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
