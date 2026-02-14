import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { MESO1_BASIC_HYPERTROPHY } from '@/lib/training/template-meso1'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 })

    const body = await req.json().catch(() => null)
    const name = String(body?.name ?? MESO1_BASIC_HYPERTROPHY.name).trim() || MESO1_BASIC_HYPERTROPHY.name

    const ins = await supabase
      .from('training_programs')
      .insert({ user_id: user.id, template_id: MESO1_BASIC_HYPERTROPHY.id, name })
      .select('id')
      .single()

    if (ins.error) return NextResponse.json({ ok: false, error: ins.error.message }, { status: 400 })

    const programId = ins.data.id

    const slotsPayload = MESO1_BASIC_HYPERTROPHY.slots.map((s) => ({
      program_id: programId,
      day_index: s.dayIndex,
      slot_index: s.slotIndex,
      slot_key: s.slotKey,
      slot_label: s.slotLabel,
      default_sets: s.defaultSets,
    }))

    const slotsIns = await supabase.from('training_program_slots').insert(slotsPayload)
    if (slotsIns.error) {
      return NextResponse.json({ ok: false, error: slotsIns.error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true, programId })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
