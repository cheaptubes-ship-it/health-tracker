import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })

    const entry_date = String(body.entry_date ?? '').trim() || undefined

    const sleep_start_at = body.sleep_start_at ? String(body.sleep_start_at) : null
    const sleep_end_at = body.sleep_end_at ? String(body.sleep_end_at) : null

    const qualityRaw = body.quality
    const quality =
      qualityRaw == null || qualityRaw === ''
        ? null
        : Number.isFinite(Number(qualityRaw))
          ? Number(qualityRaw)
          : null

    const note = typeof body.note === 'string' ? body.note.trim() || null : null

    const { error } = await supabase.from('sleep_entries').insert({
      user_id: user.id,
      entry_date,
      sleep_start_at: sleep_start_at ? new Date(sleep_start_at).toISOString() : null,
      sleep_end_at: sleep_end_at ? new Date(sleep_end_at).toISOString() : null,
      quality,
      note,
      source: 'manual',
    })

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
