/* eslint-disable @typescript-eslint/no-explicit-any */

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

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 })

    const end = new Date()
    const endYmd = end.toISOString().slice(0, 10)
    const start7 = addDaysYmd(endYmd, -6)
    const start30 = addDaysYmd(endYmd, -29)

    const { data, error } = await supabase
      .from('ai_usage_events')
      .select('kind, created_at')
      .eq('user_id', user.id)
      .gte('created_at', start30 + 'T00:00:00Z')
      .lte('created_at', end.toISOString())

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })

    const rows = (data ?? []) as any[]

    function agg(fromYmd: string) {
      const by_kind: Record<string, number> = {}
      let total = 0
      for (const r of rows) {
        const created = String(r.created_at ?? '')
        const ymd = created.slice(0, 10)
        if (ymd < fromYmd) continue
        const k = String(r.kind ?? 'unknown')
        by_kind[k] = (by_kind[k] ?? 0) + 1
        total += 1
      }
      return { from: fromYmd, to: endYmd, total, by_kind }
    }

    return NextResponse.json({ ok: true, last7: agg(start7), last30: agg(start30) })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
