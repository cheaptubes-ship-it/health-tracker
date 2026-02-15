-- Hydration + Electrolytes
-- Run in Supabase SQL editor.

-- 1) Hydration entries (daily logging)
create table if not exists public.hydration_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null default (now() at time zone 'utc')::date,
  name text not null,

  water_ml numeric,
  sodium_mg numeric,
  potassium_mg numeric,
  magnesium_mg numeric,
  caffeine_mg numeric,
  sugar_g numeric,
  lemon_juice boolean not null default false,

  notes text,
  created_at timestamptz not null default now()
);

create index if not exists hydration_entries_user_date_idx
  on public.hydration_entries (user_id, entry_date, created_at desc);

alter table public.hydration_entries enable row level security;

-- If hydration_entries already exists (most likely), add the new column safely:
-- alter table public.hydration_entries add column if not exists lemon_juice boolean not null default false;

drop policy if exists "hydration_entries_select_own" on public.hydration_entries;
create policy "hydration_entries_select_own"
  on public.hydration_entries for select
  using (auth.uid() = user_id);

drop policy if exists "hydration_entries_insert_own" on public.hydration_entries;
create policy "hydration_entries_insert_own"
  on public.hydration_entries for insert
  with check (auth.uid() = user_id);

drop policy if exists "hydration_entries_update_own" on public.hydration_entries;
create policy "hydration_entries_update_own"
  on public.hydration_entries for update
  using (auth.uid() = user_id);

drop policy if exists "hydration_entries_delete_own" on public.hydration_entries;
create policy "hydration_entries_delete_own"
  on public.hydration_entries for delete
  using (auth.uid() = user_id);


-- 2) Hydration targets (per-user)
create table if not exists public.hydration_targets (
  user_id uuid primary key references auth.users(id) on delete cascade,

  unit_pref text not null default 'oz' check (unit_pref in ('oz','ml')),

  water_ml numeric,
  sodium_mg numeric,
  potassium_mg numeric,
  magnesium_mg numeric,

  updated_at timestamptz not null default now()
);

alter table public.hydration_targets enable row level security;

drop policy if exists "hydration_targets_select_own" on public.hydration_targets;
create policy "hydration_targets_select_own"
  on public.hydration_targets for select
  using (auth.uid() = user_id);

drop policy if exists "hydration_targets_insert_own" on public.hydration_targets;
create policy "hydration_targets_insert_own"
  on public.hydration_targets for insert
  with check (auth.uid() = user_id);

drop policy if exists "hydration_targets_update_own" on public.hydration_targets;
create policy "hydration_targets_update_own"
  on public.hydration_targets for update
  using (auth.uid() = user_id);

drop policy if exists "hydration_targets_delete_own" on public.hydration_targets;
create policy "hydration_targets_delete_own"
  on public.hydration_targets for delete
  using (auth.uid() = user_id);
