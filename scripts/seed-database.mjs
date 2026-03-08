/**
 * Seed Script — run with: node scripts/seed-database.mjs
 * 
 * Seeds 40 brands, 22 adjacency edges, 1 merchant, and ~1,500 items.
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { config } from "dotenv";

config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ─── 40 BRANDS (from spec §8) ───────────────────────────────────────────────

const BRANDS = [
  { name: "Acne Studios", tier: "lux", tags: ["minimal","editorial","European","tailored"], domain: "acnestudios.com" },
  { name: "Our Legacy", tier: "lux", tags: ["minimal","editorial","Scandinavian"], domain: "ourlegacy.com" },
  { name: "Common Projects", tier: "lux", tags: ["minimal","luxury","clean"], domain: "commonprojects.com" },
  { name: "Maison Margiela", tier: "lux", tags: ["avant-garde","deconstructed","editorial"], domain: "maisonmargiela.com" },
  { name: "Lemaire", tier: "lux", tags: ["minimal","structured","French"], domain: "lemaire.fr" },
  { name: "Auralee", tier: "lux", tags: ["minimal","Japanese","refined"], domain: "auralee.jp" },
  { name: "Jil Sander", tier: "lux", tags: ["minimal","German","tailored"], domain: "jilsander.com" },
  { name: "Jacquemus", tier: "lux", tags: ["French","editorial","minimal"], domain: "jacquemus.com" },
  { name: "Norse Projects", tier: "premium", tags: ["minimal","Scandinavian","outdoor","casual"], domain: "norseprojects.com" },
  { name: "A.P.C.", tier: "premium", tags: ["minimal","French","casual","tailored"], domain: "apc.fr" },
  { name: "Reigning Champ", tier: "premium", tags: ["athletic","minimal","casual"], domain: "reigningchamp.com" },
  { name: "Saturdays NYC", tier: "premium", tags: ["surf","casual","coastal","minimal"], domain: "saturdaysnyc.com" },
  { name: "Entireworld", tier: "premium", tags: ["colorful","casual","basics"], domain: "theentireworld.com" },
  { name: "Stone Island", tier: "premium", tags: ["technical","streetwear","Italian"], domain: "stoneisland.com" },
  { name: "Margaret Howell", tier: "premium", tags: ["British","minimal","workwear"], domain: "margarethowell.co.uk" },
  { name: "Officine Générale", tier: "premium", tags: ["French","tailored","casual"], domain: "officinegenerale.com" },
  { name: "Barbour", tier: "premium", tags: ["British","outdoor","heritage"], domain: "barbour.com" },
  { name: "Aimé Leon Dore", tier: "premium", tags: ["streetwear","editorial","New York"], domain: "aimeleondore.com" },
  { name: "Sunspel", tier: "premium", tags: ["British","basics","luxury"], domain: "sunspel.com" },
  { name: "Beams Plus", tier: "premium", tags: ["Japanese","heritage","Americana"], domain: "beams.co.jp" },
  { name: "Engineered Garments", tier: "premium", tags: ["Japanese","workwear","avant-garde"], domain: "engineeredgarments.com" },
  { name: "OrSlow", tier: "premium", tags: ["Japanese","denim","heritage"], domain: "orslow.jp" },
  { name: "Club Monaco", tier: "mid", tags: ["classic","tailored","versatile"], domain: "clubmonaco.com" },
  { name: "J.Crew", tier: "mid", tags: ["classic","preppy","casual"], domain: "jcrew.com" },
  { name: "Buck Mason", tier: "mid", tags: ["American","casual","basics"], domain: "buckmason.com" },
  { name: "Taylor Stitch", tier: "mid", tags: ["workwear","sustainable","outdoor"], domain: "taylorstitch.com" },
  { name: "Todd Snyder", tier: "mid", tags: ["American","tailored","streetwear"], domain: "toddsnyder.com" },
  { name: "Madewell", tier: "mid", tags: ["casual","denim","basics"], domain: "madewell.com" },
  { name: "Corridor", tier: "mid", tags: ["colorful","casual","Brooklyn"], domain: "corridornyc.com" },
  { name: "Alex Mill", tier: "mid", tags: ["minimal","casual","basics"], domain: "alexmill.com" },
  { name: "Carhartt WIP", tier: "mid", tags: ["workwear","streetwear","casual"], domain: "carhartt-wip.com" },
  { name: "Stüssy", tier: "mid", tags: ["streetwear","surf","casual"], domain: "stussy.com" },
  { name: "Rowing Blazers", tier: "mid", tags: ["preppy","colorful","heritage"], domain: "rowingblazers.com" },
  { name: "Knickerbocker", tier: "mid", tags: ["American","vintage","casual"], domain: "knickerbockermfg.com" },
  { name: "Uniqlo", tier: "value", tags: ["minimal","basics","Japanese"], domain: "uniqlo.com" },
  { name: "H&M", tier: "value", tags: ["trendy","basics","fast-fashion"], domain: "hm.com" },
  { name: "Everlane", tier: "value", tags: ["minimal","sustainable","basics"], domain: "everlane.com" },
  { name: "COS", tier: "value", tags: ["minimal","Scandinavian","modern"], domain: "cos.com" },
  { name: "Arket", tier: "value", tags: ["minimal","Scandinavian","quality"], domain: "arket.com" },
  { name: "Abercrombie", tier: "value", tags: ["classic","casual","updated"], domain: "abercrombie.com" },
];

// ─── BRAND ADJACENCY EDGES (from spec §8) ───────────────────────────────────

const EDGES = [
  ["Acne Studios", "Our Legacy", 0.85],
  ["Norse Projects", "A.P.C.", 0.80],
  ["Common Projects", "A.P.C.", 0.80],
  ["Carhartt WIP", "Norse Projects", 0.75],
  ["Saturdays NYC", "Entireworld", 0.70],
  ["Buck Mason", "Taylor Stitch", 0.85],
  ["Lemaire", "Acne Studios", 0.75],
  ["Reigning Champ", "Carhartt WIP", 0.70],
  ["Club Monaco", "J.Crew", 0.65],
  ["Aimé Leon Dore", "Stüssy", 0.75],
  ["Beams Plus", "Engineered Garments", 0.80],
  ["Engineered Garments", "OrSlow", 0.75],
  ["Maison Margiela", "Jil Sander", 0.70],
  ["Jacquemus", "Lemaire", 0.72],
  ["Sunspel", "Margaret Howell", 0.68],
  ["Todd Snyder", "Club Monaco", 0.72],
  ["COS", "Uniqlo", 0.78],
  ["Arket", "COS", 0.82],
  ["Corridor", "Rowing Blazers", 0.65],
  ["Auralee", "Jil Sander", 0.78],
  ["Barbour", "Taylor Stitch", 0.60],
  ["Stone Island", "Carhartt WIP", 0.68],
];

// ─── ITEM GENERATION ────────────────────────────────────────────────────────

const CATEGORIES = ["tee","knit","outerwear","pants","shorts","shoes","accessories"];

const ITEM_TEMPLATES = {
  tee: [
    "Essential Crew Tee", "Relaxed Pocket Tee", "Heavyweight Boxy Tee",
    "Pima Cotton V-Neck", "Slub Jersey Tee", "Classic Stripe Tee",
    "Washed Crew Neck", "Garment-Dyed Tee", "Logo Tee", "Raglan Tee"
  ],
  knit: [
    "Merino Crew Sweater", "Cashmere Half-Zip", "Cotton Cardigan",
    "Fisherman Rib Knit", "Lambswool Rollneck", "Waffle Knit Henley",
    "Mohair Blend Sweater", "Cable Knit Pullover", "Zip Mock Neck"
  ],
  outerwear: [
    "Waxed Canvas Jacket", "Quilted Liner Jacket", "Wool Overcoat",
    "Chore Coat", "MA-1 Bomber", "Field Jacket", "Denim Trucker",
    "Packable Down Vest", "Harrington Jacket", "Shearling Collar Coat"
  ],
  pants: [
    "Slim Chino", "Relaxed Straight Jean", "Wide-Leg Trouser",
    "Fatigue Pant", "Pleated Wool Pant", "Drawstring Easy Pant",
    "Selvedge Denim", "Cargo Pant", "Corduroy Five-Pocket"
  ],
  shorts: [
    "7\" Chino Short", "Swim Trunk", "Pleated Short",
    "Camp Short", "Trail Short", "Knit Sweatshort"
  ],
  shoes: [
    "Leather Low-Top Sneaker", "Suede Chelsea Boot", "Canvas Slip-On",
    "Penny Loafer", "Desert Boot", "Running Sneaker", "Derby Shoe",
    "Moccasin", "Trail Runner"
  ],
  accessories: [
    "Leather Belt", "Merino Beanie", "Canvas Tote",
    "Wool Scarf", "Baseball Cap", "Leather Card Case",
    "Woven Bracelet", "Sunglasses"
  ]
};

const PRICE_RANGES = {
  value:   { tee: [22,55],  knit: [40,120], outerwear: [70,200], pants: [35,100], shorts: [25,65], shoes: [45,120], accessories: [12,45] },
  mid:     { tee: [45,110], knit: [95,280], outerwear: [160,450], pants: [75,200], shorts: [55,130], shoes: [95,260], accessories: [28,100] },
  premium: { tee: [75,180], knit: [180,420], outerwear: [320,750], pants: [150,360], shorts: [95,230], shoes: [195,480], accessories: [55,200] },
  lux:     { tee: [110,300], knit: [320,800], outerwear: [580,1500], pants: [280,720], shorts: [180,450], shoes: [380,950], accessories: [90,400] },
};

const SIZE_SETS = {
  tee:        ["XS","S","M","L","XL","XXL"],
  knit:       ["XS","S","M","L","XL"],
  outerwear:  ["S","M","L","XL"],
  pants:      ["28","30","32","34","36","38"],
  shorts:     ["S","M","L","XL"],
  shoes:      ["8","8.5","9","9.5","10","10.5","11","11.5","12","13"],
  accessories:["ONE SIZE"],
};

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomPrice(range) {
  return Math.round(range[0] + Math.random() * (range[1] - range[0]));
}

function randomSizes(category) {
  const all = SIZE_SETS[category] || ["S","M","L"];
  // Remove 1-2 random sizes to simulate real availability
  const available = [...all];
  const removals = Math.floor(Math.random() * 2);
  for (let i = 0; i < removals; i++) {
    const idx = Math.floor(Math.random() * available.length);
    available.splice(idx, 1);
  }
  return available;
}

// ─── MAIN SEED FUNCTION ─────────────────────────────────────────────────────

async function seed() {
  console.log("🌱 Seeding Aesthetic database...\n");

  // 1. Insert brands
  console.log("→ Inserting 40 brands...");
  const brandRows = BRANDS.map(b => ({
    id: randomUUID(),
    name: b.name,
    tier: b.tier,
    tags: JSON.stringify(b.tags),
    logo_url: null, // Add real logos later
    base_domain: b.domain,
  }));

  const { error: brandErr } = await supabase
    .from("brands")
    .upsert(brandRows, { onConflict: "name" });
  if (brandErr) throw new Error(`Brand insert failed: ${brandErr.message}`);

  // Fetch brands back to get IDs
  const { data: brands } = await supabase.from("brands").select("id, name");
  const brandByName = Object.fromEntries(brands.map(b => [b.name, b.id]));
  console.log(`  ✓ ${brands.length} brands inserted\n`);

  // 2. Insert brand edges
  console.log("→ Inserting adjacency edges...");
  const edgeRows = EDGES.map(([a, b, w]) => ({
    brand_a_id: brandByName[a],
    brand_b_id: brandByName[b],
    weight: w,
    source: "manual",
  })).filter(e => e.brand_a_id && e.brand_b_id);

  const { error: edgeErr } = await supabase
    .from("brand_edges")
    .upsert(edgeRows, { onConflict: "brand_a_id,brand_b_id" });
  if (edgeErr) throw new Error(`Edge insert failed: ${edgeErr.message}`);
  console.log(`  ✓ ${edgeRows.length} edges inserted\n`);

  // 3. Insert a default merchant
  console.log("→ Inserting default merchant...");
  const merchantId = randomUUID();
  const { error: merchantErr } = await supabase
    .from("merchants")
    .insert({
      id: merchantId,
      name: "Impact Network",
      affiliate_network: "impact",
      program_id: process.env.IMPACT_PROGRAM_ID || "default",
      base_domain: "impact.com",
    });
  if (merchantErr && !merchantErr.message.includes("duplicate")) {
    throw new Error(`Merchant insert failed: ${merchantErr.message}`);
  }
  console.log(`  ✓ Merchant inserted\n`);

  // 4. Generate and insert items (~35-40 per brand = ~1,500 total)
  console.log("→ Generating items...");
  const allItems = [];

  for (const brand of brands) {
    const brandData = BRANDS.find(b => b.name === brand.name);
    if (!brandData) continue;

    // Each brand gets items across most categories
    const numCategories = 4 + Math.floor(Math.random() * 4); // 4-7 categories
    const shuffledCats = [...CATEGORIES].sort(() => Math.random() - 0.5).slice(0, numCategories);

    for (const cat of shuffledCats) {
      const templates = ITEM_TEMPLATES[cat];
      const numItems = 3 + Math.floor(Math.random() * 5); // 3-7 items per category

      for (let i = 0; i < numItems; i++) {
        const title = randomFrom(templates);
        const range = PRICE_RANGES[brandData.tier][cat];
        const listPrice = randomPrice(range);
        const onSale = Math.random() < 0.22;
        const currentPrice = onSale
          ? Math.round(listPrice * (0.55 + Math.random() * 0.30))
          : listPrice;

        allItems.push({
          id: randomUUID(),
          brand_id: brand.id,
          title,
          category: cat,
          image_url: `https://images.unsplash.com/photo-placeholder?w=500&h=600&fit=crop`, // Replace with real images
          product_url: `https://${brandData.domain}/products/${title.toLowerCase().replace(/\s+/g, "-")}`,
          affiliate_url: null, // Generated at runtime
          list_price: listPrice,
          current_price: currentPrice,
          currency: "USD",
          sizes_available: JSON.stringify(randomSizes(cat)),
          merchant_id: merchantId,
          last_seen_at: new Date().toISOString(),
        });
      }
    }
  }

  // Batch insert items (Supabase limit ~1000 per request)
  console.log(`→ Inserting ${allItems.length} items...`);
  const BATCH_SIZE = 500;
  for (let i = 0; i < allItems.length; i += BATCH_SIZE) {
    const batch = allItems.slice(i, i + BATCH_SIZE);
    const { error: itemErr } = await supabase.from("items").insert(batch);
    if (itemErr) throw new Error(`Item insert failed at batch ${i}: ${itemErr.message}`);
    console.log(`  ✓ Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} items`);
  }

  // 5. Insert initial price history snapshots
  console.log("\n→ Creating initial price history...");
  const priceRows = allItems.map(item => ({
    id: randomUUID(),
    item_id: item.id,
    seen_at: new Date().toISOString(),
    price: item.current_price,
  }));

  for (let i = 0; i < priceRows.length; i += BATCH_SIZE) {
    const batch = priceRows.slice(i, i + BATCH_SIZE);
    const { error: priceErr } = await supabase.from("price_history").insert(batch);
    if (priceErr) throw new Error(`Price history insert failed: ${priceErr.message}`);
  }
  console.log(`  ✓ ${priceRows.length} price snapshots\n`);

  console.log("═══════════════════════════════════════════");
  console.log(`✅ Seed complete!`);
  console.log(`   ${brands.length} brands`);
  console.log(`   ${edgeRows.length} adjacency edges`);
  console.log(`   ${allItems.length} items`);
  console.log(`   ${priceRows.length} price snapshots`);
  console.log("═══════════════════════════════════════════");
}

seed().catch(err => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
