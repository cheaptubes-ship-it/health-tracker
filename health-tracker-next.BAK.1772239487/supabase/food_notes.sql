-- Food entries: optional notes/ingredients

alter table if exists public.food_entries
  add column if not exists note text;
