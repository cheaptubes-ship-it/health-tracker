-- Per-user settings
-- Run in Supabase SQL editor.

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  timezone text,
  training_template_bucket text,
  training_template_path text,
  training_template_sheet text,
  updated_at timestamptz not null default now()
);

-- If user_settings already exists, migrate safely:
-- alter table public.user_settings add column if not exists training_template_bucket text;
-- alter table public.user_settings add column if not exists training_template_path text;
-- alter table public.user_settings add column if not exists training_template_sheet text;

create index if not exists user_settings_user_id_idx on public.user_settings(user_id);

alter table public.user_settings enable row level security;

drop policy if exists "user_settings_select_own" on public.user_settings;
create policy "user_settings_select_own"
  on public.user_settings for select
  using (auth.uid() = user_id);

drop policy if exists "user_settings_insert_own" on public.user_settings;
create policy "user_settings_insert_own"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_settings_update_own" on public.user_settings;
create policy "user_settings_update_own"
  on public.user_settings for update
  using (auth.uid() = user_id);

drop policy if exists "user_settings_delete_own" on public.user_settings;
create policy "user_settings_delete_own"
  on public.user_settings for delete
  using (auth.uid() = user_id);
