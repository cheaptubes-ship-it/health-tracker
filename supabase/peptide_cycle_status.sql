-- Peptide cycle state tracking
create table if not exists public.peptide_cycle_status (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('on_cycle','off_cycle')),
  off_cycle_start date,
  off_cycle_end date,
  updated_at timestamptz not null default now()
);

alter table public.peptide_cycle_status enable row level security;

drop policy if exists "peptide_cycle_status_select_own" on public.peptide_cycle_status;
create policy "peptide_cycle_status_select_own" on public.peptide_cycle_status for select to authenticated using (auth.uid() = user_id);

drop policy if exists "peptide_cycle_status_insert_own" on public.peptide_cycle_status;
create policy "peptide_cycle_status_insert_own" on public.peptide_cycle_status for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "peptide_cycle_status_update_own" on public.peptide_cycle_status;
create policy "peptide_cycle_status_update_own" on public.peptide_cycle_status for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "peptide_cycle_status_delete_own" on public.peptide_cycle_status;
create policy "peptide_cycle_status_delete_own" on public.peptide_cycle_status for delete to authenticated using (auth.uid() = user_id);
