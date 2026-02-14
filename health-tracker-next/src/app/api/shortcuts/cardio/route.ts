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

function s(v: unknown) {
  const out = String(v ?? '').trim()
  return out ? out : null
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })

    const token = String(body.token ?? '').trim()
    const kind = String(body.kind ?? '').trim() // walk|bike|elliptical|run|other
    const started_at = String(body.started_at ?? '').trim()

    if (!token) return NextResponse.json({ ok: false, error: 'Missing token' }, { status: 400 })
    if (!kind) return NextResponse.json({ ok: false, error: 'Missing kind' }, { status: 400 })
    if (!started_at) return NextResponse.json({ ok: false, error: 'Missing started_at' }, { status: 400 })

    const supabase = createSupabaseAdminClient()

    const { data: tok, error: tokErr } = await supabase
      .from('shortcuts_tokens')
      .select('user_id')
      .eq('token', token)
      .maybeSingle()

    if (tokErr) return NextResponse.json({ ok: false, error: tokErr.message }, { status: 400 })
    if (!tok?.user_id) return NextResponse.json({ ok: false, error: 'Invalid token' }, { status: 401 })

    const ended_at = s(body.ended_at)
    const duration_min = n(body.duration_min)

    const payload = {
      user_id: tok.user_id,
      kind,
      started_at,
      ended_at,
      duration_min,
      distance_m: n(body.distance_m),
      avg_hr: n(body.avg_hr),
      max_hr: n(body.max_hr),
      calories_kcal: n(body.calories_kcal),
      note: s(body.note),
      source: 'shortcuts',
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase.from('cardio_entries').insert(payload)
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
