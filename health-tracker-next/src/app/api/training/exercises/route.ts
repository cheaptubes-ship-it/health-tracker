import { NextResponse } from 'next/server'
import { MESO1_EXERCISE_OPTIONS } from '@/lib/training/meso1-options'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const slotKey = String(url.searchParams.get('slotKey') ?? '').trim()
  if (!slotKey) return NextResponse.json({ ok: true, items: [] })

  const items = MESO1_EXERCISE_OPTIONS[slotKey] ?? []
  return NextResponse.json({ ok: true, items })
}
