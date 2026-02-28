import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createSupabaseServerClient()

  // Simple DB connectivity check (no tables required)
  const { error } = await supabase.from('_nonexistent_table_').select('id').limit(1)

  // PostgREST will error with "relation does not exist" if DB/API is reachable.
  // Network/auth misconfig will typically yield different errors.
  return NextResponse.json({
    ok: true,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    hint:
      'If error message mentions relation/table not found, connectivity is OK. Otherwise check env vars.',
    error: error ? { message: error.message, details: 'details' in error ? String((error as unknown as { details?: unknown }).details ?? '') : '' } : null,
  })
}
// redeploy ping Mon Feb 16 06:37:02 EST 2026
