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

    const today = new Date().toISOString().slice(0, 10)
    const start7 = addDaysYmd(today, -6)
    const start30 = addDaysYmd(today, -29)

    const [rows7, rows30] = await Promise.all([
      supabase
        .from('ai_usage_events')
        .select('kind, model, created_at')
        .eq('user_id', user.id)
        .gte('created_at', start7 + 'T00:00:00Z'),
      supabase
        .from('ai_usage_events')
        .select('kind, model, created_at')
        .eq('user_id', user.id)
        .gte('created_at', start30 + 'T00:00:00Z'),
    ])

    const byKind = (rows: any[] | null) => {
      const m = new Map<string, number>()
      for (const r of rows ?? []) {
        const k = String(r.kind ?? 'unknown')
        m.set(k, (m.get(k) ?? 0) + 1)
      }
      return Object.fromEntries(Array.from(m.entries()).sort((a, b) => b[1] - a[1]))
    }

    return NextResponse.json({
      ok: true,
      last7: { total: (rows7.data ?? []).length, by_kind: byKind(rows7.data as any) },
      last30: { total: (rows30.data ?? []).length, by_kind: byKind(rows30.data as any) },
    })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
