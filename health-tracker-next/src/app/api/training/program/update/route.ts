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

    const week = n(body.current_week)
    const day = n(body.current_day)
    const deload_override = body.deload_override === true

    const patch: any = { updated_at: new Date().toISOString() }
    if (week != null) patch.current_week = Math.max(1, Math.min(MESO1_BASIC_HYPERTROPHY.weeks, Math.round(week)))
    if (day != null) patch.current_day = Math.max(1, Math.min(MESO1_BASIC_HYPERTROPHY.days, Math.round(day)))

    // Only set deload_override if explicitly provided.
    if ('deload_override' in body) patch.deload_override = deload_override

    const { error } = await supabase
      .from('training_programs')
      .update(patch)
      .eq('status', 'active')
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
