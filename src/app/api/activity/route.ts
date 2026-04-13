import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 })

    const url = new URL(req.url)
    const date = String(url.searchParams.get('date') ?? '').trim()
    if (!date) return NextResponse.json({ ok: false, error: 'Missing date' }, { status: 400 })

    const [stepsRes, cardioRes] = await Promise.all([
      supabase
        .from('steps_entries')
        .select('entry_date, steps, distance_m, active_kcal, avg_hr, source')
        .eq('entry_date', date)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('cardio_entries')
        .select('id, started_at, ended_at, kind, distance_m, duration_min, avg_hr, max_hr, calories_kcal, note')
        .gte('started_at', date + 'T00:00:00')
        .lte('started_at', date + 'T23:59:59')
        .order('started_at', { ascending: false }),
    ])

    if (stepsRes.error) return NextResponse.json({ ok: false, error: stepsRes.error.message }, { status: 400 })
    if (cardioRes.error) return NextResponse.json({ ok: false, error: cardioRes.error.message }, { status: 400 })

    return NextResponse.json({ ok: true, steps: stepsRes.data ?? null, cardio: cardioRes.data ?? [] })
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

    const entry_date = String(body.entry_date ?? '').trim()
    const steps = body.steps != null ? Number(body.steps) : null
    const distance_m = body.distance_m != null ? Number(body.distance_m) : null
    const active_kcal = body.active_kcal != null ? Number(body.active_kcal) : null

    if (!entry_date || !steps || !Number.isFinite(steps)) {
      return NextResponse.json({ ok: false, error: 'Missing entry_date or steps' }, { status: 400 })
    }

    const { error } = await supabase.from('steps_entries').upsert({
      user_id: user.id,
      entry_date,
      steps: Math.round(steps),
      distance_m: distance_m && Number.isFinite(distance_m) ? distance_m : null,
      active_kcal: active_kcal && Number.isFinite(active_kcal) ? active_kcal : null,
      source: 'manual',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,entry_date,source' })

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
