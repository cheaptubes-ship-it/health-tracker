import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 })

    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })

    const schedule_id = String(body.schedule_id ?? '').trim()
    const entry_date = typeof body.entry_date === 'string' && body.entry_date.trim() ? body.entry_date.trim() : null

    if (!schedule_id) return NextResponse.json({ ok: false, error: 'Missing schedule_id' }, { status: 400 })

    const { data: sched, error: sErr } = await supabase
      .from('peptide_schedules')
      .select('id, normalized_name, display_name, dose_value, dose_unit, timing, active, note')
      .eq('id', schedule_id)
      .maybeSingle()

    if (sErr) return NextResponse.json({ ok: false, error: sErr.message }, { status: 400 })
    if (!sched) return NextResponse.json({ ok: false, error: 'Schedule not found' }, { status: 404 })
    if (!sched.active) return NextResponse.json({ ok: false, error: 'Schedule is paused' }, { status: 400 })

    // Need vial profile to convert u -> mcg
    const { data: prof, error: pErr } = await supabase
      .from('peptide_profiles')
      .select('display_name, vial_amount, vial_unit, recon_volume_ml, default_note')
      .eq('normalized_name', sched.normalized_name)
      .maybeSingle()

    if (pErr) return NextResponse.json({ ok: false, error: pErr.message }, { status: 400 })
    if (!prof) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Missing peptide vial profile. Click “Seed vial profiles” (or add one) first.',
        },
        { status: 400 }
      )
    }

    const doseUnit = String(sched.dose_unit ?? 'u')
    const doseVal = sched.dose_value == null ? null : Number(sched.dose_value)

    if (doseUnit !== 'u') {
      return NextResponse.json(
        { ok: false, error: 'Quick log currently supports schedule doses in u only.' },
        { status: 400 }
      )
    }
    if (doseVal == null || !Number.isFinite(doseVal) || doseVal <= 0) {
      return NextResponse.json({ ok: false, error: 'Invalid dose value' }, { status: 400 })
    }

    const vial_amount = Number(prof.vial_amount)
    const vial_unit = prof.vial_unit as 'mg' | 'mcg'
    const recon_volume_ml = Number(prof.recon_volume_ml)

    // Convert to mcg
    const vialAmountMcg = vial_unit === 'mg' ? vial_amount * 1000 : vial_amount
    const concentration_mcg_per_ml = vialAmountMcg / recon_volume_ml

    const syringe_units = doseVal
    const volume_needed_ml = syringe_units / 100
    const actual_dose_mcg = concentration_mcg_per_ml * volume_needed_ml

    const nowIso = new Date().toISOString()

    // For compatibility with existing peptide_entries fields:
    // store desired_dose as mcg and unit mcg.
    const desired_dose = actual_dose_mcg
    const desired_dose_unit: 'mcg' = 'mcg'

    const { data: inserted, error: insErr } = await supabase
      .from('peptide_entries')
      .insert({
        user_id: user.id,
        entry_date: entry_date ?? undefined,
        name: sched.display_name ?? prof.display_name ?? sched.normalized_name,
        vial_amount,
        vial_unit,
        recon_volume_ml,
        desired_dose,
        desired_dose_unit,
        syringe_units,
        concentration_mcg_per_ml,
        volume_needed_ml,
        actual_dose_mcg,
        frequency: null,
        timing: sched.timing,
        status: 'taken',
        taken_at: nowIso,
        note: sched.note ?? prof.default_note ?? null,
        side_effect_note: null,
        side_effect_tags: null,
      })
      .select('id')
      .single()

    if (insErr) return NextResponse.json({ ok: false, error: insErr.message }, { status: 400 })

    return NextResponse.json({ ok: true, entryId: inserted?.id ?? null })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
