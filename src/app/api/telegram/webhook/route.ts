import { NextResponse } from 'next/server'

const GET_CHAT_ID_COMMAND = '/getchatid'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const update = await req.json().catch(() => null)
    if (!update) return NextResponse.json({ ok: true })

    const msg = update.message ?? update.edited_message ?? null
    const text = typeof msg?.text === 'string' ? msg.text.trim() : ''
    if (!text) return NextResponse.json({ ok: true })

    if (text === GET_CHAT_ID_COMMAND) {
      // Reply with chat ID
      const chatId = msg?.chat?.id != null ? String(msg.chat.id) : null
      if (!chatId) return NextResponse.json({ ok: false, error: 'No chat id' }, { status: 400 })

      const reply = {
        method: 'sendMessage',
        chat_id: chatId,
        text: `Your chat ID is: ${chatId}`,
      }
      // Here, you’d call Telegram send API with your bot’s token
      // But this example just pretends to send and returns success

      return NextResponse.json({ ok: true, reply })
    }

    // Other message handling...
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
