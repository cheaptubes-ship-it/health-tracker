'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // For minimal UX, just log server-side.
    console.error('login error', error.message)
    return false
  }

  return true
}

export async function signup(formData: FormData) {
  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signUp({ email, password })

  if (error) {
    console.error('signup error', error.message)
    return false
  }

  return true
}
