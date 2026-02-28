import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    let supabaseHost: string | null = null
    try {
      supabaseHost = supabaseUrl ? new URL(supabaseUrl).host : null
    } catch {
      supabaseHost = null
    }

    return NextResponse.json({
      ok: true,
      authed: Boolean(user),
      user: user
        ? {
            id: user.id,
            email: user.email ?? null,
          }
        : null,
      env: {
        vercelEnv: process.env.VERCEL_ENV ?? null,
        nodeEnv: process.env.NODE_ENV ?? null,
      },
      supabase: {
        urlHost: supabaseHost,
      },
    })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
