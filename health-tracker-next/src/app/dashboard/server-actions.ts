'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { calcPeptide } from './peptides-utils'

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
  const serving = s(formData.get('serving'))

  if (!name || calories == null) throw new Error('Missing fields')

  const { error } = await supabase.from('favorite_foods').insert({
    user_id: user.id,
    name,
    calories,
    protein_g,
    carbs_g,
    fat_g,
    serving,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
}

export async function deleteFavorite(formData: FormData) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const id = String(formData.get('id') ?? '')
  if (!id) return

  const { error } = await supabase.from('favorite_foods').delete().eq('id', id)
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
  const servingsRaw = String(formData.get('servings') ?? '1').trim()
  const servings = Number(servingsRaw)
  if (!id) throw new Error('Missing favorite')
  if (!Number.isFinite(servings) || servings <= 0) throw new Error('Invalid servings')

  const { data: fav, error: favErr } = await supabase
    .from('favorite_foods')
    .select('name, calories, protein_g, carbs_g, fat_g')
    .eq('id', id)
    .single()

  if (favErr) throw new Error(favErr.message)

  const mult = servings

  const { error } = await supabase.from('food_entries').insert({
    user_id: user.id,
    entry_date: entry_date || undefined,
    name: mult === 1 ? fav.name : `${fav.name} x${mult}`,
    calories: Math.round(Number(fav.calories ?? 0) * mult),
    protein_g: Number((Number(fav.protein_g ?? 0) * mult).toFixed(1)),
    carbs_g: Number((Number(fav.carbs_g ?? 0) * mult).toFixed(1)),
    fat_g: Number((Number(fav.fat_g ?? 0) * mult).toFixed(1)),
    source: 'favorite',
  })

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
}

export async function addVitals(formData: FormData) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const entry_date = String(formData.get('entry_date') ?? '').trim()
  const systolic = n(formData.get('systolic'))
  const diastolic = n(formData.get('diastolic'))
  const pulse = n(formData.get('pulse'))

  if (systolic == null || diastolic == null) throw new Error('Missing blood pressure')

  const { error } = await supabase.from('vitals_entries').insert({
    user_id: user.id,
    entry_date: entry_date || undefined,
    systolic,
    diastolic,
    pulse,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
}

export async function deleteVitals(formData: FormData) {
  const supabase = await createSupabaseServerClient()
  const id = String(formData.get('id') ?? '')
  if (!id) return

  const { error } = await supabase.from('vitals_entries').delete().eq('id', id)
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

function normalizePeptideName(raw: string) {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export async function addPeptide(formData: FormData) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const entry_date = String(formData.get('entry_date') ?? '').trim()
  const name = s(formData.get('name'))
  const vial_amount = n(formData.get('vial_amount'))
  const vial_unit = (String(formData.get('vial_unit') ?? 'mg') as 'mg' | 'mcg')
  const recon_volume_ml = n(formData.get('recon_volume_ml'))
  const desired_dose = n(formData.get('desired_dose'))
  const desired_dose_unit = (String(formData.get('desired_dose_unit') ?? 'mcg') as
    | 'mg'
    | 'mcg')
  const frequency = s(formData.get('frequency'))
  const timing = s(formData.get('timing'))
  const note = s(formData.get('note'))
  const side_effect_note = s(formData.get('side_effect_note'))
  const side_effect_tags = formData
    .getAll('side_effect_tags')
    .map((v) => String(v))
    .map((v) => v.trim())
    .filter(Boolean)

  const save_default_note = String(formData.get('save_default_note') ?? '') === 'on'
  const taken_now = String(formData.get('taken_now') ?? '') === 'on'

  if (!name) throw new Error('Missing name')
  if (vial_amount == null || recon_volume_ml == null || desired_dose == null) {
    throw new Error('Missing vial/dose fields')
  }

  const calc = calcPeptide({
    vial_amount,
    vial_unit,
    recon_volume_ml,
    desired_dose,
    desired_dose_unit,
  })

  const nowIso = new Date().toISOString()

  const { error } = await supabase.from('peptide_entries').insert({
    user_id: user.id,
    entry_date: entry_date || undefined,
    name,
    vial_amount,
    vial_unit,
    recon_volume_ml,
    desired_dose,
    desired_dose_unit,
    syringe_units: calc.syringe_units,
    concentration_mcg_per_ml: calc.concentration_mcg_per_ml,
    volume_needed_ml: calc.volume_needed_ml,
    actual_dose_mcg: calc.actual_dose_mcg,
    frequency,
    timing,
    status: taken_now ? 'taken' : 'pending',
    taken_at: taken_now ? nowIso : null,
    note: note || null,
    side_effect_note: side_effect_note || null,
    side_effect_tags: side_effect_tags.length ? side_effect_tags : null,
  })

  if (!error && save_default_note) {
    const normalized_name = normalizePeptideName(name)
    if (normalized_name) {
      await supabase.from('peptide_defaults').upsert(
        {
          user_id: user.id,
          normalized_name,
          display_name: name,
          default_note: note || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,normalized_name' }
      )
    }
  }

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
}

export async function setPeptideStatus(formData: FormData) {
  const supabase = await createSupabaseServerClient()
  const id = String(formData.get('id') ?? '')
  const status = String(formData.get('status') ?? '')
  if (!id || !status) return

  const patch: Record<string, unknown> = { status }
  if (status === 'taken') patch.taken_at = new Date().toISOString()

  const { error } = await supabase.from('peptide_entries').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
}

export async function deletePeptide(formData: FormData) {
  const supabase = await createSupabaseServerClient()
  const id = String(formData.get('id') ?? '')
  if (!id) return

  const { error } = await supabase.from('peptide_entries').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
}
