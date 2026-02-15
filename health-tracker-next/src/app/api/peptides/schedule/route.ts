import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { peptideKey } from '@/app/dashboard/peptides-utils'

export const runtime = 'nodejs'

function parseDays(v: unknown): number[] {
  if (!Array.isArray(v)) return []
  const out: number[] = []
  for (const x of v) {
    const n = Number(x)
    if (Number.isFinite(n) && n >= 0 && n <= 6) out.push(n)
  }
  return Array.from(new Set(out)).sort((a, b) => a - b)
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 })

    const { data, error } = await supabase
      .from('peptide_schedules')
      .select('id, normalized_name, display_name, dose_value, dose_unit, timing, days_of_week, active, note, created_at')
      .order('display_name', { ascending: true })
      .order('timing', { ascending: true })

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

    const id = typeof body.id === 'string' && body.id.trim() ? body.id.trim() : null

    const display_name = typeof body.display_name === 'string' ? body.display_name.trim() : ''
    const normalized_name = peptideKey(display_name)
    if (!normalized_name) return NextResponse.json({ ok: false, error: 'Missing name' }, { status: 400 })

    const dose_value = body.dose_value == null || body.dose_value === '' ? null : Number(body.dose_value)
    const dose_unit = typeof body.dose_unit === 'string' && body.dose_unit ? body.dose_unit : 'u'
    const timing = typeof body.timing === 'string' ? body.timing : 'am'
    const days_of_week = parseDays(body.days_of_week)
    const active = body.active !== false
    const note = typeof body.note === 'string' ? body.note.trim() || null : null

    const payload: any = {
      user_id: user.id,
      normalized_name,
      display_name: display_name || null,
      dose_value,
      dose_unit,
      timing,
      days_of_week: days_of_week.length ? days_of_week : [0, 1, 2, 3, 4, 5, 6],
      active,
      note,
    }

    const q = id
      ? supabase.from('peptide_schedules').update(payload).eq('id', id).select('id').single()
      : supabase.from('peptide_schedules').insert(payload).select('id').single()

    const { data, error } = await q
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })

    return NextResponse.json({ ok: true, id: data?.id ?? null })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
