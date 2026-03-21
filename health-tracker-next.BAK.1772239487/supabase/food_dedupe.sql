-- Food entries: dedupe protection
-- Prevent accidental double-submits by rejecting identical rows inserted within a short window.

create or replace function public.prevent_recent_duplicate_food_entries()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1
    from public.food_entries e
    where e.user_id = new.user_id
      and e.entry_date = new.entry_date
      and e.name = new.name
      and e.calories = new.calories
      and e.protein_g = new.protein_g
      and e.carbs_g = new.carbs_g
      and e.fat_g = new.fat_g
      and e.source = new.source
      and e.created_at >= now() - interval '10 seconds'
  ) then
    raise exception 'Duplicate food entry (recent)';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prevent_recent_duplicate_food_entries on public.food_entries;
create trigger trg_prevent_recent_duplicate_food_entries
before insert on public.food_entries
for each row
execute function public.prevent_recent_duplicate_food_entries();
