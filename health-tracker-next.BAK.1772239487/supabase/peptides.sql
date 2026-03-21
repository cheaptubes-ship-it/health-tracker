-- Peptides: per-entry note + per-peptide default notes (normalized)

-- 1) Add per-entry note + side effects
alter table if exists public.peptide_entries
  add column if not exists note text;

alter table if exists public.peptide_entries
  add column if not exists side_effect_tags text[];

alter table if exists public.peptide_entries
  add column if not exists side_effect_note text;

-- 2) Defaults table
create table if not exists public.peptide_defaults (
  user_id uuid not null references auth.users(id) on delete cascade,
  normalized_name text not null,
  display_name text,
  default_note text,
  updated_at timestamptz not null default now(),
  primary key (user_id, normalized_name)
);

alter table public.peptide_defaults enable row level security;

-- Read own defaults
drop policy if exists "peptide_defaults_select_own" on public.peptide_defaults;
create policy "peptide_defaults_select_own"
  on public.peptide_defaults
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Insert own defaults
drop policy if exists "peptide_defaults_insert_own" on public.peptide_defaults;
create policy "peptide_defaults_insert_own"
  on public.peptide_defaults
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Update own defaults
drop policy if exists "peptide_defaults_update_own" on public.peptide_defaults;
create policy "peptide_defaults_update_own"
  on public.peptide_defaults
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Delete own defaults
drop policy if exists "peptide_defaults_delete_own" on public.peptide_defaults;
create policy "peptide_defaults_delete_own"
  on public.peptide_defaults
  for delete
  to authenticated
  using (auth.uid() = user_id);
