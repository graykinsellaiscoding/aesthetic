"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import {
  trackOnboardingStart,
  trackOnboardingStep,
  trackOnboardingComplete,
  identifyUser,
} from "@/lib/analytics";
import type { BudgetTier, SizeTop } from "@/lib/types";

// ─── SEED DATA ───────────────────────────────────────────────────────────────

const BRAND_GRID = [
  "Acne Studios","Our Legacy","Common Projects","Maison Margiela","Lemaire","Auralee","Jil Sander","Jacquemus",
  "Norse Projects","A.P.C.","Reigning Champ","Saturdays NYC","Entireworld","Stone Island","Margaret Howell","Officine Générale",
  "Barbour","Aimé Leon Dore","Sunspel","Beams Plus","Engineered Garments","OrSlow","Club Monaco","J.Crew",
  "Buck Mason","Taylor Stitch","Todd Snyder","Madewell","Corridor","Alex Mill","Carhartt WIP","Stüssy",
  "Rowing Blazers","Knickerbocker","Uniqlo","H&M","Everlane","COS","Arket","Abercrombie",
];

const INITIALS: Record<string, string> = {
  "Acne Studios":"AS","Our Legacy":"OL","Common Projects":"CP","Maison Margiela":"MM","Lemaire":"LM",
  "Auralee":"AU","Jil Sander":"JS","Jacquemus":"JQ","Norse Projects":"NP","A.P.C.":"AP",
  "Reigning Champ":"RC","Saturdays NYC":"SN","Entireworld":"EW","Stone Island":"SI",
  "Margaret Howell":"MH","Officine Générale":"OG","Barbour":"BB","Aimé Leon Dore":"AD",
  "Sunspel":"SP","Beams Plus":"BP","Engineered Garments":"EG","OrSlow":"OS",
  "Club Monaco":"CM","J.Crew":"JC","Buck Mason":"BM","Taylor Stitch":"TS",
  "Todd Snyder":"TD","Madewell":"MW","Corridor":"CO","Alex Mill":"AM",
  "Carhartt WIP":"CW","Stüssy":"ST","Rowing Blazers":"RB","Knickerbocker":"KB",
  "Uniqlo":"UQ","H&M":"HM","Everlane":"EV","COS":"CS","Arket":"AK","Abercrombie":"AF",
};

const AESTHETIC_CARDS = [
  { id: "a1", label: "Minimal & Clean", tags: ["minimal","clean","modern"], img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop&crop=top", desc: "Sharp lines, neutral palette" },
  { id: "a2", label: "Streetwear Edge", tags: ["streetwear","casual","urban"], img: "https://images.unsplash.com/photo-1523398002811-999ca8dec234?w=400&h=500&fit=crop", desc: "Bold, graphic, relaxed" },
  { id: "a3", label: "Tailored Classic", tags: ["tailored","classic","refined"], img: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400&h=500&fit=crop", desc: "Structured, timeless elegance" },
  { id: "a4", label: "Outdoor & Rugged", tags: ["outdoor","workwear","heritage"], img: "https://images.unsplash.com/photo-1520975661595-6453be3f7070?w=400&h=500&fit=crop", desc: "Functional, textured, earthy" },
  { id: "a5", label: "Editorial Avant-Garde", tags: ["editorial","avant-garde","deconstructed"], img: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=500&fit=crop", desc: "Experimental, bold silhouettes" },
  { id: "a6", label: "Coastal Casual", tags: ["coastal","surf","casual","relaxed"], img: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=500&fit=crop", desc: "Easy, sun-washed, effortless" },
  { id: "a7", label: "Scandinavian Modern", tags: ["Scandinavian","minimal","modern"], img: "https://images.unsplash.com/photo-1490114538077-0a7f8cb49891?w=400&h=500&fit=crop", desc: "Muted tones, clean form" },
  { id: "a8", label: "Japanese Craft", tags: ["Japanese","heritage","refined"], img: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=400&h=500&fit=crop", desc: "Wabi-sabi, indigo, texture" },
  { id: "a9", label: "New York Prep", tags: ["preppy","classic","American"], img: "https://images.unsplash.com/photo-1617137968427-85924c800a22?w=400&h=500&fit=crop", desc: "Ivy league meets downtown" },
  { id: "a10", label: "Italian Luxe", tags: ["Italian","luxury","tailored"], img: "https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=400&h=500&fit=crop", desc: "Rich fabrics, effortless polish" },
];

const INTENT_OPTIONS = [
  { id: "staples", label: "Everyday Staples", icon: "◯" },
  { id: "outerwear", label: "Outerwear", icon: "❄" },
  { id: "office", label: "Office Upgrade", icon: "▧" },
  { id: "event", label: "Event", icon: "★" },
  { id: "vacation", label: "Vacation", icon: "◐" },
  { id: "browsing", label: "Just Browsing", icon: "◎" },
];

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedAesthetics, setSelectedAesthetics] = useState<string[]>([]);
  const [budgets, setBudgets] = useState<Record<string, BudgetTier | null>>({
    tee: null,
    knit: null,
    outerwear: null,
  });
  const [selectedIntents, setSelectedIntents] = useState<string[]>([]);
  const [sizeTop, setSizeTop] = useState<SizeTop | null>(null);
  const [sizeWaist, setSizeWaist] = useState<number | null>(null);
  const [sizeInseam, setSizeInseam] = useState<number | null>(null);
  const [sizeShoe, setSizeShoe] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  // Derive overall budget_tier from per-category selections (median)
  const deriveBudgetTier = useCallback((): BudgetTier => {
    const tiers: BudgetTier[] = Object.values(budgets).filter(Boolean) as BudgetTier[];
    if (tiers.length === 0) return "mid";
    const order: BudgetTier[] = ["value", "mid", "premium", "lux"];
    const indices = tiers.map((t) => order.indexOf(t)).sort((a, b) => a - b);
    return order[indices[Math.floor(indices.length / 2)]];
  }, [budgets]);

  // Save all onboarding data to Supabase
  const saveOnboarding = useCallback(async () => {
    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      identifyUser(user.id, user.email || "");

      // Collect palette tags from selected aesthetics
      const palettePref = [
        ...new Set(
          selectedAesthetics.flatMap(
            (id) => AESTHETIC_CARDS.find((a) => a.id === id)?.tags || []
          )
        ),
      ];

      const budgetTier = deriveBudgetTier();

      // 1. Fetch brand IDs by name
      const { data: brands } = await supabase
        .from("brands")
        .select("id, name")
        .in("name", selectedBrands);

      const brandIdMap = new Map(
        (brands || []).map((b: any) => [b.name, b.id])
      );

      // 2. Upsert user_profile
      await supabase.from("user_profile").upsert({
        user_id: user.id,
        size_top: sizeTop,
        size_bottom_waist: sizeWaist,
        size_bottom_inseam: sizeInseam || 32,
        size_shoe: sizeShoe,
        budget_tier: budgetTier,
        palette_pref: palettePref,
        updated_at: new Date().toISOString(),
      });

      // 3. Insert brand affinities
      const affinityRows = selectedBrands
        .map((name) => ({
          user_id: user.id,
          brand_id: brandIdMap.get(name),
          weight: 1.0,
          source: "onboarding" as const,
        }))
        .filter((r) => r.brand_id);

      if (affinityRows.length > 0) {
        await supabase
          .from("user_brand_affinity")
          .upsert(affinityRows, {
            onConflict: "user_id,brand_id,source",
          });
      }

      // 4. Insert intents
      const intentRows = selectedIntents.map((cat) => ({
        user_id: user.id,
        category: cat,
        weight: 0.8,
        updated_at: new Date().toISOString(),
      }));

      if (intentRows.length > 0) {
        await supabase
          .from("intent")
          .upsert(intentRows, { onConflict: "user_id,category" });
      }

      trackOnboardingComplete({
        brandCount: selectedBrands.length,
        budgetTier,
        intentCount: selectedIntents.length,
      });

      router.push("/feed");
    } catch (err) {
      console.error("Onboarding save failed:", err);
      alert("Something went wrong saving your preferences. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [
    supabase,
    selectedBrands,
    selectedAesthetics,
    budgets,
    selectedIntents,
    sizeTop,
    sizeWaist,
    sizeInseam,
    sizeShoe,
    deriveBudgetTier,
    router,
  ]);

  const STEP_NAMES = ["brands", "aesthetic", "budget", "intent", "sizes"];

  function advance() {
    trackOnboardingStep(step, STEP_NAMES[step]);
    if (step < 4) {
      setStep(step + 1);
    } else {
      saveOnboarding();
    }
  }

  const canContinue = [
    selectedBrands.length >= 5,
    selectedAesthetics.length === 3,
    budgets.tee && budgets.knit && budgets.outerwear,
    selectedIntents.length > 0,
    sizeTop && sizeWaist && sizeShoe,
  ][step];

  const hints = [
    `${selectedBrands.length} of 5–8 selected`,
    `${selectedAesthetics.length} of 3 selected`,
    "Select one per category",
    "Select at least one",
    "Select one per category",
  ];

  return (
    <div className="min-h-screen flex flex-col animate-fade-up" key={step}>
      {/* Header */}
      <div className="pt-[52px] pb-5 px-6 text-center">
        <p className="font-serif text-[13px] font-normal tracking-[5px] uppercase text-ink-muted mb-1.5">
          Aesthetic
        </p>

        {/* Progress dots */}
        <div className="flex gap-1.5 justify-center mb-7">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`w-6 h-0.5 rounded-sm transition-colors duration-300 ${
                i <= step ? "bg-ink" : "bg-border"
              }`}
            />
          ))}
        </div>

        <h2 className="font-serif text-[28px] font-light leading-tight text-ink mb-1.5">
          {["Brands you love", "Your aesthetic", "Your budget", "Shopping for", "Your sizes"][step]}
        </h2>
        <p className="text-[13px] text-ink-secondary font-light tracking-wide">
          {[
            "Pick 5–8 brands that define your wardrobe",
            "Select 3 looks that feel most like you",
            "What feels comfortable per category",
            "What's on your radar right now?",
            "So we only show what fits",
          ][step]}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 overflow-y-auto pb-[100px]">
        {/* Step 0: Brand Grid */}
        {step === 0 && (
          <div className="grid grid-cols-4 gap-2.5">
            {BRAND_GRID.map((name) => {
              const selected = selectedBrands.includes(name);
              return (
                <button
                  key={name}
                  onClick={() => {
                    setSelectedBrands((prev) =>
                      prev.includes(name)
                        ? prev.filter((b) => b !== name)
                        : prev.length < 8
                        ? [...prev, name]
                        : prev
                    );
                  }}
                  className={`flex flex-col items-center gap-1.5 py-3.5 px-1 border rounded-sm cursor-pointer transition-all ${
                    selected
                      ? "border-ink bg-ink"
                      : "border-border bg-bg-card hover:border-ink-secondary"
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-medium tracking-wider ${
                      selected
                        ? "bg-white/15 text-white"
                        : "bg-border-light text-ink-secondary"
                    }`}
                  >
                    {INITIALS[name] || name.slice(0, 2).toUpperCase()}
                  </div>
                  <span
                    className={`text-[9.5px] text-center leading-tight tracking-wide ${
                      selected ? "text-white" : "text-ink-secondary"
                    }`}
                  >
                    {name}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Step 1: Aesthetic Cards */}
        {step === 1 && (
          <div className="grid grid-cols-2 gap-3">
            {AESTHETIC_CARDS.map((card) => {
              const selected = selectedAesthetics.includes(card.id);
              return (
                <button
                  key={card.id}
                  onClick={() => {
                    setSelectedAesthetics((prev) =>
                      prev.includes(card.id)
                        ? prev.filter((a) => a !== card.id)
                        : prev.length < 3
                        ? [...prev, card.id]
                        : prev
                    );
                  }}
                  className={`relative rounded-sm overflow-hidden aspect-[4/5] transition-all ${
                    selected ? "ring-2 ring-ink ring-offset-0" : ""
                  }`}
                >
                  <img
                    src={card.img}
                    alt={card.label}
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-[1.03]"
                    loading="lazy"
                  />
                  {selected && (
                    <div className="absolute top-2.5 right-2.5 w-6 h-6 bg-ink text-white rounded-full flex items-center justify-center text-xs">
                      ✓
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-3 pt-8 bg-gradient-to-t from-black/60 to-transparent text-white text-left">
                    <p className="font-serif text-[15px]">{card.label}</p>
                    <p className="text-[10px] opacity-80 mt-0.5">{card.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Step 2: Budget */}
        {step === 2 && (
          <div className="space-y-6">
            {[
              {
                key: "tee",
                label: "T-Shirts",
                opts: [
                  { v: "value" as BudgetTier, l: "Under $50" },
                  { v: "mid" as BudgetTier, l: "$50–100" },
                  { v: "premium" as BudgetTier, l: "$100+" },
                ],
              },
              {
                key: "knit",
                label: "Sweaters",
                opts: [
                  { v: "value" as BudgetTier, l: "Under $150" },
                  { v: "mid" as BudgetTier, l: "$150–300" },
                  { v: "premium" as BudgetTier, l: "$300+" },
                ],
              },
              {
                key: "outerwear",
                label: "Jackets",
                opts: [
                  { v: "value" as BudgetTier, l: "Under $300" },
                  { v: "mid" as BudgetTier, l: "$300–600" },
                  { v: "premium" as BudgetTier, l: "$600+" },
                ],
              },
            ].map((cat) => (
              <div key={cat.key}>
                <p className="text-xs text-ink-secondary uppercase tracking-[1px] mb-2">
                  {cat.label}
                </p>
                <div className="flex gap-2">
                  {cat.opts.map((opt) => (
                    <button
                      key={opt.v}
                      onClick={() =>
                        setBudgets((prev) => ({ ...prev, [cat.key]: opt.v }))
                      }
                      className={`flex-1 py-2.5 px-1.5 text-center border rounded-sm text-[11px] transition-all ${
                        budgets[cat.key] === opt.v
                          ? "bg-ink text-white border-ink"
                          : "border-border bg-bg-card text-ink-secondary hover:border-ink-secondary"
                      }`}
                    >
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Step 3: Intent */}
        {step === 3 && (
          <div className="grid grid-cols-2 gap-2.5">
            {INTENT_OPTIONS.map((opt) => {
              const selected = selectedIntents.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  onClick={() => {
                    setSelectedIntents((prev) =>
                      prev.includes(opt.id)
                        ? prev.filter((i) => i !== opt.id)
                        : [...prev, opt.id]
                    );
                  }}
                  className={`flex items-center gap-2.5 p-4 border rounded-sm transition-all ${
                    selected
                      ? "bg-ink border-ink text-white"
                      : "border-border bg-bg-card text-ink hover:border-ink-secondary"
                  }`}
                >
                  <span className="text-lg">{opt.icon}</span>
                  <span className="text-xs tracking-wider">{opt.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Step 4: Sizes */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <p className="text-xs text-ink-secondary uppercase tracking-[1px] mb-2.5">
                Top Size
              </p>
              <div className="flex gap-2 flex-wrap">
                {(["XS", "S", "M", "L", "XL", "XXL"] as SizeTop[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSizeTop(s)}
                    className={`py-2 px-3.5 border rounded-sm text-xs min-w-[44px] text-center transition-all ${
                      sizeTop === s
                        ? "bg-ink text-white border-ink"
                        : "border-border bg-bg-card text-ink-secondary hover:border-ink-secondary"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-ink-secondary uppercase tracking-[1px] mb-2.5">
                Bottom Waist
              </p>
              <div className="flex gap-2 flex-wrap">
                {[28, 30, 32, 34, 36, 38, 40].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSizeWaist(s)}
                    className={`py-2 px-3.5 border rounded-sm text-xs min-w-[44px] text-center transition-all ${
                      sizeWaist === s
                        ? "bg-ink text-white border-ink"
                        : "border-border bg-bg-card text-ink-secondary hover:border-ink-secondary"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-ink-secondary uppercase tracking-[1px] mb-2.5">
                Bottom Inseam
              </p>
              <div className="flex gap-2 flex-wrap">
                {[28, 30, 32, 34].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSizeInseam(s)}
                    className={`py-2 px-3.5 border rounded-sm text-xs min-w-[44px] text-center transition-all ${
                      sizeInseam === s
                        ? "bg-ink text-white border-ink"
                        : "border-border bg-bg-card text-ink-secondary hover:border-ink-secondary"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-ink-secondary uppercase tracking-[1px] mb-2.5">
                Shoe Size
              </p>
              <div className="flex gap-2 flex-wrap">
                {[7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 13, 14, 15].map(
                  (s) => (
                    <button
                      key={s}
                      onClick={() => setSizeShoe(s)}
                      className={`py-2 px-3.5 border rounded-sm text-xs min-w-[44px] text-center transition-all ${
                        sizeShoe === s
                          ? "bg-ink text-white border-ink"
                          : "border-border bg-bg-card text-ink-secondary hover:border-ink-secondary"
                      }`}
                    >
                      {s}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 max-w-[430px] w-full px-6 pb-7 pt-4 bg-gradient-to-t from-bg via-bg to-transparent z-10">
        <button
          onClick={advance}
          disabled={!canContinue || saving}
          className="w-full py-4 bg-ink text-white text-[13px] font-medium tracking-[1.5px] uppercase rounded-sm hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {saving ? "Setting up your feed..." : step < 4 ? "Continue" : "Build My Feed"}
        </button>
        <p className="text-center text-[11px] text-ink-muted mt-2">
          {hints[step]}
        </p>
      </div>
    </div>
  );
}
