-- Peptide schedule change log
-- Run in Supabase SQL editor.

create table if not exists public.peptide_schedule_changes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  schedule_id uuid not null references public.peptide_schedules(id) on delete cascade,

  changed_at timestamptz not null default now(),

  from_dose_value numeric,
  from_dose_unit text,
  to_dose_value numeric,
  to_dose_unit text,

  reason text
);

create index if not exists peptide_schedule_changes_user_changed_idx
  on public.peptide_schedule_changes (user_id, changed_at desc);

alter table public.peptide_schedule_changes enable row level security;

drop policy if exists "peptide_schedule_changes_select_own" on public.peptide_schedule_changes;
create policy "peptide_schedule_changes_select_own"
  on public.peptide_schedule_changes
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "peptide_schedule_changes_insert_own" on public.peptide_schedule_changes;
create policy "peptide_schedule_changes_insert_own"
  on public.peptide_schedule_changes
  for insert
  to authenticated
  with check (auth.uid() = user_id);
