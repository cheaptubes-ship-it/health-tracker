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

    const unit_pref = String(body.unit_pref ?? 'oz')
    if (unit_pref !== 'oz' && unit_pref !== 'ml') {
      return NextResponse.json({ ok: false, error: 'Invalid unit_pref' }, { status: 400 })
    }

    const patch = {
      unit_pref,
      water_ml: n(body.water_ml),
      sodium_mg: n(body.sodium_mg),
      potassium_mg: n(body.potassium_mg),
      magnesium_mg: n(body.magnesium_mg),
      updated_at: new Date().toISOString(),
    }

    // Use upsert on the PK (user_id) to avoid duplicate inserts.
    const { error } = await supabase
      .from('hydration_targets')
      .upsert({ user_id: user.id, ...patch }, { onConflict: 'user_id' })

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
