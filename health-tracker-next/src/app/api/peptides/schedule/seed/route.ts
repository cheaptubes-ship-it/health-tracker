import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { defaultProfileRows, defaultScheduleRows } from '@/lib/peptides/default-protocol'

export const runtime = 'nodejs'

/**
 * Seed the default weekly peptide schedule.
 * - Does NOT delete existing rows.
 * - If rows already exist, returns ok with a message.
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

    const { count, error: cErr } = await supabase
      .from('peptide_schedules')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (cErr) return NextResponse.json({ ok: false, error: cErr.message }, { status: 400 })

    if ((count ?? 0) > 0) {
      return NextResponse.json({ ok: true, seeded: false, message: 'Schedule already has items' })
    }

    const rows = defaultScheduleRows(user.id)

    const { error } = await supabase.from('peptide_schedules').insert(rows)
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })

    // Also seed peptide profiles (vial + recon) so logging can autofill and convert units→mcg.
    const { error: pErr } = await supabase.from('peptide_profiles').upsert(defaultProfileRows(user.id), {
      onConflict: 'user_id,normalized_name',
    })

    if (pErr) {
      // schedule seeded; surface warning but don't fail.
      return NextResponse.json({ ok: true, seeded: true, count: rows.length, profileWarning: pErr.message })
    }

    return NextResponse.json({ ok: true, seeded: true, count: rows.length })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
