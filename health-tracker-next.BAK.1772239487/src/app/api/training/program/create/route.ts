import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { MESO1_BASIC_HYPERTROPHY } from '@/lib/training/template-meso1'
import { parseTrainingTemplateXlsx } from '@/lib/training/parse-xlsx-template'

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

    // If the user uploaded a template, use it to seed program slots.
    const admin = createSupabaseAdminClient()
    const { data: settings } = await admin
      .from('user_settings')
      .select('training_template_bucket, training_template_path, training_template_sheet')
      .eq('user_id', user.id)
      .maybeSingle()

    const bucket = settings?.training_template_bucket ?? null
    const path = settings?.training_template_path ?? null
    const sheet = settings?.training_template_sheet ?? 'Mesocycle 1 Basic Hypertrophy'

    let templateSlots = MESO1_BASIC_HYPERTROPHY.slots
    if (bucket && path) {
      const dl = await admin.storage.from(bucket).download(path)
      if (dl.error) return NextResponse.json({ ok: false, error: dl.error.message }, { status: 400 })
      const buf = Buffer.from(await dl.data.arrayBuffer())
      const parsed = parseTrainingTemplateXlsx(buf, sheet)
      templateSlots = parsed.slots.map((s) => ({
        dayIndex: s.dayIndex,
        slotIndex: s.slotIndex,
        slotKey: s.slotKey,
        slotLabel: s.slotLabel,
        defaultSets: s.defaultSets ?? 2,
      })) as any
    }

    // Ensure there is only one active program per user.
    await supabase
      .from('training_programs')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('status', 'active')

    const ins = await supabase
      .from('training_programs')
      .insert({ user_id: user.id, template_id: MESO1_BASIC_HYPERTROPHY.id, name, status: 'active' })
      .select('id')
      .single()

    if (ins.error) return NextResponse.json({ ok: false, error: ins.error.message }, { status: 400 })

    const programId = ins.data.id

    const slotsPayload = templateSlots.map((s) => ({
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
