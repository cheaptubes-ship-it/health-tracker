import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { defaultProfileRows, defaultScheduleRows } from '@/lib/peptides/default-protocol'

export const runtime = 'nodejs'

/**
 * Reseed schedule to defaults (OVERWRITES):
 * - Deletes existing schedule rows for this user
 * - Inserts the current default rows
 * - Upserts peptide vial profiles
 *
 * Defaults live in src/lib/peptides/default-protocol.ts
 */
export async function POST() {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 })

    // Delete existing schedule rows for this user
    const { error: delErr } = await supabase
      .from('peptide_schedules')
      .delete()
      .eq('user_id', user.id)

    if (delErr) return NextResponse.json({ ok: false, error: delErr.message }, { status: 400 })

    const rows = defaultScheduleRows(user.id)

    const { error: insErr } = await supabase.from('peptide_schedules').insert(rows)
    if (insErr) return NextResponse.json({ ok: false, error: insErr.message }, { status: 400 })

    // Upsert peptide profiles (vial + recon) for quick log conversions.
    const { error: pErr } = await supabase.from('peptide_profiles').upsert(defaultProfileRows(user.id), {
      onConflict: 'user_id,normalized_name',
    })

    if (pErr) {
      return NextResponse.json({ ok: true, reseeded: true, count: rows.length, profileWarning: pErr.message })
    }

    return NextResponse.json({ ok: true, reseeded: true, count: rows.length })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
