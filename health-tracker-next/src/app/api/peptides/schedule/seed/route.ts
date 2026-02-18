import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { peptideKey } from '@/app/dashboard/peptides-utils'

export const runtime = 'nodejs'

/**
 * Seed Mike's current weekly peptide schedule.
 * - Does NOT delete existing rows.
 * - If rows already exist, returns ok with a message.
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

      // TB-500: Mon/Thu (from sheet), 50u, AM
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

      // CJC-1295 / IPA: weekdays bedtime, 7u, active
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

      // Retatrutide: weekly (Sun), but paused (no alerts)
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

    const { error } = await supabase.from('peptide_schedules').insert(rows)
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })

    // Also seed peptide profiles (vial + recon) so logging can autofill and convert units→mcg.
    // Based on your sheet: amount / total mL.
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
