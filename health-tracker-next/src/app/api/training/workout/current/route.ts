import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { MESO1_BASIC_HYPERTROPHY } from '@/lib/training/template-meso1'

export const runtime = 'nodejs'

function ymdFromQuery(url: URL) {
  const d = url.searchParams.get('date')
  return typeof d === 'string' && d.trim() ? d.trim() : null
}

export async function GET(req: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 })

    const ymd = ymdFromQuery(new URL(req.url))
    if (!ymd) return NextResponse.json({ ok: false, error: 'Missing date' }, { status: 400 })

    // Find existing workout
    const { data: existing, error: wErr } = await supabase
      .from('training_workouts')
      .select('id, entry_date, program_id, week_index, day_index, note')
      .eq('entry_date', ymd)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (wErr) return NextResponse.json({ ok: false, error: wErr.message }, { status: 400 })

    let workout = existing

    // If no workout yet, create one (seed from current active program day)
    if (!workout) {
      const { data: program, error } = await supabase
        .from('training_programs')
        .select('id, template_id, name, current_week, current_day, inserted_deload_weeks, deload_override')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })

      const isDeload = program ? (program.current_week === MESO1_BASIC_HYPERTROPHY.deloadWeekIndex || (program as any).deload_override === true) : false
      const deloadMode: any = isDeload
        ? (program?.current_day ?? 1) <= 3
          ? 'half_weight'
          : 'half_weight_half_volume'
        : null
      const repGoal =
        program && !isDeload
          ? MESO1_BASIC_HYPERTROPHY.repGoalsByWeek[program.current_week] ?? null
          : isDeload
            ? 'deload'
            : null

      const { data: inserted, error: insErr } = await supabase
        .from('training_workouts')
        .insert({
          user_id: user.id,
          program_id: program?.id ?? null,
          entry_date: ymd,
          week_index: program?.current_week ?? null,
          day_index: program?.current_day ?? null,
          is_deload: Boolean(isDeload),
          deload_mode: deloadMode,
        })
        .select('id, entry_date, program_id, week_index, day_index, note')
        .single()

      if (insErr) return NextResponse.json({ ok: false, error: insErr.message }, { status: 400 })

      workout = inserted

      if (program) {
        const { data: slots, error: slotsErr } = await supabase
          .from('training_program_slots')
          .select('slot_index, slot_key, exercise_name, default_sets')
          .eq('program_id', program.id)
          .eq('day_index', program.current_day)
          .order('slot_index', { ascending: true })

        if (slotsErr) return NextResponse.json({ ok: false, error: slotsErr.message }, { status: 400 })

        const seeds = (slots ?? [])
          .filter((s) => s.exercise_name)
          .map((s) => ({
            workout_id: workout!.id,
            slot_index: s.slot_index,
            slot_instance: 1,
            slot_key: s.slot_key,
            exercise_name: s.exercise_name as string,
            planned_sets: s.default_sets ?? null,
            planned_rep_goal: repGoal,
          }))

        if (seeds.length) {
          // avoid duplicates if called twice
          const { error: exErr } = await supabase
            .from('training_workout_exercises')
            .upsert(seeds, { onConflict: 'workout_id,slot_index,slot_instance' })
          if (exErr) return NextResponse.json({ ok: false, error: exErr.message }, { status: 400 })
        }
      }
    }

    // Load exercises
    const { data: exercises, error: exErr } = await supabase
      .from('training_workout_exercises')
      .select('id, slot_index, slot_instance, slot_key, exercise_name, planned_sets, planned_rep_goal, planned_weight, rating, note')
      .eq('workout_id', workout!.id)
      .order('slot_index', { ascending: true })
      .order('slot_instance', { ascending: true })

    if (exErr) return NextResponse.json({ ok: false, error: exErr.message }, { status: 400 })

    const exIds = (exercises ?? []).map((e) => e.id)

    const { data: sets, error: setErr } = exIds.length
      ? await supabase
          .from('training_sets')
          .select('id, workout_exercise_id, set_index, weight, reps, rir, is_warmup')
          .in('workout_exercise_id', exIds)
          .order('set_index', { ascending: true })
      : { data: [], error: null }

    if (setErr) return NextResponse.json({ ok: false, error: setErr.message }, { status: 400 })

    const byEx = new Map<string, any[]>()
    ;(sets ?? []).forEach((s) => {
      const arr = byEx.get(s.workout_exercise_id) ?? []
      arr.push({
        id: s.id,
        set_index: s.set_index,
        weight: s.weight,
        reps: s.reps,
        rir: s.rir,
        is_warmup: s.is_warmup,
      })
      byEx.set(s.workout_exercise_id, arr)
    })

    const enriched = (exercises ?? []).map((e) => ({
      ...e,
      sets: byEx.get(e.id) ?? [],
    }))

    return NextResponse.json({ ok: true, workout, exercises: enriched })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
