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
      .select('id, name, template_id, current_week, current_day, inserted_deload_weeks')
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

    const isDeload = program.current_week === MESO1_BASIC_HYPERTROPHY.deloadWeekIndex
    const repGoal = isDeload ? 'deload' : MESO1_BASIC_HYPERTROPHY.repGoalsByWeek[program.current_week] ?? null

    return NextResponse.json({
      ok: true,
      program: { ...program, isDeload, repGoal },
      slots: slots ?? [],
    })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
