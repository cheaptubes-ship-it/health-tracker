'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function addEntry(formData: FormData) {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const entry_date_raw = String(formData.get('entry_date') ?? '').trim()
  const weight_raw = String(formData.get('weight_kg') ?? '').trim()
  const mood_raw = String(formData.get('mood') ?? '').trim()
  const sleep_raw = String(formData.get('sleep_hours') ?? '').trim()
  const notes = String(formData.get('notes') ?? '').trim() || null

  const payload: Record<string, unknown> = {
    user_id: user.id,
    notes,
  }

  if (entry_date_raw) payload.entry_date = entry_date_raw
  if (weight_raw) payload.weight_kg = Number(weight_raw)
  if (mood_raw) payload.mood = Number(mood_raw)
  if (sleep_raw) payload.sleep_hours = Number(sleep_raw)

  const { error } = await supabase.from('entries').insert(payload)
  if (error) throw new Error(error.message)

  revalidatePath('/dashboard')
}

export async function deleteEntry(formData: FormData) {
  const supabase = await createSupabaseServerClient()

  const id = String(formData.get('id') ?? '')
  if (!id) return

  const { error } = await supabase.from('entries').delete().eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath('/dashboard')
}
