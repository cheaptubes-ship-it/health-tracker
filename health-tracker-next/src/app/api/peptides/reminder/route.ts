import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

function tzDow(timeZone: string) {
  // 0=Sun..6=Sat in a given timezone
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
  })
  const w = fmt.format(new Date())
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return map[w] ?? new Date().getDay()
}

function tzTodayYmd(timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const y = parts.find((p) => p.type === 'year')?.value
  const m = parts.find((p) => p.type === 'month')?.value
  const d = parts.find((p) => p.type === 'day')?.value
  return y && m && d ? `${y}-${m}-${d}` : new Date().toISOString().slice(0, 10)
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

    // Timezone (per-user; defaults to America/New_York)
    const { data: settings } = await supabase
      .from('user_settings')
      .select('timezone')
      .eq('user_id', tokenRow.user_id)
      .maybeSingle()

    const timeZone = settings?.timezone ?? 'America/New_York'
    const dow = tzDow(timeZone)
    const entry_date = tzTodayYmd(timeZone)

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

    // Filter out doses already taken today (by name+timing)
    const { data: taken } = await supabase
      .from('peptide_entries')
      .select('name, timing')
      .eq('user_id', tokenRow.user_id)
      .eq('entry_date', entry_date)
      .eq('status', 'taken')

    const key = (name: string, t: string) =>
      `${String(name ?? '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')}__${String(t ?? '').trim() || 'unknown'}`

    const takenKeys = new Set((taken ?? []).map((r: any) => key(String(r.name ?? ''), String(r.timing ?? ''))))

    const items = (data ?? []).filter((it: any) => {
      const t = String(it.timing ?? '')
      return !takenKeys.has(key(String(it.display_name ?? it.normalized_name ?? ''), t))
    })

    const label = (it: any) => {
      const name = String(it.display_name ?? it.normalized_name ?? '').trim()
      const doseVal = it.dose_value == null ? null : Number(it.dose_value)
      const doseUnit = String(it.dose_unit ?? '').trim()
      const dose = doseVal != null && Number.isFinite(doseVal) ? `${doseVal}${doseUnit || ''}` : ''
      return `${name}${dose ? ` (${dose})` : ''}`
    }

    const lines = items.map(label)
    const message = lines.length
      ? `${timing.toUpperCase()} peptides due (${entry_date}):\n` + lines.map((x) => `- ${x}`).join('\n')
      : `No ${timing.toUpperCase()} peptides due (${entry_date}).`

    // For iOS Shortcuts notifications, plain text is handy.
    const format = String(url.searchParams.get('format') ?? '').trim()
    if (format === 'text') {
      return new Response(message, { headers: { 'content-type': 'text/plain; charset=utf-8' } })
    }

    return NextResponse.json({ ok: true, timeZone, entry_date, dow, timing, items, message })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
