-- ═══════════════════════════════════════════════════════════════════════════
-- AESTHETIC — Complete Database Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL → New Query)
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── EXTENSIONS ──────────────────────────────────────────────────────────────

create extension if not exists "uuid-ossp";

-- ─── ENUMS ───────────────────────────────────────────────────────────────────

create type size_top_enum as enum ('XS', 'S', 'M', 'L', 'XL', 'XXL');
create type budget_tier_enum as enum ('value', 'mid', 'premium', 'lux');
create type fit_pref_enum as enum ('slim', 'regular', 'relaxed');
create type brand_tier_enum as enum ('value', 'mid', 'premium', 'lux');
create type item_category_enum as enum (
  'tee', 'knit', 'outerwear', 'pants', 'shorts', 'shoes', 'accessories'
);
create type affiliate_network_enum as enum ('impact', 'awin', 'cj', 'direct');
create type affinity_source_enum as enum ('onboarding', 'click', 'purchase', 'save');
create type edge_source_enum as enum ('manual', 'cooccurrence', 'clicks', 'purchases');
create type event_type_enum as enum (
  'view_item', 'save_item', 'click_out', 'purchase_confirm', 'dismiss'
);

-- ─── TABLES ──────────────────────────────────────────────────────────────────

-- user_profile (extends Supabase auth.users)
create table user_profile (
  user_id uuid primary key references auth.users(id) on delete cascade,
  size_top size_top_enum,
  size_bottom_waist int check (size_bottom_waist between 28 and 40),
  size_bottom_inseam int check (size_bottom_inseam in (28, 30, 32, 34)),
  size_shoe float check (size_shoe between 7 and 15),
  budget_tier budget_tier_enum not null default 'mid',
  fit_pref fit_pref_enum,
  palette_pref text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- brands
create table brands (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  tier brand_tier_enum not null,
  tags jsonb default '[]',
  logo_url text,
  base_domain text
);

-- brand_edges (adjacency graph)
create table brand_edges (
  brand_a_id uuid not null references brands(id) on delete cascade,
  brand_b_id uuid not null references brands(id) on delete cascade,
  weight float not null check (weight between 0 and 1),
  source edge_source_enum not null default 'manual',
  updated_at timestamptz default now(),
  primary key (brand_a_id, brand_b_id)
);

-- merchants
create table merchants (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  affiliate_network affiliate_network_enum not null,
  program_id text,
  base_domain text
);

-- items
create table items (
  id uuid primary key default uuid_generate_v4(),
  brand_id uuid not null references brands(id) on delete cascade,
  title text not null,
  category item_category_enum not null,
  image_url text not null,
  product_url text not null,
  affiliate_url text,
  list_price numeric not null check (list_price > 0),
  current_price numeric not null check (current_price > 0),
  currency text not null default 'USD',
  sizes_available jsonb default '[]',
  merchant_id uuid references merchants(id),
  last_seen_at timestamptz default now()
);

-- price_history
create table price_history (
  id uuid primary key default uuid_generate_v4(),
  item_id uuid not null references items(id) on delete cascade,
  seen_at timestamptz not null default now(),
  price numeric not null check (price > 0)
);

-- user_brand_affinity
create table user_brand_affinity (
  user_id uuid not null references auth.users(id) on delete cascade,
  brand_id uuid not null references brands(id) on delete cascade,
  weight float not null check (weight between 0 and 1),
  source affinity_source_enum not null default 'onboarding',
  primary key (user_id, brand_id, source)
);

-- events
create table events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ts timestamptz not null default now(),
  event_type event_type_enum not null,
  item_id uuid references items(id),
  brand_id uuid references brands(id),
  meta jsonb default '{}'
);

-- wishlists
create table wishlists (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid not null references items(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, item_id)
);

-- intent
create table intent (
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  weight float not null check (weight between 0 and 1),
  updated_at timestamptz default now(),
  primary key (user_id, category)
);

-- ─── INDEXES ─────────────────────────────────────────────────────────────────

create index idx_items_brand on items(brand_id);
create index idx_items_category on items(category);
create index idx_items_price on items(current_price);
create index idx_items_last_seen on items(last_seen_at);
create index idx_price_history_item on price_history(item_id, seen_at desc);
create index idx_events_user on events(user_id, ts desc);
create index idx_events_type on events(event_type);
create index idx_affinity_user on user_brand_affinity(user_id);
create index idx_wishlist_user on wishlists(user_id);
create index idx_brand_edges_a on brand_edges(brand_a_id);
create index idx_brand_edges_b on brand_edges(brand_b_id);

-- ─── ROW LEVEL SECURITY ─────────────────────────────────────────────────────

alter table user_profile enable row level security;
alter table user_brand_affinity enable row level security;
alter table wishlists enable row level security;
alter table intent enable row level security;
alter table events enable row level security;

-- Users can only read/write their own profile
create policy "Users own their profile"
  on user_profile for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Users can only read/write their own affinities
create policy "Users own their affinities"
  on user_brand_affinity for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Users can only read/write their own wishlists
create policy "Users own their wishlists"
  on wishlists for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Users can only read/write their own intents
create policy "Users own their intents"
  on intent for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Users can insert their own events, read their own
create policy "Users own their events"
  on events for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Brands, items, merchants, price_history, brand_edges are public read
alter table brands enable row level security;
create policy "Brands are public" on brands for select using (true);

alter table items enable row level security;
create policy "Items are public" on items for select using (true);

alter table merchants enable row level security;
create policy "Merchants are public" on merchants for select using (true);

alter table price_history enable row level security;
create policy "Price history is public" on price_history for select using (true);

alter table brand_edges enable row level security;
create policy "Brand edges are public" on brand_edges for select using (true);

-- ─── UPDATED_AT TRIGGER ─────────────────────────────────────────────────────

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger user_profile_updated_at
  before update on user_profile
  for each row execute function update_updated_at();

create trigger brand_edges_updated_at
  before update on brand_edges
  for each row execute function update_updated_at();

create trigger intent_updated_at
  before update on intent
  for each row execute function update_updated_at();
