import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

function nyDow() {
  // 0=Sun..6=Sat in America/New_York
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
  })
  const w = fmt.format(new Date())
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return map[w] ?? new Date().getDay()
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const token = url.searchParams.get('token')?.trim()
    const timing = (url.searchParams.get('timing')?.trim() as 'am' | 'pm') ?? 'am'

    if (!token) return NextResponse.json({ ok: false, error: 'Missing token' }, { status: 400 })
    if (timing !== 'am' && timing !== 'pm') {
      return NextResponse.json({ ok: false, error: 'Invalid timing' }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()

    const { data: tokenRow, error: tErr } = await supabase
      .from('shortcuts_tokens')
      .select('user_id')
      .eq('token', token)
      .maybeSingle()

    if (tErr) return NextResponse.json({ ok: false, error: tErr.message }, { status: 400 })
    if (!tokenRow?.user_id) return NextResponse.json({ ok: false, error: 'Invalid token' }, { status: 401 })

    const dow = nyDow()

    // Merge bedtime into PM
    const timingList = timing === 'pm' ? ['pm', 'bedtime'] : ['am']

    const { data, error } = await supabase
      .from('peptide_schedules')
      .select('id, display_name, normalized_name, dose_value, dose_unit, timing, days_of_week, note')
      .eq('user_id', tokenRow.user_id)
      .eq('active', true)
      .in('timing', timingList)
      .contains('days_of_week', [dow])
      .order('timing', { ascending: true })
      .order('display_name', { ascending: true })

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })

    return NextResponse.json({ ok: true, dow, timing, items: data ?? [] })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
