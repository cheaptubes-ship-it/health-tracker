import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

function n(v: unknown) {
  if (v == null || v === '') return null
  const x = Number(v)
  return Number.isFinite(x) ? x : null
}

export async function GET(req: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 })

    const url = new URL(req.url)
    const date = url.searchParams.get('date')?.trim()
    const range = url.searchParams.get('range') ?? 'single'

    if (range === 'history') {
      const days = Number(url.searchParams.get('days') ?? 30)
      const end = date ?? new Date().toISOString().slice(0, 10)
      const d = new Date(end + 'T00:00:00')
      d.setDate(d.getDate() - days)
      const start = d.toISOString().slice(0, 10)
      const { data, error } = await supabase
        .from('wellness_entries')
        .select('*')
        .gte('entry_date', start)
        .lte('entry_date', end)
        .order('entry_date', { ascending: true })
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
      return NextResponse.json({ ok: true, items: data ?? [] })
    }

    if (!date) return NextResponse.json({ ok: false, error: 'Missing date' }, { status: 400 })

    const { data, error } = await supabase
      .from('wellness_entries')
      .select('*')
      .eq('entry_date', date)
      .maybeSingle()

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true, entry: data ?? null })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 })

    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })

    const entry_date = String(body.entry_date ?? '').trim()
    if (!entry_date) return NextResponse.json({ ok: false, error: 'Missing entry_date' }, { status: 400 })

    const payload = {
      user_id: user.id,
      entry_date,
      updated_at: new Date().toISOString(),
      pain_overall: n(body.pain_overall),
      pain_back: n(body.pain_back),
      pain_feet: n(body.pain_feet),
      pain_joints: n(body.pain_joints),
      mobility_score: n(body.mobility_score),
      steps_walked: n(body.steps_walked),
      exercise_minutes: n(body.exercise_minutes),
      brain_fog: n(body.brain_fog),
      cognitive_clarity: n(body.cognitive_clarity),
      memory_score: n(body.memory_score),
      word_retrieval: n(body.word_retrieval),
      focus_duration_minutes: n(body.focus_duration_minutes),
      headache: body.headache === true,
      headache_severity: n(body.headache_severity),
      mood: n(body.mood),
      anxiety: n(body.anxiety),
      depression: n(body.depression),
      motivation: n(body.motivation),
      craving_alcohol: n(body.craving_alcohol),
      craving_cannabis: n(body.craving_cannabis),
      energy_am: n(body.energy_am),
      energy_pm: n(body.energy_pm),
      notes: typeof body.notes === 'string' ? body.notes.trim() || null : null,
    }

    const { error } = await supabase
      .from('wellness_entries')
      .upsert(payload, { onConflict: 'user_id,entry_date' })

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
