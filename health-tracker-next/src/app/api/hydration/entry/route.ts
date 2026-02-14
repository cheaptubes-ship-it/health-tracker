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

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })

    const entry_date = String(body.entry_date ?? '').trim() || undefined
    const name = String(body.name ?? '').trim()
    if (!name) return NextResponse.json({ ok: false, error: 'Missing name' }, { status: 400 })

    const { error } = await supabase.from('hydration_entries').insert({
      user_id: user.id,
      entry_date,
      name,
      water_ml: n(body.water_ml),
      sodium_mg: n(body.sodium_mg),
      potassium_mg: n(body.potassium_mg),
      magnesium_mg: n(body.magnesium_mg),
      caffeine_mg: n(body.caffeine_mg),
      sugar_g: n(body.sugar_g),
      notes: String(body.notes ?? '').trim() || null,
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
