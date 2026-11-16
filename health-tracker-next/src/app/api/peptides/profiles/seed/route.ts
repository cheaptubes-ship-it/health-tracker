import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { defaultProfileRows } from '@/lib/peptides/default-protocol'

export const runtime = 'nodejs'

// Defaults live in src/lib/peptides/default-protocol.ts
export async function POST() {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 })

    const profiles = defaultProfileRows(user.id)

    const { error } = await supabase.from('peptide_profiles').upsert(profiles, {
      onConflict: 'user_id,normalized_name',
    })

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true, count: profiles.length })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
