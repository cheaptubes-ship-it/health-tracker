import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 })

    const { data, error } = await supabase
      .from('research_notes')
      .select('*')
      .order('note_date', { ascending: false })

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true, items: data ?? [] })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 })

    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })

    const title = String(body.title ?? '').trim()
    const content = String(body.content ?? '').trim()
    if (!title) return NextResponse.json({ ok: false, error: 'Missing title' }, { status: 400 })
    if (!content) return NextResponse.json({ ok: false, error: 'Missing content' }, { status: 400 })

    const { data, error } = await supabase
      .from('research_notes')
      .insert({
        user_id: user.id,
        note_date: body.note_date ?? new Date().toISOString().slice(0, 10),
        category: body.category ?? 'observation',
        title,
        content,
        related_peptides: Array.isArray(body.related_peptides) ? body.related_peptides : [],
        patent_relevant: body.patent_relevant === true,
        novelty_claim: body.novelty_claim ?? null,
        action_required: body.action_required ?? null,
        action_completed: body.action_completed === true,
        tags: Array.isArray(body.tags) ? body.tags : [],
      })
      .select('id')
      .single()

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true, id: data?.id })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
