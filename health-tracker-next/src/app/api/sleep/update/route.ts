import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { datetimeLocalToUtcIso } from '@/lib/datetime'

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

    const id = String(body.id ?? '').trim()
    if (!id) return NextResponse.json({ ok: false, error: 'Missing id' }, { status: 400 })

    const entry_date = typeof body.entry_date === 'string' && body.entry_date.trim() ? body.entry_date.trim() : null

    const sleep_start_at = body.sleep_start_at ? String(body.sleep_start_at) : null
    const sleep_end_at = body.sleep_end_at ? String(body.sleep_end_at) : null

    const { data: settings } = await supabase
      .from('user_settings')
      .select('timezone')
      .eq('user_id', user.id)
      .maybeSingle()
    const timeZone = settings?.timezone ?? 'America/New_York'

    const qualityRaw = body.quality
    const quality =
      qualityRaw == null || qualityRaw === ''
        ? null
        : Number.isFinite(Number(qualityRaw))
          ? Number(qualityRaw)
          : null

    const note = typeof body.note === 'string' ? body.note.trim() || null : null

    const patch: {
      sleep_start_at: string | null
      sleep_end_at: string | null
      quality: number | null
      note: string | null
      updated_at: string
      entry_date?: string
    } = {
      sleep_start_at: datetimeLocalToUtcIso(sleep_start_at, timeZone),
      sleep_end_at: datetimeLocalToUtcIso(sleep_end_at, timeZone),
      quality,
      note,
      updated_at: new Date().toISOString(),
    }
    if (entry_date) patch.entry_date = entry_date

    const { error } = await supabase.from('sleep_entries').update(patch).eq('id', id)
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
