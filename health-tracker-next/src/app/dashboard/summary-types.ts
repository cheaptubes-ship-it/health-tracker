export type SummaryRange = 'day' | 'week' | 'month' | 'year'

export type SummaryStats = {
  range: SummaryRange
  start: string // YYYY-MM-DD
  end: string // YYYY-MM-DD

  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number

  water_ml: number
  sodium_mg: number
  potassium_mg: number
  magnesium_mg: number

  peptides_taken_mcg: number

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
  }
}
