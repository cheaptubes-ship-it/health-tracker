import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { peptideKey } from '@/app/dashboard/peptides-utils'

export const runtime = 'nodejs'

/**
 * Reseed schedule to defaults (OVERWRITES):
 * - Deletes existing schedule rows for this user
 * - Inserts the current default rows
 * - Upserts peptide vial profiles
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

    // 0=Sun..6=Sat
    const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]
    const WEEKDAYS = [1, 2, 3, 4, 5]

    const rows: any[] = [
      // BPC-157: 5u AM + 5u Bedtime, every day
      {
        user_id: user.id,
        normalized_name: peptideKey('BPC-157'),
        display_name: 'BPC-157',
        dose_value: 5,
        dose_unit: 'u',
        timing: 'am',
        days_of_week: ALL_DAYS,
        active: true,
      },
      {
        user_id: user.id,
        normalized_name: peptideKey('BPC-157'),
        display_name: 'BPC-157',
        dose_value: 5,
        dose_unit: 'u',
        timing: 'bedtime',
        days_of_week: ALL_DAYS,
        active: true,
      },

      // TB-500: Mon/Thu, 50u, AM
      {
        user_id: user.id,
        normalized_name: peptideKey('TB-500'),
        display_name: 'TB-500',
        dose_value: 50,
        dose_unit: 'u',
        timing: 'am',
        days_of_week: [1, 4],
        active: true,
      },

      // NAD+: weekdays (Mon–Fri), 5u, AM
      {
        user_id: user.id,
        normalized_name: peptideKey('NAD+'),
        display_name: 'NAD+',
        dose_value: 5,
        dose_unit: 'u',
        timing: 'am',
        days_of_week: WEEKDAYS,
        active: true,
      },

      // TA-1: Tue/Fri, 30u, Bedtime
      {
        user_id: user.id,
        normalized_name: peptideKey('TA-1'),
        display_name: 'TA-1 (Thymosin Alpha-1)',
        dose_value: 30,
        dose_unit: 'u',
        timing: 'bedtime',
        days_of_week: [2, 5],
        active: true,
      },

      // CJC-1295 / IPA: weekdays bedtime, 7u
      {
        user_id: user.id,
        normalized_name: peptideKey('CJC-1295 / IPA'),
        display_name: 'CJC-1295 / IPA',
        dose_value: 7,
        dose_unit: 'u',
        timing: 'bedtime',
        days_of_week: WEEKDAYS,
        active: true,
        note: 'Empty stomach',
      },

      // Retatrutide: weekly (Sun), paused
      {
        user_id: user.id,
        normalized_name: peptideKey('Retatrutide'),
        display_name: 'Retatrutide',
        dose_value: null,
        dose_unit: 'mg',
        timing: 'am',
        days_of_week: [0],
        active: false,
        note: 'Paused',
      },
    ]

    const { error: insErr } = await supabase.from('peptide_schedules').insert(rows)
    if (insErr) return NextResponse.json({ ok: false, error: insErr.message }, { status: 400 })

    // Upsert peptide profiles (vial + recon) for quick log conversions.
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

    const { error: pErr } = await supabase.from('peptide_profiles').upsert(profiles, {
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
