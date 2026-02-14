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

    const program_id = String(body.program_id ?? '').trim()
    const day_index = n(body.day_index)
    const slot_index = n(body.slot_index)

    if (!program_id) return NextResponse.json({ ok: false, error: 'Missing program_id' }, { status: 400 })
    if (day_index == null || slot_index == null) {
      return NextResponse.json({ ok: false, error: 'Missing day_index/slot_index' }, { status: 400 })
    }

    const patch = {
      exercise_name: body.exercise_name == null ? null : String(body.exercise_name).trim() || null,
      video_url: body.video_url == null ? null : String(body.video_url).trim() || null,
      ten_rm_weight: n(body.ten_rm_weight),
      ten_rm_unit: String(body.ten_rm_unit ?? 'lb') === 'kg' ? 'kg' : 'lb',
      updated_at: new Date().toISOString(),
    }

    // Ensure user owns the program
    const { data: prog, error: progErr } = await supabase
      .from('training_programs')
      .select('id')
      .eq('id', program_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (progErr) return NextResponse.json({ ok: false, error: progErr.message }, { status: 400 })
    if (!prog) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 })

    const { error } = await supabase
      .from('training_program_slots')
      .update(patch)
      .eq('program_id', program_id)
      .eq('day_index', day_index)
      .eq('slot_index', slot_index)

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
