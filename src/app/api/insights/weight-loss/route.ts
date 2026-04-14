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
    const range = typeof body?.range === 'string' ? body.range : 'day'
    const lookbackDays = range === 'week' ? 7 : range === 'month' ? 30 : range === 'year' ? 365 : 1

    const start = addDaysYmd(selectedDate, -(lookbackDays - 1))
    const end = selectedDate

    const [food, weights, steps, vitals, hydration] = await Promise.all([
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
      supabase
        .from('vitals_entries')
        .select('entry_date, systolic, diastolic, pulse')
        .gte('entry_date', start)
        .lte('entry_date', end),
      supabase
        .from('hydration_entries')
        .select('entry_date, sodium_mg, water_ml, potassium_mg, magnesium_mg')
        .gte('entry_date', start)
        .lte('entry_date', end),
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
      if (!stepsByDay.has(k)) stepsByDay.set(k, Number((r as any).steps ?? 0))
    }

    const vitalsByDay = new Map<string, { systolic: number; diastolic: number; pulse: number; n: number }>()
    for (const r of vitals.data ?? []) {
      const k = String((r as any).entry_date)
      const cur = vitalsByDay.get(k) ?? { systolic: 0, diastolic: 0, pulse: 0, n: 0 }
      cur.systolic += Number((r as any).systolic ?? 0)
      cur.diastolic += Number((r as any).diastolic ?? 0)
      cur.pulse += Number((r as any).pulse ?? 0)
      cur.n += 1
      vitalsByDay.set(k, cur)
    }

    const hydrationByDay = new Map<string, { sodium_mg: number; water_ml: number; potassium_mg: number; magnesium_mg: number }>()
    for (const r of hydration.data ?? []) {
      const k = String((r as any).entry_date)
      const cur = hydrationByDay.get(k) ?? { sodium_mg: 0, water_ml: 0, potassium_mg: 0, magnesium_mg: 0 }
      cur.sodium_mg += Number((r as any).sodium_mg ?? 0)
      cur.water_ml += Number((r as any).water_ml ?? 0)
      cur.potassium_mg += Number((r as any).potassium_mg ?? 0)
      cur.magnesium_mg += Number((r as any).magnesium_mg ?? 0)
      hydrationByDay.set(k, cur)
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
      range,
      weight_today: wToday,
      weight_prev_day: wPrev,
      days: Array.from({ length: lookbackDays }).map((_, i) => {
        const d = addDaysYmd(selectedDate, -((lookbackDays - 1) - i))
        const m = foodByDay.get(d) ?? { calories: 0, p: 0, c: 0, f: 0 }
        const s = stepsByDay.get(d) ?? null
        const v = vitalsByDay.get(d)
        const h = hydrationByDay.get(d)
        return {
          date: d,
          calories: Math.round(m.calories),
          protein_g: Math.round(m.p),
          carbs_g: Math.round(m.c),
          fat_g: Math.round(m.f),
          steps: s,
          systolic: v ? Math.round(v.systolic / v.n) : null,
          diastolic: v ? Math.round(v.diastolic / v.n) : null,
          pulse: v ? Math.round(v.pulse / v.n) : null,
          sodium_mg: h ? Math.round(h.sodium_mg) : null,
          water_ml: h ? Math.round(h.water_ml) : null,
          potassium_mg: h ? Math.round(h.potassium_mg) : null,
          magnesium_mg: h ? Math.round(h.magnesium_mg) : null,
        }
      }),
    }

    const client = new OpenAI({ apiKey })

    const system =
      `You are a pragmatic nutrition and health coach. Given ${lookbackDays} day(s) of data including macros, steps, blood pressure, and electrolytes/hydration, identify patterns. ` +
      'Be specific but not overconfident. Consider that high sodium can intentionally raise low BP and cause temporary water retention. ' +
      'Look for correlations between sodium intake, BP changes, and next-day weight. ' +
      'Respond in json with these exact fields: ' +
      'headline (short punchy title), ' +
      'summary (2-3 sentence overview), ' +
      'what_helped (array of 3-4 specific factors that drove results), ' +
      'keep_doing (array of 3-4 actionable habits to repeat tomorrow).'

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

    // Usage tracking (best-effort)
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
