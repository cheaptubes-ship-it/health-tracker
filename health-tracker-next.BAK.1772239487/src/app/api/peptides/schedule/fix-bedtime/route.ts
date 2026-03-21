import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { peptideKey } from '@/app/dashboard/peptides-utils'

export const runtime = 'nodejs'

/**
 * One-off helper: move specific "evening" schedules to Bedtime.
 * - BPC-157 bedtime dose (previously PM)
 * - TA-1 bedtime dose (previously PM)
 */
export async function POST() {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 })

    const targets = [
      { normalized_name: peptideKey('BPC-157'), from: 'pm', to: 'bedtime' },
      { normalized_name: peptideKey('TA-1'), from: 'pm', to: 'bedtime' },
    ] as const

    let updated = 0

    for (const t of targets) {
      const { data, error } = await supabase
        .from('peptide_schedules')
        .update({ timing: t.to })
        .eq('user_id', user.id)
        .eq('normalized_name', t.normalized_name)
        .eq('timing', t.from)
        .select('id')

      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
      updated += (data ?? []).length
    }

    return NextResponse.json({ ok: true, updated })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
