import { NextResponse } from 'next/server'
import { DateTime } from 'luxon'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// Repairs older sleep entries that were stored by incorrectly interpreting
// datetime-local (wall clock) inputs as UTC timestamps.
//
// It takes the stored ISO timestamps, extracts their UTC wall-clock components,
// re-interprets those components in the user's timezone, and converts back to UTC.
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

    const { data: settings } = await supabase
      .from('user_settings')
      .select('timezone')
      .eq('user_id', user.id)
      .maybeSingle()
    const timeZone = settings?.timezone ?? 'America/New_York'

    const { data: row, error } = await supabase
      .from('sleep_entries')
      .select('id, user_id, entry_date, sleep_start_at, sleep_end_at')
      .eq('id', id)
      .maybeSingle()

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
    if (!row) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 })
    if (row.user_id !== user.id) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })

    function repair(iso: string | null): string | null {
      if (!iso) return null
      const dtUtc = DateTime.fromISO(String(iso), { zone: 'utc' })
      if (!dtUtc.isValid) return null
      const dtLocal = DateTime.fromObject(
        {
          year: dtUtc.year,
          month: dtUtc.month,
          day: dtUtc.day,
          hour: dtUtc.hour,
          minute: dtUtc.minute,
          second: dtUtc.second,
          millisecond: dtUtc.millisecond,
        },
        { zone: timeZone }
      )
      if (!dtLocal.isValid) return null
      return dtLocal.toUTC().toISO()
    }

    const repaired_start_at = repair(row.sleep_start_at)
    const repaired_end_at = repair(row.sleep_end_at)

    const { error: upErr } = await supabase
      .from('sleep_entries')
      .update({
        sleep_start_at: repaired_start_at,
        sleep_end_at: repaired_end_at,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 400 })

    return NextResponse.json({ ok: true, timeZone })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
