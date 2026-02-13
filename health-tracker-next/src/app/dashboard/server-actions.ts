'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function addWeight(formData: FormData) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const entry_date = String(formData.get('entry_date') ?? '').trim()
  const weight_lbs = Number(String(formData.get('weight_lbs') ?? '').trim())

  const { error } = await supabase.from('weight_entries').insert({
    user_id: user.id,
    entry_date: entry_date || undefined,
    weight_lbs,
  })

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard')
}
