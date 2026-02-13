'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'

function n(v: FormDataEntryValue | null) {
  if (v == null) return null
  const s = String(v).trim()
  if (!s) return null
  const num = Number(s)
  return Number.isFinite(num) ? num : null
}

function s(v: FormDataEntryValue | null) {
  const out = String(v ?? '').trim()
  return out ? out : null
}

export async function addWeight(formData: FormData) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const entry_date = String(formData.get('entry_date') ?? '').trim()
  const weight_lbs = n(formData.get('weight_lbs'))
  if (weight_lbs == null) throw new Error('Missing weight')

  const { error } = await supabase.from('weight_entries').insert({
    user_id: user.id,
    entry_date: entry_date || undefined,
    weight_lbs,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
}

export async function addFood(formData: FormData) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const entry_date = String(formData.get('entry_date') ?? '').trim()
  const name = s(formData.get('name'))
  const calories = n(formData.get('calories'))
  const protein_g = n(formData.get('protein_g')) ?? 0
  const carbs_g = n(formData.get('carbs_g')) ?? 0
  const fat_g = n(formData.get('fat_g')) ?? 0
  const source = String(formData.get('source') ?? 'manual')

  if (!name) throw new Error('Missing name')
  if (calories == null) throw new Error('Missing calories')

  const { error } = await supabase.from('food_entries').insert({
    user_id: user.id,
    entry_date: entry_date || undefined,
    name,
    calories,
    protein_g,
    carbs_g,
    fat_g,
    source,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
}

export async function deleteFood(formData: FormData) {
  const supabase = await createSupabaseServerClient()
  const id = String(formData.get('id') ?? '')
  if (!id) return
  const { error } = await supabase.from('food_entries').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
}

export async function saveFavoriteFromFood(formData: FormData) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const name = s(formData.get('name'))
  const calories = n(formData.get('calories'))
  const protein_g = n(formData.get('protein_g')) ?? 0
  const carbs_g = n(formData.get('carbs_g')) ?? 0
  const fat_g = n(formData.get('fat_g')) ?? 0

  if (!name || calories == null) throw new Error('Missing fields')

  const { error } = await supabase.from('favorite_foods').insert({
    user_id: user.id,
    name,
    calories,
    protein_g,
    carbs_g,
    fat_g,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
}

export async function addFoodFromFavorite(formData: FormData) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const entry_date = String(formData.get('entry_date') ?? '').trim()
  const id = String(formData.get('favorite_id') ?? '')
  if (!id) throw new Error('Missing favorite')

  const { data: fav, error: favErr } = await supabase
    .from('favorite_foods')
    .select('name, calories, protein_g, carbs_g, fat_g')
    .eq('id', id)
    .single()

  if (favErr) throw new Error(favErr.message)

  const { error } = await supabase.from('food_entries').insert({
    user_id: user.id,
    entry_date: entry_date || undefined,
    name: fav.name,
    calories: fav.calories,
    protein_g: fav.protein_g,
    carbs_g: fav.carbs_g,
    fat_g: fav.fat_g,
    source: 'favorite',
  })

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
}

export async function saveMacroTargets(formData: FormData) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const calories = n(formData.get('calories'))
  const protein_g = n(formData.get('protein_g'))
  const carbs_g = n(formData.get('carbs_g'))
  const fat_g = n(formData.get('fat_g'))

  const { error } = await supabase.from('macro_targets').upsert({
    user_id: user.id,
    calories,
    protein_g,
    carbs_g,
    fat_g,
    updated_at: new Date().toISOString(),
  })

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
}
