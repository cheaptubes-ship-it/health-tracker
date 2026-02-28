import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { peptideKey } from '@/app/dashboard/peptides-utils'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 })

    const { data, error } = await supabase
      .from('peptide_profiles')
      .select('normalized_name, display_name, vial_amount, vial_unit, recon_volume_ml, default_note, updated_at')
      .order('display_name', { ascending: true })

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true, items: data ?? [] })
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

    const display_name = typeof body.display_name === 'string' ? body.display_name.trim() : ''
    const normalized_name = peptideKey(display_name)
    if (!normalized_name) return NextResponse.json({ ok: false, error: 'Missing name' }, { status: 400 })

    const vial_amount = Number(body.vial_amount)
    const recon_volume_ml = Number(body.recon_volume_ml)
    const vial_unit = body.vial_unit === 'mcg' ? 'mcg' : 'mg'

    if (!Number.isFinite(vial_amount) || vial_amount <= 0) {
      return NextResponse.json({ ok: false, error: 'Invalid vial_amount' }, { status: 400 })
    }
    if (!Number.isFinite(recon_volume_ml) || recon_volume_ml <= 0) {
      return NextResponse.json({ ok: false, error: 'Invalid recon_volume_ml' }, { status: 400 })
    }

    const default_note = typeof body.default_note === 'string' ? body.default_note.trim() || null : null

    const { error } = await supabase.from('peptide_profiles').upsert(
      {
        user_id: user.id,
        normalized_name,
        display_name,
        vial_amount,
        vial_unit,
        recon_volume_ml,
        default_note,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,normalized_name' }
    )

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
