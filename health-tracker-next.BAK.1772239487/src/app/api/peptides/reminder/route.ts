/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { peptideKey } from '@/app/dashboard/peptides-utils'

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

function tzNowHm(timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date())
  const hh = parts.find((p) => p.type === 'hour')?.value
  const mm = parts.find((p) => p.type === 'minute')?.value
  const h = hh != null ? Number(hh) : NaN
  const m = mm != null ? Number(mm) : NaN
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null
}

function inWindow(min: number | null, startMin: number, endMin: number) {
  if (min == null) return false
  return min >= startMin && min <= endMin
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const token = url.searchParams.get('token')?.trim()
    const timing = (url.searchParams.get('timing')?.trim() as 'am' | 'pm') ?? 'am'
    const debug = String(url.searchParams.get('debug') ?? '').trim() === '1'

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

    // Default reminder windows (local time)
    const nowMin = tzNowHm(timeZone)
    const amWindow = { start: 6 * 60, end: 8 * 60 }
    const pmWindow = { start: 18 * 60, end: 20 * 60 }
    const inReminderWindow = timing === 'am'
      ? inWindow(nowMin, amWindow.start, amWindow.end)
      : inWindow(nowMin, pmWindow.start, pmWindow.end)

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

    const key = (name: string, t: string) => {
      const k = peptideKey(String(name ?? ''))
      const tt = String(t ?? '').trim() || 'unknown'
      return `${k}__${tt}`
    }

    const takenKeys = new Set(
      (taken ?? [])
        .map((r: any) => key(String(r.name ?? ''), String(r.timing ?? '')))
        .filter((k: string) => Boolean(k && !k.startsWith('__')))
    )

    const scheduled = (data ?? []).map((it: any) => {
      const name = String(it.display_name ?? it.normalized_name ?? '').trim()
      const t = String(it.timing ?? '')
      return {
        ...it,
        _k: key(name, t),
      }
    })

    const due = scheduled.filter((it: any) => it._k && !takenKeys.has(String(it._k)))
    const alreadyTaken = scheduled.filter((it: any) => it._k && takenKeys.has(String(it._k)))

    const label = (it: any) => {
      const name = String(it.display_name ?? it.normalized_name ?? '').trim()
      const doseVal = it.dose_value == null ? null : Number(it.dose_value)
      const doseUnit = String(it.dose_unit ?? '').trim()
      const dose = doseVal != null && Number.isFinite(doseVal) ? `${doseVal}${doseUnit || ''}` : ''
      return `${name}${dose ? ` (${dose})` : ''}`
    }

    const linesDue = due.map(label)
    const linesTaken = alreadyTaken.map(label)

    const header = `Reminder (${timing.toUpperCase()} ${timing === 'am' ? '6–8am' : '6–8pm'}): ${entry_date}`

    const message =
      header +
      '\n' +
      (linesDue.length
        ? `\nDue now:\n` + linesDue.map((x) => `- ${x}`).join('\n')
        : '\nDue now: (none)') +
      '\n' +
      (linesTaken.length
        ? `\nAlready taken today:\n` + linesTaken.map((x) => `- ${x}`).join('\n')
        : '\nAlready taken today: (none)') +
      '\n' +
      (!scheduled.length ? `\nScheduled today: (none)` : `\nScheduled today: ${scheduled.length} item(s)`)

    const windowNote = timing === 'am' ? 'AM window 6–8am' : 'PM window 6–8pm'
    const messageWithWindow = inReminderWindow ? message : `${message}\n\n(Not in ${windowNote}.)`

    const debugObj = debug
      ? {
          nowMin,
          inReminderWindow,
          timingList,
          scheduledKeys: scheduled.map((x: any) => String(x._k)),
          takenKeys: Array.from(takenKeys),
        }
      : null

    // For iOS Shortcuts notifications, plain text is handy.
    const format = String(url.searchParams.get('format') ?? '').trim()
    if (format === 'text') {
      return new Response(messageWithWindow, { headers: { 'content-type': 'text/plain; charset=utf-8' } })
    }

    return NextResponse.json({
      ok: true,
      timeZone,
      entry_date,
      dow,
      timing,
      due,
      alreadyTaken,
      scheduledCount: scheduled.length,
      message: messageWithWindow,
      inReminderWindow,
      debug: debugObj,
    })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
