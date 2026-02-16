import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 })

    const { data, error } = await supabase
      .from('user_settings')
      .select('training_template_bucket, training_template_path, training_template_sheet')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })

    return NextResponse.json({
      ok: true,
      template: {
        bucket: data?.training_template_bucket ?? null,
        path: data?.training_template_path ?? null,
        sheet: data?.training_template_sheet ?? null,
      },
    })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
