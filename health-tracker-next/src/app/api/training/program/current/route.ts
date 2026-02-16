import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { MESO1_BASIC_HYPERTROPHY } from '@/lib/training/template-meso1'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 })

    const { data: program, error } = await supabase
      .from('training_programs')
      .select('id, name, template_id, current_week, current_day, inserted_deload_weeks, deload_override')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })

    if (!program) return NextResponse.json({ ok: true, program: null })

    const { data: slots, error: slotsErr } = await supabase
      .from('training_program_slots')
      .select('day_index, slot_index, slot_key, slot_label, exercise_name, video_url, ten_rm_weight, ten_rm_unit, default_sets')
      .eq('program_id', program.id)
      .eq('day_index', program.current_day)
      .order('slot_index', { ascending: true })

    if (slotsErr) return NextResponse.json({ ok: false, error: slotsErr.message }, { status: 400 })

    const isDeload =
      Boolean(program.deload_override) || program.current_week === MESO1_BASIC_HYPERTROPHY.deloadWeekIndex

    const deloadPhase = isDeload
      ? program.current_day <= 3
        ? 'half_weight'
        : 'half_weight_half_volume'
      : null

    const repGoal = isDeload ? 'deload' : MESO1_BASIC_HYPERTROPHY.repGoalsByWeek[program.current_week] ?? null

    const dayKey = program.current_day as 1 | 2 | 3 | 4 | 5
    const dayLabel = MESO1_BASIC_HYPERTROPHY.dayLabels?.[dayKey] ?? null

    return NextResponse.json({
      ok: true,
      program: { ...program, isDeload, deloadPhase, dayLabel, repGoal },
      slots: slots ?? [],
    })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
