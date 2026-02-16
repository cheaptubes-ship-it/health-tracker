import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { plannedWeightFromTenRm } from '@/lib/training/weight-logic'

export const runtime = 'nodejs'

function deloadPhaseFromWorkout(w: any) {
  if (!w?.is_deload) return null
  return w?.deload_mode === 'half_weight_half_volume' ? 'half_weight_half_volume' : 'half_weight'
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
    if (!workout_id) return NextResponse.json({ ok: false, error: 'Missing workout_id' }, { status: 400 })

    const { data: workout, error: wErr } = await supabase
      .from('training_workouts')
      .select('id, user_id, program_id, day_index, is_deload, deload_mode')
      .eq('id', workout_id)
      .maybeSingle()

    if (wErr) return NextResponse.json({ ok: false, error: wErr.message }, { status: 400 })
    if (!workout) return NextResponse.json({ ok: false, error: 'Workout not found' }, { status: 404 })
    if (workout.user_id !== user.id) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })

    const { data: exRows, error: exErr } = await supabase
      .from('training_workout_exercises')
      .select('id, slot_index, planned_rep_goal')
      .eq('workout_id', workout_id)

    if (exErr) return NextResponse.json({ ok: false, error: exErr.message }, { status: 400 })

    const slotIndexes = Array.from(new Set((exRows ?? []).map((e) => e.slot_index)))

    const { data: slots, error: sErr } = slotIndexes.length
      ? await supabase
          .from('training_program_slots')
          .select('slot_index, ten_rm_weight, ten_rm_unit')
          .eq('program_id', workout.program_id)
          .eq('day_index', workout.day_index)
          .in('slot_index', slotIndexes)
      : { data: [], error: null }

    if (sErr) return NextResponse.json({ ok: false, error: sErr.message }, { status: 400 })

    const slotByIndex = new Map<number, any>()
    ;(slots ?? []).forEach((s) => slotByIndex.set(s.slot_index, s))

    const deloadPhase = deloadPhaseFromWorkout(workout)

    let updated = 0
    for (const ex of exRows ?? []) {
      const slot = slotByIndex.get(ex.slot_index)
      const planned_weight = plannedWeightFromTenRm({
        tenRmWeight: slot?.ten_rm_weight ?? null,
        unit: (slot?.ten_rm_unit as any) ?? 'lb',
        repGoal: ex.planned_rep_goal ?? null,
        deloadPhase,
      })

      const { error: uErr } = await supabase
        .from('training_workout_exercises')
        .update({ planned_weight, updated_at: new Date().toISOString() })
        .eq('id', ex.id)

      if (uErr) return NextResponse.json({ ok: false, error: uErr.message }, { status: 400 })
      updated += 1
    }

    return NextResponse.json({ ok: true, updated })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
