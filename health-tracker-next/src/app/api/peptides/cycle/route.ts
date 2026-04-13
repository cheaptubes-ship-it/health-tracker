import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

function isTodayOrPast(dateStr: string | null): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr)
  const now = new Date();
  now.setHours(0,0,0,0);
  return d.getTime() <= now.getTime()
}

export async function GET(req: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 })

    const { data, error } = await supabase
      .from('peptide_cycle_status')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })

    if (!data) {
      return NextResponse.json({ ok: true, status: 'on_cycle' })
    }

    if (data.status === 'off_cycle' && isTodayOrPast(data.off_cycle_end)) {
      // Auto transition back on cycle
      const { error: upErr } = await supabase
        .from('peptide_cycle_status')
        .update({ status: 'on_cycle', off_cycle_start: null, off_cycle_end: null })
        .eq('user_id', user.id)
      if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 400 })
      return NextResponse.json({ ok: true, status: 'on_cycle' })
    }

    return NextResponse.json({ ok: true, status: data.status, off_cycle_start: data.off_cycle_start, off_cycle_end: data.off_cycle_end })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
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

    const status = String(body.status ?? '').trim()
    const off_cycle_end = typeof body.off_cycle_end === 'string' ? body.off_cycle_end.trim() || null : null

    if (status !== 'on_cycle' && status !== 'off_cycle') {
      return NextResponse.json({ ok: false, error: 'Invalid status' }, { status: 400 })
    }

    const off_cycle_start = status === 'off_cycle' ? new Date().toISOString().slice(0, 10) : null

    const { error } = await supabase.from('peptide_cycle_status').upsert({
      user_id: user.id,
      status,
      off_cycle_start,
      off_cycle_end,
      updated_at: new Date().toISOString(),
    })

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
