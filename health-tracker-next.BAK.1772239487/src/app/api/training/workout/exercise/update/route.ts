import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

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

    const patch: Record<string, any> = {}
    if (body.rating === null || typeof body.rating === 'number') patch.rating = body.rating
    if (typeof body.note === 'string') patch.note = body.note

    const { error } = await supabase.from('training_workout_exercises').update(patch).eq('id', id)
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
