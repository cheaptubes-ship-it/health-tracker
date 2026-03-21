import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

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
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 })

    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })

    const kind = String(body.kind ?? '').trim()
    const started_at = String(body.started_at ?? '').trim()
    if (!kind) return NextResponse.json({ ok: false, error: 'Missing kind' }, { status: 400 })
    if (!started_at) return NextResponse.json({ ok: false, error: 'Missing started_at' }, { status: 400 })

    const payload = {
      user_id: user.id,
      kind,
      started_at,
      ended_at: s(body.ended_at),
      duration_min: n(body.duration_min),
      distance_m: n(body.distance_m),
      avg_hr: n(body.avg_hr),
      max_hr: n(body.max_hr),
      calories_kcal: n(body.calories_kcal),
      note: s(body.note),
      source: 'manual',
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

export async function DELETE(req: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 })

    const body = await req.json().catch(() => null)
    const id = String(body?.id ?? '').trim()
    if (!id) return NextResponse.json({ ok: false, error: 'Missing id' }, { status: 400 })

    const { error } = await supabase.from('cardio_entries').delete().eq('id', id).eq('user_id', user.id)
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
