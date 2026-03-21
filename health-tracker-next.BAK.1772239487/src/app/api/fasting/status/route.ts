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
    const entry_date = url.searchParams.get('date')?.trim()
    if (!entry_date) return NextResponse.json({ ok: false, error: 'Missing date' }, { status: 400 })

    const { data, error } = await supabase
      .from('fasting_windows')
      .select('entry_date, fast_start_at, fast_end_at, note, updated_at')
      .eq('entry_date', entry_date)
      .maybeSingle()

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })

    return NextResponse.json({ ok: true, window: data ?? null })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
