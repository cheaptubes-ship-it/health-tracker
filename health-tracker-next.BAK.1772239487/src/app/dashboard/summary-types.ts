export type SummaryRange = 'day' | 'week' | 'month' | 'year'

export type SummaryStats = {
  range: SummaryRange
  start: string // YYYY-MM-DD
  end: string // YYYY-MM-DD

  // True when a fasting window is currently in progress for the selected date.
  fasting_active: boolean

  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number

  prev_day: {
    calories: number
    protein_g: number
    carbs_g: number
    fat_g: number
  } | null

  water_ml: number
  sodium_mg: number
  potassium_mg: number
  magnesium_mg: number

  peptides_taken_mcg: number

  steps: {
    today: number | null
  }

  sleep: {
    avg_duration_min: number | null
    quality_avg: number | null
    nights: number
    last_duration_min: number | null
    last_quality: number | null
  }

  vitals: {
    systolic_avg: number | null
    diastolic_avg: number | null
    pulse_avg: number | null
    n: number
  }

  weight: {
    first: number | null
    last: number | null
    delta: number | null
    prev: number | null
  }
}
