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

    const id = String(body.id ?? '').trim()
    if (!id) return NextResponse.json({ ok: false, error: 'Missing id' }, { status: 400 })

    const delta = body.delta == null ? null : Number(body.delta)
    const nextDose = body.next_dose_value == null ? null : Number(body.next_dose_value)
    const reason = typeof body.reason === 'string' ? body.reason.trim() || null : null

    if ((delta == null || !Number.isFinite(delta)) && (nextDose == null || !Number.isFinite(nextDose))) {
      return NextResponse.json({ ok: false, error: 'Missing delta or next_dose_value' }, { status: 400 })
    }

    const { data: row, error } = await supabase
      .from('peptide_schedules')
      .select('id, user_id, dose_value, dose_unit')
      .eq('id', id)
      .maybeSingle()

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
    if (!row) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 })
    if (row.user_id !== user.id) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })

    const from_dose_value = row.dose_value == null ? null : Number(row.dose_value)
    const from_dose_unit = String(row.dose_unit ?? 'u')

    const to_dose_value = nextDose != null ? nextDose : (from_dose_value ?? 0) + delta!
    if (!Number.isFinite(to_dose_value) || to_dose_value < 0) {
      return NextResponse.json({ ok: false, error: 'Invalid resulting dose' }, { status: 400 })
    }

    const { error: upErr } = await supabase
      .from('peptide_schedules')
      .update({ dose_value: to_dose_value, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 400 })

    // Best-effort log (requires peptide_schedule_changes table)
    const { error: logErr } = await supabase.from('peptide_schedule_changes').insert({
      user_id: user.id,
      schedule_id: id,
      from_dose_value,
      from_dose_unit,
      to_dose_value,
      to_dose_unit: from_dose_unit,
      reason,
    })

    return NextResponse.json({ ok: true, to_dose_value, logged: !logErr, logError: logErr?.message ?? null })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
