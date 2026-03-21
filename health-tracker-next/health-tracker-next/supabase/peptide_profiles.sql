-- Peptide profiles: store vial + recon defaults per peptide for autofill + unit conversions.
-- Run in Supabase SQL editor.

create table if not exists public.peptide_profiles (
  user_id uuid not null references auth.users(id) on delete cascade,
  normalized_name text not null,
  display_name text,

  vial_amount numeric not null,
  vial_unit text not null default 'mg' check (vial_unit in ('mg','mcg')),
  recon_volume_ml numeric not null,

  default_note text,
  updated_at timestamptz not null default now(),

  primary key (user_id, normalized_name)
);

alter table public.peptide_profiles enable row level security;

drop policy if exists "peptide_profiles_select_own" on public.peptide_profiles;
create policy "peptide_profiles_select_own"
  on public.peptide_profiles for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "peptide_profiles_insert_own" on public.peptide_profiles;
create policy "peptide_profiles_insert_own"
  on public.peptide_profiles for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "peptide_profiles_update_own" on public.peptide_profiles;
create policy "peptide_profiles_update_own"
  on public.peptide_profiles for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "peptide_profiles_delete_own" on public.peptide_profiles;
create policy "peptide_profiles_delete_own"
  on public.peptide_profiles for delete
  to authenticated
  using (auth.uid() = user_id);
