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
    if (!body) {
      return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
    }

    const name = String(body.name ?? '').trim()
    const calories = n(body.calories)
    const protein_g = n(body.protein_g) ?? 0
    const carbs_g = n(body.carbs_g) ?? 0
    const fat_g = n(body.fat_g) ?? 0
    const serving = String(body.serving ?? '').trim() || null

    if (!name || calories == null) {
      return NextResponse.json({ ok: false, error: 'Missing fields' }, { status: 400 })
    }

    const { error } = await supabase.from('favorite_foods').insert({
      user_id: user.id,
      name,
      calories,
      protein_g,
      carbs_g,
      fat_g,
      serving,
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
