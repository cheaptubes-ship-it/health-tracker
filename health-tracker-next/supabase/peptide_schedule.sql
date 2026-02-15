-- Peptide schedules (protocol) + active/paused toggle
-- Run in Supabase SQL editor.

create table if not exists public.peptide_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  normalized_name text not null,
  display_name text,

  dose_value numeric,
  dose_unit text not null default 'u', -- u|mcg|mg

  -- Simple timing buckets to start; can extend to exact time-of-day later.
  timing text not null default 'am' check (timing in ('am','pm','bedtime')),

  -- 0=Sun .. 6=Sat
  days_of_week int[] not null default '{0,1,2,3,4,5,6}',

  active boolean not null default true,

  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists peptide_schedules_user_active_idx
  on public.peptide_schedules (user_id, active);

alter table public.peptide_schedules enable row level security;

drop policy if exists "peptide_schedules_select_own" on public.peptide_schedules;
create policy "peptide_schedules_select_own"
  on public.peptide_schedules for select
  using (auth.uid() = user_id);

drop policy if exists "peptide_schedules_insert_own" on public.peptide_schedules;
create policy "peptide_schedules_insert_own"
  on public.peptide_schedules for insert
  with check (auth.uid() = user_id);

drop policy if exists "peptide_schedules_update_own" on public.peptide_schedules;
create policy "peptide_schedules_update_own"
  on public.peptide_schedules for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "peptide_schedules_delete_own" on public.peptide_schedules;
create policy "peptide_schedules_delete_own"
  on public.peptide_schedules for delete
  using (auth.uid() = user_id);
