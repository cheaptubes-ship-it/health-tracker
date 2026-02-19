/* eslint-disable @typescript-eslint/no-explicit-any */

import OpenAI from 'openai'
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

function tzTodayYmd(tz: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const y = parts.find((p) => p.type === 'year')?.value
  const m = parts.find((p) => p.type === 'month')?.value
  const d = parts.find((p) => p.type === 'day')?.value
  return y && m && d ? `${y}-${m}-${d}` : new Date().toISOString().slice(0, 10)
}

function addDaysYmd(ymd: string, delta: number) {
  const d = new Date(ymd + 'T00:00:00')
  d.setDate(d.getDate() + delta)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: 'Missing OPENAI_API_KEY' }, { status: 500 })
    }

    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 })

    const { data: settings } = await supabase
      .from('user_settings')
      .select('timezone')
      .eq('user_id', user.id)
      .maybeSingle()
    const timeZone = settings?.timezone ?? 'America/New_York'

    const body = await req.json().catch(() => ({}))
    const selectedDate = typeof body?.date === 'string' && body.date.trim() ? body.date.trim() : tzTodayYmd(timeZone)

    const start = addDaysYmd(selectedDate, -6)
    const end = selectedDate

    const [food, weights, steps] = await Promise.all([
      supabase
        .from('food_entries')
        .select('entry_date, calories, protein_g, carbs_g, fat_g')
        .gte('entry_date', start)
        .lte('entry_date', end),
      supabase
        .from('weight_entries')
        .select('entry_date, weight_lbs, created_at')
        .lte('entry_date', end)
        .order('entry_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(14),
      supabase
        .from('steps_entries')
        .select('entry_date, steps, updated_at')
        .gte('entry_date', start)
        .lte('entry_date', end)
        .order('updated_at', { ascending: false }),
    ])

    const foodByDay = new Map<string, { calories: number; p: number; c: number; f: number }>()
    for (const r of food.data ?? []) {
      const k = String((r as any).entry_date)
      const prev = foodByDay.get(k) ?? { calories: 0, p: 0, c: 0, f: 0 }
      foodByDay.set(k, {
        calories: prev.calories + Number((r as any).calories ?? 0),
        p: prev.p + Number((r as any).protein_g ?? 0),
        c: prev.c + Number((r as any).carbs_g ?? 0),
        f: prev.f + Number((r as any).fat_g ?? 0),
      })
    }

    const stepsByDay = new Map<string, number>()
    for (const r of steps.data ?? []) {
      const k = String((r as any).entry_date)
      const v = Number((r as any).steps ?? 0)
      // keep max/last
      if (!stepsByDay.has(k)) stepsByDay.set(k, v)
    }

    function weightOnOrBefore(ymd: string) {
      const rows = (weights.data ?? []) as any[]
      const onOrBefore = rows.filter((x) => String(x.entry_date) <= ymd)
      const latest = onOrBefore.length ? onOrBefore[0] : null
      return latest?.weight_lbs != null ? Number(latest.weight_lbs) : null
    }

    const wToday = weightOnOrBefore(selectedDate)
    const wPrev = weightOnOrBefore(addDaysYmd(selectedDate, -1))

    const payload = {
      date: selectedDate,
      weight_today: wToday,
      weight_prev_day: wPrev,
      days: Array.from({ length: 7 }).map((_, i) => {
        const d = addDaysYmd(selectedDate, -(6 - i))
        const m = foodByDay.get(d) ?? { calories: 0, p: 0, c: 0, f: 0 }
        const s = stepsByDay.get(d) ?? null
        return { date: d, calories: Math.round(m.calories), protein_g: Math.round(m.p), carbs_g: Math.round(m.c), fat_g: Math.round(m.f), steps: s }
      }),
    }

    const client = new OpenAI({ apiKey })

    const system =
      'You are a pragmatic nutrition coach. Given 7 days of macros/steps and a weight change, explain what likely helped on the most recent weight-loss day. ' +
      'Be specific but not overconfident. Focus on patterns: carbs/protein/fat distribution, calories, steps, sleep. ' +
      'Return concise advice that the user can repeat tomorrow.'

    const res = await client.chat.completions.create({
      model: process.env.AI_INSIGHT_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: JSON.stringify(payload) },
      ],
      response_format: { type: 'json_object' },
    })

    const txt = res.choices?.[0]?.message?.content ?? ''
    let parsed: any = null
    try {
      parsed = JSON.parse(txt)
    } catch {
      parsed = { summary: txt }
    }

    // Best-effort usage tracking (no prompts stored)
    try {
      await supabase.from('ai_usage_events').insert({
        user_id: user.id,
        kind: 'weight_insight',
        model: process.env.AI_INSIGHT_MODEL || 'gpt-4o-mini',
      })
    } catch {
      // ignore
    }

    return NextResponse.json({ ok: true, timeZone, date: selectedDate, insight: parsed })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
