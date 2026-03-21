-- Activity + Shortcuts integration

-- Token table for Shortcuts webhook auth
create table if not exists public.shortcuts_tokens (
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id),
  unique (token)
);

alter table public.shortcuts_tokens enable row level security;

drop policy if exists "shortcuts_tokens_select_own" on public.shortcuts_tokens;
create policy "shortcuts_tokens_select_own"
  on public.shortcuts_tokens
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "shortcuts_tokens_upsert_own" on public.shortcuts_tokens;
create policy "shortcuts_tokens_upsert_own"
  on public.shortcuts_tokens
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "shortcuts_tokens_update_own" on public.shortcuts_tokens;
create policy "shortcuts_tokens_update_own"
  on public.shortcuts_tokens
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Daily steps snapshot
create table if not exists public.steps_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  steps integer not null,
  distance_m numeric,
  active_kcal numeric,
  avg_hr integer,
  source text not null default 'shortcuts',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, entry_date, source)
);

alter table public.steps_entries enable row level security;

drop policy if exists "steps_entries_select_own" on public.steps_entries;
create policy "steps_entries_select_own"
  on public.steps_entries
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "steps_entries_insert_own" on public.steps_entries;
create policy "steps_entries_insert_own"
  on public.steps_entries
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "steps_entries_update_own" on public.steps_entries;
create policy "steps_entries_update_own"
  on public.steps_entries
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Cardio sessions
create table if not exists public.cardio_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz,
  kind text not null, -- walk|bike|elliptical|run|other
  distance_m numeric,
  duration_min numeric,
  avg_hr integer,
  max_hr integer,
  calories_kcal numeric,
  note text,
  source text not null default 'shortcuts',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cardio_entries enable row level security;

drop policy if exists "cardio_entries_select_own" on public.cardio_entries;
create policy "cardio_entries_select_own"
  on public.cardio_entries
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "cardio_entries_insert_own" on public.cardio_entries;
create policy "cardio_entries_insert_own"
  on public.cardio_entries
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "cardio_entries_update_own" on public.cardio_entries;
create policy "cardio_entries_update_own"
  on public.cardio_entries
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
