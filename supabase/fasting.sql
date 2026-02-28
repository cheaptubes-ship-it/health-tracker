-- Fasting / eating windows (manual)
-- Run in Supabase SQL editor.

create table if not exists public.fasting_windows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,

  fast_start_at timestamptz,
  fast_end_at timestamptz,
  note text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_id, entry_date)
);

create index if not exists fasting_windows_user_date_idx
  on public.fasting_windows (user_id, entry_date);

alter table public.fasting_windows enable row level security;

drop policy if exists "fasting_windows_select_own" on public.fasting_windows;
create policy "fasting_windows_select_own"
  on public.fasting_windows for select
  using (auth.uid() = user_id);

drop policy if exists "fasting_windows_insert_own" on public.fasting_windows;
create policy "fasting_windows_insert_own"
  on public.fasting_windows for insert
  with check (auth.uid() = user_id);

drop policy if exists "fasting_windows_update_own" on public.fasting_windows;
create policy "fasting_windows_update_own"
  on public.fasting_windows for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "fasting_windows_delete_own" on public.fasting_windows;
create policy "fasting_windows_delete_own"
  on public.fasting_windows for delete
  using (auth.uid() = user_id);
