import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { MESO1_BASIC_HYPERTROPHY } from '@/lib/training/template-meso1'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 })

    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })

    const dir = String(body.dir ?? 'next')

    const { data: program, error } = await supabase
      .from('training_programs')
      .select('id, current_week, current_day, deload_override')
      .eq('status', 'active')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
    if (!program) return NextResponse.json({ ok: false, error: 'No active program' }, { status: 404 })

    let week = Number(program.current_week ?? 1)
    let day = Number(program.current_day ?? 1)

    const clamp = () => {
      week = Math.max(1, Math.min(MESO1_BASIC_HYPERTROPHY.weeks, Math.round(week)))
      day = Math.max(1, Math.min(MESO1_BASIC_HYPERTROPHY.days, Math.round(day)))
    }

    if (dir === 'prev-day') {
      day -= 1
      if (day < 1) {
        day = MESO1_BASIC_HYPERTROPHY.days
        week = Math.max(1, week - 1)
      }
    } else if (dir === 'next-day') {
      day += 1
      if (day > MESO1_BASIC_HYPERTROPHY.days) {
        day = 1
        week = Math.min(MESO1_BASIC_HYPERTROPHY.weeks, week + 1)
      }
    } else if (dir === 'prev-week') {
      week = Math.max(1, week - 1)
    } else {
      // next-week
      week = Math.min(MESO1_BASIC_HYPERTROPHY.weeks, week + 1)
    }

    clamp()

    const { error: upErr } = await supabase
      .from('training_programs')
      .update({ current_week: week, current_day: day, updated_at: new Date().toISOString() })
      .eq('id', program.id)
      .eq('user_id', user.id)

    if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 400 })

    return NextResponse.json({ ok: true, current_week: week, current_day: day })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
