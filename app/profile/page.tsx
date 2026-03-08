"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { BottomNav } from "@/components/BottomNav";
import type { UserProfile, UserBrandAffinity } from "@/lib/types";

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [email, setEmail] = useState("");
  const [brandNames, setBrandNames] = useState<string[]>([]);
  const [savedCount, setSavedCount] = useState(0);
  const [eventCount, setEventCount] = useState(0);
  const [clickOuts, setClickOuts] = useState(0);
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

      setEmail(user.email || "");

      // Fetch profile
      const { data: prof } = await supabase
        .from("user_profile")
        .select("*")
        .eq("user_id", user.id)
        .single();
      setProfile(prof);

      // Fetch brand names from affinities
      const { data: affinities } = await supabase
        .from("user_brand_affinity")
        .select("brand_id, brands(name)")
        .eq("user_id", user.id);

      if (affinities) {
        setBrandNames(
          affinities.map((a: any) => a.brands?.name).filter(Boolean)
        );
      }

      // Fetch counts
      const { count: wCount } = await supabase
        .from("wishlists")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      setSavedCount(wCount || 0);

      const { count: eCount } = await supabase
        .from("events")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      setEventCount(eCount || 0);

      const { count: cCount } = await supabase
        .from("events")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("event_type", "click_out");
      setClickOuts(cCount || 0);
    }

    load();
  }, [supabase, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth");
  };

  return (
    <div className="pt-12 px-6 pb-20 animate-fade-in">
      {/* Avatar */}
      <div className="w-16 h-16 rounded-full bg-border-light flex items-center justify-center font-serif text-2xl text-ink-secondary mx-auto mb-3">
        {email.charAt(0).toUpperCase()}
      </div>
      <h1 className="font-serif text-[22px] text-center mb-1">Your Profile</h1>
      <p className="text-xs text-ink-muted text-center mb-7">{email}</p>

      {profile && (
        <>
          {/* Favorite Brands */}
          <div className="border-t border-border-light py-4">
            <p className="text-[10px] uppercase tracking-[1.5px] text-ink-muted mb-2.5">
              Favorite Brands
            </p>
            <div className="flex flex-wrap gap-1.5">
              {brandNames.map((name) => (
                <span
                  key={name}
                  className="px-3 py-1.5 bg-border-light text-[11px] text-ink-secondary rounded-full"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>

          {/* Style Tags */}
          <div className="border-t border-border-light py-4">
            <p className="text-[10px] uppercase tracking-[1.5px] text-ink-muted mb-2.5">
              Style Tags
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(profile.palette_pref || []).slice(0, 8).map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1.5 bg-border-light text-[11px] text-ink-secondary rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Sizes */}
          <div className="border-t border-border-light py-4">
            <p className="text-[10px] uppercase tracking-[1.5px] text-ink-muted mb-2.5">
              Sizes
            </p>
            <p className="text-[13px] text-ink mb-1">Top: {profile.size_top}</p>
            <p className="text-[13px] text-ink mb-1">
              Waist: {profile.size_bottom_waist}
              {profile.size_bottom_inseam
                ? ` × ${profile.size_bottom_inseam}`
                : ""}
            </p>
            <p className="text-[13px] text-ink">Shoe: {profile.size_shoe}</p>
          </div>

          {/* Budget */}
          <div className="border-t border-border-light py-4">
            <p className="text-[10px] uppercase tracking-[1.5px] text-ink-muted mb-2.5">
              Budget Tier
            </p>
            <p className="text-[13px] text-ink capitalize">
              {profile.budget_tier}
            </p>
          </div>

          {/* Activity */}
          <div className="border-t border-border-light py-4">
            <p className="text-[10px] uppercase tracking-[1.5px] text-ink-muted mb-2.5">
              Activity
            </p>
            <p className="text-[13px] text-ink mb-1">{savedCount} items saved</p>
            <p className="text-[13px] text-ink mb-1">{clickOuts} click-outs</p>
            <p className="text-[13px] text-ink">{eventCount} total events</p>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="mt-5 w-full py-3 border border-accent text-accent text-xs tracking-[1px] uppercase rounded-sm bg-transparent hover:bg-accent hover:text-white transition-all"
          >
            Sign Out
          </button>
        </>
      )}

      <BottomNav savedCount={savedCount} />
    </div>
  );
}
