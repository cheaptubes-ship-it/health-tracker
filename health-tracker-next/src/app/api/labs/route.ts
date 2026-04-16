import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

function n(v: unknown) {
  if (v == null || v === '') return null
  const x = Number(v)
  return Number.isFinite(x) ? x : null
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 })

    const { data, error } = await supabase
      .from('lab_results')
      .select('*')
      .order('test_date', { ascending: false })

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

    const test_date = String(body.test_date ?? '').trim()
    if (!test_date) return NextResponse.json({ ok: false, error: 'Missing test_date' }, { status: 400 })

    const { error } = await supabase.from('lab_results').insert({
      user_id: user.id,
      test_date,
      lab_name: body.lab_name ?? null,
      glucose_fasting: n(body.glucose_fasting),
      hba1c: n(body.hba1c),
      insulin_fasting: n(body.insulin_fasting),
      total_cholesterol: n(body.total_cholesterol),
      ldl: n(body.ldl),
      hdl: n(body.hdl),
      triglycerides: n(body.triglycerides),
      crp_hs: n(body.crp_hs),
      il6: n(body.il6),
      igf1: n(body.igf1),
      testosterone_total: n(body.testosterone_total),
      testosterone_free: n(body.testosterone_free),
      cortisol_am: n(body.cortisol_am),
      dhea_s: n(body.dhea_s),
      tsh: n(body.tsh),
      t3_free: n(body.t3_free),
      t4_free: n(body.t4_free),
      alt: n(body.alt),
      ast: n(body.ast),
      ggt: n(body.ggt),
      albumin: n(body.albumin),
      creatinine: n(body.creatinine),
      egfr: n(body.egfr),
      bdnf_serum: n(body.bdnf_serum),
      nfl_serum: n(body.nfl_serum),
      nad_whole_blood: n(body.nad_whole_blood),
      vitamin_d: n(body.vitamin_d),
      magnesium: n(body.magnesium),
      zinc: n(body.zinc),
      b12_serum: n(body.b12_serum),
      notes: body.notes ?? null,
      ordering_physician: body.ordering_physician ?? null,
    })

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
