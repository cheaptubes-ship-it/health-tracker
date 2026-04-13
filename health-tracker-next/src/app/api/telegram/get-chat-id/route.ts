import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })

    const chatId = body.message?.chat?.id ?? null
    if (!chatId) return NextResponse.json({ ok: false, error: 'Missing chat id' }, { status: 400 })

    return NextResponse.json({ ok: true, chatId })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
