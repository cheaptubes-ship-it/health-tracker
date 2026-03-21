import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { MESO1_BASIC_HYPERTROPHY } from '@/lib/training/template-meso1'

export const runtime = 'nodejs'

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 })

    const { data: program, error: pErr } = await supabase
      .from('training_programs')
      .select('id')
      .eq('status', 'active')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (pErr) return NextResponse.json({ ok: false, error: pErr.message }, { status: 400 })
    if (!program?.id) return NextResponse.json({ ok: false, error: 'No active program' }, { status: 404 })

    const { error } = await supabase
      .from('training_programs')
      .update({
        deload_override: true,
        current_week: MESO1_BASIC_HYPERTROPHY.deloadWeekIndex,
        current_day: 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', program.id)
      .eq('user_id', user.id)

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
