import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

function addDaysYmd(ymd: string, delta: number) {
  const d = new Date(ymd + 'T00:00:00')
  d.setDate(d.getDate() + delta)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export async function GET(req: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 })

    const url = new URL(req.url)
    const days = Math.max(1, Math.min(90, Number(url.searchParams.get('days') ?? 30) || 30))

    const end = new Date()
    const endYmd = end.toISOString().slice(0, 10)
    const startYmd = addDaysYmd(endYmd, -(days - 1))

    const { data, error } = await supabase
      .from('ai_usage_events')
      .select('kind, created_at, model')
      .eq('user_id', user.id)
      .gte('created_at', startYmd + 'T00:00:00Z')
      .lte('created_at', end.toISOString())

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })

    const rows = data ?? []
    const counts: Record<string, number> = {}
    for (const r of rows as any[]) {
      const k = String(r.kind ?? 'unknown')
      counts[k] = (counts[k] ?? 0) + 1
    }

    return NextResponse.json({ ok: true, days, startYmd, endYmd, counts, total: rows.length })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
