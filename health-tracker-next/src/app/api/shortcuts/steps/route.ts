import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

function n(v: unknown) {
  if (v == null) return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  const s = String(v).trim()
  if (!s) return null
  // Accept strings like "76 count" or "30 steps".
  const m = s.match(/-?\d+(?:\.\d+)?/)
  const num = m ? Number(m[0]) : Number(s)
  return Number.isFinite(num) ? num : null
}

function sumNums(v: unknown): number | null {
  if (Array.isArray(v)) {
    const nums = v.map((x) => n(x)).filter((x): x is number => x != null)
    if (!nums.length) return null
    return nums.reduce((a, b) => a + b, 0)
  }
  return null
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const token = String(url.searchParams.get('token') ?? '').trim()
    const entry_date = String(url.searchParams.get('entry_date') ?? '').trim()
    const steps = n(url.searchParams.get('steps'))

    if (!token) return NextResponse.json({ ok: false, error: 'Missing token' }, { status: 400 })
    if (steps == null) return NextResponse.json({ ok: false, error: 'Missing steps' }, { status: 400 })

    const supabase = createSupabaseAdminClient()

    const { data: tok, error: tokErr } = await supabase
      .from('shortcuts_tokens')
      .select('user_id')
      .eq('token', token)
      .maybeSingle()

    if (tokErr) return NextResponse.json({ ok: false, error: tokErr.message }, { status: 400 })
    if (!tok?.user_id) return NextResponse.json({ ok: false, error: 'Invalid token' }, { status: 401 })

    // If entry_date not provided, default to today in NY.
    function todayYmdNY() {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(new Date())
      const y = parts.find((p) => p.type === 'year')?.value
      const m = parts.find((p) => p.type === 'month')?.value
      const d = parts.find((p) => p.type === 'day')?.value
      if (y && m && d) return `${y}-${m}-${d}`
      const now = new Date()
      const yy = now.getFullYear()
      const mm = String(now.getMonth() + 1).padStart(2, '0')
      const dd = String(now.getDate()).padStart(2, '0')
      return `${yy}-${mm}-${dd}`
    }

    const ymd = entry_date || todayYmdNY()

    const payload = {
      user_id: tok.user_id,
      entry_date: ymd,
      steps: Math.round(Number(steps)),
      distance_m: null,
      active_kcal: null,
      avg_hr: null,
      source: 'shortcuts',
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('steps_entries')
      .upsert(payload, { onConflict: 'user_id,entry_date,source' })

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })

    const { data: saved } = await supabase
      .from('steps_entries')
      .select('entry_date, steps, updated_at, source')
      .eq('user_id', tok.user_id)
      .eq('entry_date', ymd)
      .eq('source', 'shortcuts')
      .maybeSingle()

    return NextResponse.json({ ok: true, saved })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })

    const token = String(body.token ?? '').trim()
    const entry_date_raw = String(body.entry_date ?? '').trim() // YYYY-MM-DD
    const entry_ts = String(body.entry_ts ?? '').trim() // ISO string from iPhone (preferred)
    // steps can be:
    // - a number
    // - a string ("76 count")
    // - an array of numbers/strings (we'll sum)
    const steps = sumNums(body.steps) ?? n(body.steps)

    if (!token) return NextResponse.json({ ok: false, error: 'Missing token' }, { status: 400 })
    if (steps == null) return NextResponse.json({ ok: false, error: 'Missing steps' }, { status: 400 })

    function todayYmdNY() {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(new Date())
      const y = parts.find((p) => p.type === 'year')?.value
      const m = parts.find((p) => p.type === 'month')?.value
      const d = parts.find((p) => p.type === 'day')?.value
      if (y && m && d) return `${y}-${m}-${d}`
      // Fallback: local calendar date
      const now = new Date()
      const yy = now.getFullYear()
      const mm = String(now.getMonth() + 1).padStart(2, '0')
      const dd = String(now.getDate()).padStart(2, '0')
      return `${yy}-${mm}-${dd}`
    }

    const entry_date = entry_date_raw || (entry_ts ? entry_ts.slice(0, 10) : '') || todayYmdNY()

    const supabase = createSupabaseAdminClient()

    const { data: tok, error: tokErr } = await supabase
      .from('shortcuts_tokens')
      .select('user_id')
      .eq('token', token)
      .maybeSingle()

    if (tokErr) return NextResponse.json({ ok: false, error: tokErr.message }, { status: 400 })
    if (!tok?.user_id) return NextResponse.json({ ok: false, error: 'Invalid token' }, { status: 401 })

    const payload = {
      user_id: tok.user_id,
      entry_date,
      steps: Math.round(Number(steps)),
      distance_m: n(body.distance_m),
      active_kcal: n(body.active_kcal),
      avg_hr: n(body.avg_hr),
      source: 'shortcuts',
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('steps_entries')
      .upsert(payload, { onConflict: 'user_id,entry_date,source' })

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })

    // Helpful debug info for Shortcuts / Quick Look.
    const { data: saved } = await supabase
      .from('steps_entries')
      .select('entry_date, steps, updated_at, source')
      .eq('user_id', tok.user_id)
      .eq('entry_date', entry_date)
      .eq('source', 'shortcuts')
      .maybeSingle()

    return NextResponse.json({ ok: true, saved })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
