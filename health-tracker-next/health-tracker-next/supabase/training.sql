-- Training (weights + template-based hypertrophy)

-- Exercise library (per-user for now)
create table if not exists public.exercise_library (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slot_key text, -- e.g. Incline_Push, Quads
  video_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.exercise_library enable row level security;

drop policy if exists "exercise_library_select_own" on public.exercise_library;
create policy "exercise_library_select_own" on public.exercise_library
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "exercise_library_insert_own" on public.exercise_library;
create policy "exercise_library_insert_own" on public.exercise_library
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "exercise_library_update_own" on public.exercise_library;
create policy "exercise_library_update_own" on public.exercise_library
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "exercise_library_delete_own" on public.exercise_library;
create policy "exercise_library_delete_own" on public.exercise_library
  for delete to authenticated
  using (auth.uid() = user_id);

-- Programs (instantiated from a template)
create table if not exists public.training_programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  template_id text not null, -- e.g. "meso1_basic_hypertrophy"
  name text not null,
  status text not null default 'active', -- active|paused|archived
  current_week int not null default 1,
  current_day int not null default 1, -- 1..5
  inserted_deload_weeks int not null default 0,
  deload_override boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- If training_programs already exists, migrate safely:
-- alter table public.training_programs add column if not exists deload_override boolean not null default false;


alter table public.training_programs enable row level security;

drop policy if exists "training_programs_select_own" on public.training_programs;
create policy "training_programs_select_own" on public.training_programs
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "training_programs_insert_own" on public.training_programs;
create policy "training_programs_insert_own" on public.training_programs
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "training_programs_update_own" on public.training_programs;
create policy "training_programs_update_own" on public.training_programs
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "training_programs_delete_own" on public.training_programs;
create policy "training_programs_delete_own" on public.training_programs
  for delete to authenticated
  using (auth.uid() = user_id);

-- User-selected exercises + 10RM inputs for each slot in the template
create table if not exists public.training_program_slots (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.training_programs(id) on delete cascade,
  day_index int not null, -- 1..5
  slot_index int not null, -- order within day
  slot_key text not null, -- e.g. Incline_Push
  slot_label text not null, -- e.g. "Incline Chest"
  exercise_name text, -- chosen exercise display name
  video_url text,
  ten_rm_weight numeric, -- user input
  ten_rm_unit text not null default 'lb', -- lb|kg
  default_sets int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_id, day_index, slot_index)
);

alter table public.training_program_slots enable row level security;

drop policy if exists "training_program_slots_select_own" on public.training_program_slots;
create policy "training_program_slots_select_own" on public.training_program_slots
  for select to authenticated
  using (
    exists (
      select 1 from public.training_programs p
      where p.id = program_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "training_program_slots_insert_own" on public.training_program_slots;
create policy "training_program_slots_insert_own" on public.training_program_slots
  for insert to authenticated
  with check (
    exists (
      select 1 from public.training_programs p
      where p.id = program_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "training_program_slots_update_own" on public.training_program_slots;
create policy "training_program_slots_update_own" on public.training_program_slots
  for update to authenticated
  using (
    exists (
      select 1 from public.training_programs p
      where p.id = program_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.training_programs p
      where p.id = program_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "training_program_slots_delete_own" on public.training_program_slots;
create policy "training_program_slots_delete_own" on public.training_program_slots
  for delete to authenticated
  using (
    exists (
      select 1 from public.training_programs p
      where p.id = program_id and p.user_id = auth.uid()
    )
  );

-- Workout log
create table if not exists public.training_workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  program_id uuid references public.training_programs(id) on delete set null,
  entry_date date not null,
  week_index int,
  day_index int,
  is_deload boolean not null default false,
  deload_mode text, -- half_weight | half_weight_half_volume
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.training_workouts enable row level security;

drop policy if exists "training_workouts_select_own" on public.training_workouts;
create policy "training_workouts_select_own" on public.training_workouts
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "training_workouts_insert_own" on public.training_workouts;
create policy "training_workouts_insert_own" on public.training_workouts
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "training_workouts_update_own" on public.training_workouts;
create policy "training_workouts_update_own" on public.training_workouts
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "training_workouts_delete_own" on public.training_workouts;
create policy "training_workouts_delete_own" on public.training_workouts
  for delete to authenticated
  using (auth.uid() = user_id);

create table if not exists public.training_workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.training_workouts(id) on delete cascade,
  slot_index int not null,
  slot_instance int not null default 1,
  slot_key text,
  exercise_name text not null,
  planned_sets int,
  planned_rep_goal text,
  planned_weight numeric,
  rating int, -- -2..2 (or -1..1 depending)
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workout_id, slot_index, slot_instance)
);

-- If training_workout_exercises already exists, migrate safely:
-- alter table public.training_workout_exercises add column if not exists slot_instance int not null default 1;
-- alter table public.training_workout_exercises drop constraint if exists training_workout_exercises_workout_id_slot_index_key;
-- alter table public.training_workout_exercises add constraint training_workout_exercises_workout_id_slot_index_slot_instance_key unique (workout_id, slot_index, slot_instance);


alter table public.training_workout_exercises enable row level security;

drop policy if exists "training_workout_exercises_select_own" on public.training_workout_exercises;
create policy "training_workout_exercises_select_own" on public.training_workout_exercises
  for select to authenticated
  using (
    exists (
      select 1 from public.training_workouts w
      where w.id = workout_id and w.user_id = auth.uid()
    )
  );

drop policy if exists "training_workout_exercises_insert_own" on public.training_workout_exercises;
create policy "training_workout_exercises_insert_own" on public.training_workout_exercises
  for insert to authenticated
  with check (
    exists (
      select 1 from public.training_workouts w
      where w.id = workout_id and w.user_id = auth.uid()
    )
  );

drop policy if exists "training_workout_exercises_update_own" on public.training_workout_exercises;
create policy "training_workout_exercises_update_own" on public.training_workout_exercises
  for update to authenticated
  using (
    exists (
      select 1 from public.training_workouts w
      where w.id = workout_id and w.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.training_workouts w
      where w.id = workout_id and w.user_id = auth.uid()
    )
  );

drop policy if exists "training_workout_exercises_delete_own" on public.training_workout_exercises;
create policy "training_workout_exercises_delete_own" on public.training_workout_exercises
  for delete to authenticated
  using (
    exists (
      select 1 from public.training_workouts w
      where w.id = workout_id and w.user_id = auth.uid()
    )
  );

create table if not exists public.training_sets (
  id uuid primary key default gen_random_uuid(),
  workout_exercise_id uuid not null references public.training_workout_exercises(id) on delete cascade,
  set_index int not null,
  weight numeric,
  reps int,
  rir int,
  is_warmup boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workout_exercise_id, set_index)
);

alter table public.training_sets enable row level security;

drop policy if exists "training_sets_select_own" on public.training_sets;
create policy "training_sets_select_own" on public.training_sets
  for select to authenticated
  using (
    exists (
      select 1
      from public.training_workout_exercises we
      join public.training_workouts w on w.id = we.workout_id
      where we.id = workout_exercise_id and w.user_id = auth.uid()
    )
  );

drop policy if exists "training_sets_insert_own" on public.training_sets;
create policy "training_sets_insert_own" on public.training_sets
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.training_workout_exercises we
      join public.training_workouts w on w.id = we.workout_id
      where we.id = workout_exercise_id and w.user_id = auth.uid()
    )
  );

drop policy if exists "training_sets_update_own" on public.training_sets;
create policy "training_sets_update_own" on public.training_sets
  for update to authenticated
  using (
    exists (
      select 1
      from public.training_workout_exercises we
      join public.training_workouts w on w.id = we.workout_id
      where we.id = workout_exercise_id and w.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.training_workout_exercises we
      join public.training_workouts w on w.id = we.workout_id
      where we.id = workout_exercise_id and w.user_id = auth.uid()
    )
  );

drop policy if exists "training_sets_delete_own" on public.training_sets;
create policy "training_sets_delete_own" on public.training_sets
  for delete to authenticated
  using (
    exists (
      select 1
      from public.training_workout_exercises we
      join public.training_workouts w on w.id = we.workout_id
      where we.id = workout_exercise_id and w.user_id = auth.uid()
    )
  );
