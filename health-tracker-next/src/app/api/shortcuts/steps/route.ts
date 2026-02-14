import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

function n(v: unknown) {
  if (v == null) return null
  const s = String(v).trim()
  if (!s) return null
  const num = Number(s)
  return Number.isFinite(num) ? num : null
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })

    const token = String(body.token ?? '').trim()
    const entry_date = String(body.entry_date ?? '').trim() // YYYY-MM-DD
    const steps = n(body.steps)

    if (!token) return NextResponse.json({ ok: false, error: 'Missing token' }, { status: 400 })
    if (!entry_date) return NextResponse.json({ ok: false, error: 'Missing entry_date' }, { status: 400 })
    if (steps == null) return NextResponse.json({ ok: false, error: 'Missing steps' }, { status: 400 })

    const supabase = createSupabaseAdminClient()

    const { data: tok, error: tokErr } = await supabase
      .from('shortcuts_tokens')
      .select('user_id')
      .eq('token', token)
      .maybeSingle()

    if (tokErr) return NextResponse.json({ ok: false, error: tokErr.message }, { status: 400 })
    if (!tok?.user_id) return NextResponse.json({ ok: false, error: 'Invalid token' }, { status: 401 })

    const payload = {
      user_id: tok.user_id,
      entry_date,
      steps: Math.round(Number(steps)),
      distance_m: n(body.distance_m),
      active_kcal: n(body.active_kcal),
      avg_hr: n(body.avg_hr),
      source: 'shortcuts',
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('steps_entries')
      .upsert(payload, { onConflict: 'user_id,entry_date,source' })

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
