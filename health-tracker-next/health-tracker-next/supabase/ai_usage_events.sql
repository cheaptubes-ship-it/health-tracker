-- AI usage events (counts + optional token metadata)
-- Run in Supabase SQL editor.

create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  kind text not null check (kind in ('food_photo_estimate','weight_insight')),
  model text,

  created_at timestamptz not null default now()
);

create index if not exists ai_usage_events_user_created_idx
  on public.ai_usage_events (user_id, created_at desc);

alter table public.ai_usage_events enable row level security;

drop policy if exists "ai_usage_events_select_own" on public.ai_usage_events;
create policy "ai_usage_events_select_own"
  on public.ai_usage_events for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "ai_usage_events_insert_own" on public.ai_usage_events;
create policy "ai_usage_events_insert_own"
  on public.ai_usage_events for insert
  to authenticated
  with check (auth.uid() = user_id);
