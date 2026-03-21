import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

function n(v: unknown) {
  if (v == null) return null
  const s = String(v).trim()
  if (!s) return null
  const num = Number(s)
  return Number.isFinite(num) ? num : null
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

    const workout_exercise_id = String(body.workout_exercise_id ?? '').trim()
    const set_index = Number(body.set_index)

    if (!workout_exercise_id) {
      return NextResponse.json({ ok: false, error: 'Missing workout_exercise_id' }, { status: 400 })
    }
    if (!Number.isFinite(set_index) || set_index < 1) {
      return NextResponse.json({ ok: false, error: 'Invalid set_index' }, { status: 400 })
    }

    const payload = {
      workout_exercise_id,
      set_index,
      weight: n(body.weight),
      reps: n(body.reps),
      rir: n(body.rir),
      is_warmup: body.is_warmup === true,
    }

    const { data, error } = await supabase
      .from('training_sets')
      .upsert(payload, { onConflict: 'workout_exercise_id,set_index' })
      .select('id')
      .single()

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true, id: data?.id ?? null })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
