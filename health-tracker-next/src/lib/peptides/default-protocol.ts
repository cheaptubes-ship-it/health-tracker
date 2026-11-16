import { peptideKey } from '@/app/dashboard/peptides-utils'

/**
 * Default peptide protocol used by "Seed my schedule", "Reseed (overwrite)" and
 * "Seed vial profiles". Single source of truth so the three can't drift apart.
 *
 * Last updated: 2026-11-16. Day-to-day changes should be made with Edit/Delete
 * in the schedule list; update this only when the baseline protocol changes.
 */

// 0=Sun..6=Sat
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]
const WEEKDAYS = [1, 2, 3, 4, 5]

type ScheduleDefault = {
  display_name: string
  dose_value: number | null
  dose_unit: 'u' | 'mcg' | 'mg'
  timing: 'am' | 'pm' | 'bedtime'
  days_of_week: number[]
  active: boolean
  note?: string
}

type ProfileDefault = {
  display_name: string
  vial_amount: number
  vial_unit: 'mg' | 'mcg'
  recon_volume_ml: number
}

const DEFAULT_SCHEDULE: ScheduleDefault[] = [
  // Active
  { display_name: 'BPC-157', dose_value: 10, dose_unit: 'u', timing: 'am', days_of_week: ALL_DAYS, active: true },
  { display_name: 'BPC-157', dose_value: 10, dose_unit: 'u', timing: 'bedtime', days_of_week: ALL_DAYS, active: true },
  { display_name: 'TB4 (full chain)', dose_value: 30, dose_unit: 'u', timing: 'am', days_of_week: [1, 4], active: true },
  { display_name: 'Tesamorelin', dose_value: 20, dose_unit: 'u', timing: 'bedtime', days_of_week: ALL_DAYS, active: true, note: '2 mg, fasted' },

  // Paused
  { display_name: 'NAD+', dose_value: 15, dose_unit: 'u', timing: 'am', days_of_week: WEEKDAYS, active: false },
  { display_name: 'TA-1 (Thymosin Alpha-1)', dose_value: 30, dose_unit: 'u', timing: 'bedtime', days_of_week: [2, 5], active: false },
  { display_name: 'CJC-1295 / IPA', dose_value: 7, dose_unit: 'u', timing: 'bedtime', days_of_week: WEEKDAYS, active: false, note: 'Empty stomach' },
  { display_name: 'Retatrutide', dose_value: null, dose_unit: 'mg', timing: 'am', days_of_week: [0], active: false, note: 'Paused' },
]

// Vial contents + bacteriostatic water added. Used to convert syringe units -> mcg.
const DEFAULT_PROFILES: ProfileDefault[] = [
  { display_name: 'BPC-157', vial_amount: 30, vial_unit: 'mg', recon_volume_ml: 5.6 },
  { display_name: 'TB4 (full chain)', vial_amount: 30, vial_unit: 'mg', recon_volume_ml: 5.2 },
  { display_name: 'Tesamorelin', vial_amount: 45, vial_unit: 'mg', recon_volume_ml: 4 },
  { display_name: 'NAD+', vial_amount: 150, vial_unit: 'mg', recon_volume_ml: 0.75 },
  { display_name: 'TA-1 (Thymosin Alpha-1)', vial_amount: 10, vial_unit: 'mg', recon_volume_ml: 2 },
  { display_name: 'CJC-1295 / IPA', vial_amount: 10, vial_unit: 'mg', recon_volume_ml: 2 },
  { display_name: 'Retatrutide', vial_amount: 50, vial_unit: 'mg', recon_volume_ml: 10 },
]

/**
 * Schedule rows ready to insert. normalized_name is always derived from display_name,
 * so every schedule row links to its vial profile (quick log depends on that match).
 */
export function defaultScheduleRows(userId: string) {
  return DEFAULT_SCHEDULE.map((s) => ({
    user_id: userId,
    normalized_name: peptideKey(s.display_name),
    display_name: s.display_name,
    dose_value: s.dose_value,
    dose_unit: s.dose_unit,
    timing: s.timing,
    days_of_week: s.days_of_week,
    active: s.active,
    note: s.note ?? null,
  }))
}

export function defaultProfileRows(userId: string) {
  const now = new Date().toISOString()
  return DEFAULT_PROFILES.map((p) => ({
    user_id: userId,
    normalized_name: peptideKey(p.display_name),
    display_name: p.display_name,
    vial_amount: p.vial_amount,
    vial_unit: p.vial_unit,
    recon_volume_ml: p.recon_volume_ml,
    updated_at: now,
  }))
}
