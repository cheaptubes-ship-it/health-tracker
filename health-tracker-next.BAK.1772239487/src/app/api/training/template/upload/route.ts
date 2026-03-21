import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const DEFAULT_BUCKET = 'training-templates'

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 })

    const fd = await req.formData().catch(() => null)
    if (!fd) return NextResponse.json({ ok: false, error: 'Invalid form data' }, { status: 400 })

    const file = fd.get('file')
    const sheet = String(fd.get('sheet') ?? 'Mesocycle 1 Basic Hypertrophy').trim() || 'Mesocycle 1 Basic Hypertrophy'

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: 'Missing file' }, { status: 400 })
    }

    const bytes = Buffer.from(await file.arrayBuffer())
    if (!bytes.length) return NextResponse.json({ ok: false, error: 'Empty file' }, { status: 400 })

    const admin = createSupabaseAdminClient()

    // Ensure bucket exists (ignore errors if it already exists)
    try {
      await admin.storage.createBucket(DEFAULT_BUCKET, { public: false })
    } catch {
      // ignore
    }

    const safeName = (file.name || 'template.xlsx').replace(/[^a-zA-Z0-9._-]+/g, '_')
    const path = `${user.id}/${Date.now()}_${safeName}`

    const up = await admin.storage.from(DEFAULT_BUCKET).upload(path, bytes, {
      contentType: file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      upsert: true,
    })

    if (up.error) return NextResponse.json({ ok: false, error: up.error.message }, { status: 400 })

    const { error: setErr } = await admin
      .from('user_settings')
      .upsert(
        {
          user_id: user.id,
          training_template_bucket: DEFAULT_BUCKET,
          training_template_path: path,
          training_template_sheet: sheet,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )

    if (setErr) return NextResponse.json({ ok: false, error: setErr.message }, { status: 400 })

    return NextResponse.json({ ok: true, bucket: DEFAULT_BUCKET, path, sheet })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
