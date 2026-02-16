import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { MESO1_BASIC_HYPERTROPHY } from '@/lib/training/template-meso1'

export const runtime = 'nodejs'

function n(v: unknown) {
  const x = Number(v)
  return Number.isFinite(x) ? x : null
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 })

    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })

    const workout_id = String(body.workout_id ?? '').trim()
    const slot_index = n(body.slot_index)
    const slot_key = typeof body.slot_key === 'string' ? body.slot_key.trim() || null : null
    const exercise_name = typeof body.exercise_name === 'string' ? body.exercise_name.trim() : ''
    const planned_sets = body.planned_sets == null ? null : n(body.planned_sets)

    if (!workout_id) return NextResponse.json({ ok: false, error: 'Missing workout_id' }, { status: 400 })
    if (slot_index == null) return NextResponse.json({ ok: false, error: 'Missing slot_index' }, { status: 400 })
    if (!exercise_name) return NextResponse.json({ ok: false, error: 'Missing exercise_name' }, { status: 400 })

    const { data: workout, error: wErr } = await supabase
      .from('training_workouts')
      .select('id, user_id, program_id, week_index, is_deload')
      .eq('id', workout_id)
      .maybeSingle()

    if (wErr) return NextResponse.json({ ok: false, error: wErr.message }, { status: 400 })
    if (!workout) return NextResponse.json({ ok: false, error: 'Workout not found' }, { status: 404 })
    if (workout.user_id !== user.id) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })

    const repGoal =
      workout.week_index != null && !workout.is_deload
        ? MESO1_BASIC_HYPERTROPHY.repGoalsByWeek[workout.week_index] ?? null
        : workout.is_deload
          ? 'deload'
          : null

    const payload: any = {
      workout_id,
      slot_index,
      slot_key,
      exercise_name,
      planned_sets,
      planned_rep_goal: repGoal,
    }

    const { data: ex, error } = await supabase
      .from('training_workout_exercises')
      .upsert(payload, { onConflict: 'workout_id,slot_index' })
      .select('id')
      .single()

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })

    return NextResponse.json({ ok: true, id: ex?.id ?? null })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
