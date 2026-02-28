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

function servings(v: unknown) {
  const x = n(v)
  if (x == null) return 1
  // allow fractions like 0.25; clamp to a sane range
  return Math.min(10, Math.max(0.05, x))
}

function scale(v: unknown, s: number) {
  const x = n(v)
  if (x == null) return null
  return Number((x * s).toFixed(4))
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

    const s = servings(body.servings)

    const { error } = await supabase.from('hydration_entries').insert({
      user_id: user.id,
      entry_date,
      name,
      servings: s,
      water_ml: scale(body.water_ml, s),
      sodium_mg: scale(body.sodium_mg, s),
      potassium_mg: scale(body.potassium_mg, s),
      magnesium_mg: scale(body.magnesium_mg, s),
      caffeine_mg: scale(body.caffeine_mg, s),
      sugar_g: scale(body.sugar_g, s),
      lemon_juice: body.lemon_juice === true,
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
