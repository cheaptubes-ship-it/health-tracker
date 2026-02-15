-- Sleep tracking (manual logging)
-- Run in Supabase SQL editor.

create table if not exists public.sleep_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null default (now() at time zone 'utc')::date,
  sleep_start_at timestamptz,
  sleep_end_at timestamptz,
  quality int,
  note text,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sleep_entries_user_date_idx
  on public.sleep_entries (user_id, entry_date, created_at desc);

alter table public.sleep_entries enable row level security;

drop policy if exists "sleep_entries_select_own" on public.sleep_entries;
create policy "sleep_entries_select_own"
  on public.sleep_entries for select
  using (auth.uid() = user_id);

drop policy if exists "sleep_entries_insert_own" on public.sleep_entries;
create policy "sleep_entries_insert_own"
  on public.sleep_entries for insert
  with check (auth.uid() = user_id);

drop policy if exists "sleep_entries_update_own" on public.sleep_entries;
create policy "sleep_entries_update_own"
  on public.sleep_entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "sleep_entries_delete_own" on public.sleep_entries;
create policy "sleep_entries_delete_own"
  on public.sleep_entries for delete
  using (auth.uid() = user_id);
