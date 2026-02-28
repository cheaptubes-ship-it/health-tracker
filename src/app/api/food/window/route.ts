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
      .from('food_entries')
      .select('created_at, calories')
      .eq('entry_date', entry_date)
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })

    const rows = (data ?? []).filter((r) => Number(r.calories ?? 0) > 0)
    const first = rows.length ? rows[0].created_at : null
    const last = rows.length ? rows[rows.length - 1].created_at : null

    return NextResponse.json({ ok: true, first, last, count: rows.length })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
