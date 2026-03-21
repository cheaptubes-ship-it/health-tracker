import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { peptideKey } from '@/app/dashboard/peptides-utils'

export const runtime = 'nodejs'

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 })

    const profiles: any[] = [
      { display_name: 'NAD+', vial_amount: 1000, vial_unit: 'mg', recon_volume_ml: 5 },
      { display_name: 'BPC-157', vial_amount: 10, vial_unit: 'mg', recon_volume_ml: 2 },
      { display_name: 'TB-500', vial_amount: 10, vial_unit: 'mg', recon_volume_ml: 2 },
      { display_name: 'TA-1 (Thymosin Alpha-1)', vial_amount: 10, vial_unit: 'mg', recon_volume_ml: 2 },
      { display_name: 'CJC-1295 / IPA', vial_amount: 10, vial_unit: 'mg', recon_volume_ml: 2 },
      { display_name: 'Retatrutide', vial_amount: 50, vial_unit: 'mg', recon_volume_ml: 10 },
    ].map((p) => ({
      user_id: user.id,
      normalized_name: peptideKey(p.display_name),
      display_name: p.display_name,
      vial_amount: p.vial_amount,
      vial_unit: p.vial_unit,
      recon_volume_ml: p.recon_volume_ml,
      updated_at: new Date().toISOString(),
    }))

    const { error } = await supabase.from('peptide_profiles').upsert(profiles, {
      onConflict: 'user_id,normalized_name',
    })

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true, count: profiles.length })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
