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

    const entry_date = String(body.entry_date ?? '').trim()
    if (!entry_date) return NextResponse.json({ ok: false, error: 'Missing entry_date' }, { status: 400 })

    const fast_start_at = body.fast_start_at ? String(body.fast_start_at) : null
    const fast_end_at = body.fast_end_at ? String(body.fast_end_at) : null

    const now = new Date().toISOString()

    const { error } = await supabase
      .from('fasting_windows')
      .upsert(
        {
          user_id: user.id,
          entry_date,
          fast_start_at,
          fast_end_at,
          updated_at: now,
        },
        { onConflict: 'user_id,entry_date' }
      )

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
