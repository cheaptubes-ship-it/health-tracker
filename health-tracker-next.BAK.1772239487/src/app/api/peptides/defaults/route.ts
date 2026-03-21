import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

function normalizeName(raw: string) {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export async function GET(req: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 })

    const url = new URL(req.url)
    const name = String(url.searchParams.get('name') ?? '')
    const normalized_name = normalizeName(name)
    if (!normalized_name) return NextResponse.json({ ok: true, default_note: null })

    const { data, error } = await supabase
      .from('peptide_defaults')
      .select('default_note, display_name')
      .eq('user_id', user.id)
      .eq('normalized_name', normalized_name)
      .maybeSingle()

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })

    return NextResponse.json({ ok: true, default_note: data?.default_note ?? null })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 })

    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })

    const name = String(body.name ?? '')
    const normalized_name = normalizeName(name)
    const default_note = body.default_note == null ? null : String(body.default_note)
    const display_name = String(body.display_name ?? name).trim() || null

    if (!normalized_name) {
      return NextResponse.json({ ok: false, error: 'Missing name' }, { status: 400 })
    }

    const { error } = await supabase.from('peptide_defaults').upsert(
      {
        user_id: user.id,
        normalized_name,
        display_name,
        default_note,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,normalized_name' }
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
