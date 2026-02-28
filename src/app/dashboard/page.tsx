import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  addFoodFromFavorite,
  addPeptide,
  addVitals,
  deleteFood,
  deleteFavorite,
} from './server-actions'
import { FoodClient } from './food-client'
import { SettingsClient } from './settings-client'
import { PeptideList } from './peptide-list'
import { PeptidesClient } from './peptides-client'
import { PeptideScheduleClient } from './peptide-schedule-client'
import { PeptideQuickLogClient, type Item as PeptideScheduleItem, type TakenEntry as PeptideTakenEntry } from './peptide-quick-log-client'
import { VitalsList } from './vitals-list'
import { WeightClient } from './weight-client'
import { TrendsClient } from './trends-client'
import { HydrationClient } from './hydration-client'
import type { HydrationEntry } from './hydration-types'
import { SummaryClient } from './summary-client'
import type { SummaryRange, SummaryStats } from './summary-types'
import { TrainingClient } from './training-client'
import { ActivityClient } from './activity-client'
import { SleepClient, type SleepEntry } from './sleep-client'
import { FastingClient } from './fasting-client'

function formatDate(d: Date) {
  // Local calendar date (NOT UTC). Using toISOString() will flip the day early in US time zones.
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDateInTz(tz: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const y = parts.find((p) => p.type === 'year')?.value
  const m = parts.find((p) => p.type === 'month')?.value
  const d = parts.find((p) => p.type === 'day')?.value
  return y && m && d ? `${y}-${m}-${d}` : formatDate(new Date())
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; date?: string; range?: SummaryRange }>
}) {
  const { tab = 'food', date, range } = await searchParams
  // If the user didn't explicitly pick a date, keep the URL clean and always default to "today".
  // This avoids getting "stuck" on yesterday when you revisit /dashboard or switch tabs.
  const hasExplicitDate = typeof date === 'string' && date.trim().length > 0
  // selectedDate is finalized after we load user settings (timezone)
  const summaryRange: SummaryRange = range ?? 'day'

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <main className="min-h-screen p-8">
        <p>Not signed in.</p>
        <Link className="underline" href="/login">
          Go to login
        </Link>
      </main>
    )
  }

  // Timezone (per-user). Used for date defaults + day-of-week schedules.
  const { data: userSettings } = await supabase
    .from('user_settings')
    .select('timezone')
    .maybeSingle()

  const timezone = userSettings?.timezone ?? 'America/New_York'

  const selectedDate = hasExplicitDate ? date : formatDateInTz(timezone)

  function addDaysYmd(ymd: string, delta: number) {
    const d = new Date(ymd + 'T00:00:00')
    d.setDate(d.getDate() + delta)
    return formatDate(d)
  }

  const [
    { data: food },
    { data: vitals },
    { data: peptides },
    { data: weights },
    { data: hydration },
    { data: hydrationTargets },
    { data: shortcutsTokenRow },
    { data: sleep },
    { data: peptideSchedule },
    { data: peptideTakenToday },
    { data: stepsLatest },
    { data: cardioLatest },
    { data: foodPrevDay },
  ] = await Promise.all([
    supabase
      .from('food_entries')
      .select('id, name, calories, protein_g, carbs_g, fat_g, note, created_at, source')
      .eq('entry_date', selectedDate)
      .order('created_at', { ascending: false }),
    supabase
      .from('vitals_entries')
      .select('systolic, diastolic, pulse')
      .eq('entry_date', selectedDate)
      .order('created_at', { ascending: false }),
    supabase
      .from('peptide_entries')
      .select('actual_dose_mcg, status')
      .eq('entry_date', selectedDate)
      .order('created_at', { ascending: false }),
    supabase
      .from('weight_entries')
      .select('weight_lbs, entry_date')
      // Use the most recent weight on or before the selected date.
      // This keeps backfilled days from prefilling with a future weight.
      .lte('entry_date', selectedDate)
      .order('entry_date', { ascending: false })
      .limit(1),
    supabase
      .from('hydration_entries')
      .select('id, name, servings, water_ml, sodium_mg, potassium_mg, magnesium_mg, caffeine_mg, sugar_g, lemon_juice, created_at')
      .eq('entry_date', selectedDate)
      .order('created_at', { ascending: false }),
    supabase
      .from('hydration_targets')
      .select('unit_pref, water_ml, sodium_mg, potassium_mg, magnesium_mg')
      .maybeSingle(),
    supabase.from('shortcuts_tokens').select('token').maybeSingle(),
    supabase
      .from('sleep_entries')
      .select('id, entry_date, sleep_start_at, sleep_end_at, quality, note, created_at')
      .eq('entry_date', selectedDate)
      .order('created_at', { ascending: false }),
    supabase
      .from('peptide_schedules')
      .select('id, normalized_name, display_name, dose_value, dose_unit, timing, days_of_week, active')
      .order('display_name', { ascending: true })
      .order('timing', { ascending: true }),
    supabase
      .from('peptide_entries')
      .select('id, name, timing, status, entry_date')
      .eq('entry_date', selectedDate)
      .eq('status', 'taken')
      .order('taken_at', { ascending: false }),
    supabase
      .from('steps_entries')
      .select('entry_date, steps, updated_at')
      .order('updated_at', { ascending: false })
      .limit(1),
    supabase
      .from('cardio_entries')
      .select('kind, started_at, ended_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(1),
    // Previous day macros (quick reference)
    supabase
      .from('food_entries')
      .select('calories, protein_g, carbs_g, fat_g')
      .eq('entry_date', addDaysYmd(selectedDate, -1)),
  ])

  const shortcutsToken = shortcutsTokenRow?.token ?? null

  const { data: favorites } = await supabase
    .from('favorite_foods')
    .select('id, name, calories, protein_g, carbs_g, fat_g')
    .order('created_at', { ascending: false })
    .limit(30)

  const { data: targets } = await supabase
    .from('macro_targets')
    .select('calories, protein_g, carbs_g, fat_g')
    .maybeSingle()

  const hydrationTotals = {
    water_ml: (hydration ?? []).reduce((s, r) => s + Number(r.water_ml ?? 0), 0),
    sodium_mg: (hydration ?? []).reduce((s, r) => s + Number(r.sodium_mg ?? 0), 0),
    potassium_mg: (hydration ?? []).reduce((s, r) => s + Number(r.potassium_mg ?? 0), 0),
    magnesium_mg: (hydration ?? []).reduce((s, r) => s + Number(r.magnesium_mg ?? 0), 0),
    caffeine_mg: (hydration ?? []).reduce((s, r) => s + Number(r.caffeine_mg ?? 0), 0),
    sugar_g: (hydration ?? []).reduce((s, r) => s + Number(r.sugar_g ?? 0), 0),
  }

  const totals = {
    calories: (food ?? []).reduce((s, f) => s + Number(f.calories ?? 0), 0),
    protein: (food ?? []).reduce((s, f) => s + Number(f.protein_g ?? 0), 0),
    carbs: (food ?? []).reduce((s, f) => s + Number(f.carbs_g ?? 0), 0),
    fat: (food ?? []).reduce((s, f) => s + Number(f.fat_g ?? 0), 0),
    peptideTakenMcg: (peptides ?? [])
      .filter((p) => p.status === 'taken')
      .reduce((s, p) => s + Number(p.actual_dose_mcg ?? 0), 0),
    systolic:
      vitals && vitals.length
        ? Math.round(vitals.reduce((s, v) => s + v.systolic, 0) / vitals.length)
        : null,
    diastolic:
      vitals && vitals.length
        ? Math.round(vitals.reduce((s, v) => s + v.diastolic, 0) / vitals.length)
        : null,
    pulse:
      vitals && vitals.length
        ? Math.round(
            vitals.reduce((s, v) => s + Number(v.pulse ?? 0), 0) / vitals.length
          )
        : null,
    lastWeight: weights?.[0]?.weight_lbs ?? null,
  }

  const remaining = {
    calories:
      targets?.calories != null ? Math.max(0, targets.calories - totals.calories) : null,
    protein:
      targets?.protein_g != null
        ? Math.max(0, targets.protein_g - totals.protein)
        : null,
    carbs:
      targets?.carbs_g != null ? Math.max(0, targets.carbs_g - totals.carbs) : null,
    fat: targets?.fat_g != null ? Math.max(0, targets.fat_g - totals.fat) : null,
  }

  function addDays(ymd: string, delta: number) {
    return addDaysYmd(ymd, delta)
  }

  function rangeStartEnd(endYmd: string, r: SummaryRange) {
    if (r === 'day') return { start: endYmd, end: endYmd }
    if (r === 'week') return { start: addDays(endYmd, -6), end: endYmd }
    if (r === 'month') return { start: addDays(endYmd, -29), end: endYmd }
    return { start: addDays(endYmd, -364), end: endYmd }
  }

  const summaryWindow = rangeStartEnd(selectedDate, summaryRange)

  const [foodSum, vitalsSum, peptidesSum, weightSum, hydrationSum, sleepSum, fastingWin, stepsDay, prevWeightRow] = await Promise.all([
    supabase
      .from('food_entries')
      .select('calories, protein_g, carbs_g, fat_g')
      .gte('entry_date', summaryWindow.start)
      .lte('entry_date', summaryWindow.end),
    supabase
      .from('vitals_entries')
      .select('systolic, diastolic, pulse')
      .gte('entry_date', summaryWindow.start)
      .lte('entry_date', summaryWindow.end),
    supabase
      .from('peptide_entries')
      .select('actual_dose_mcg, status')
      .eq('status', 'taken')
      .gte('entry_date', summaryWindow.start)
      .lte('entry_date', summaryWindow.end),
    supabase
      .from('weight_entries')
      .select('entry_date, weight_lbs, created_at')
      .gte('entry_date', summaryWindow.start)
      .lte('entry_date', summaryWindow.end)
      .order('entry_date', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('hydration_entries')
      .select('water_ml, sodium_mg, potassium_mg, magnesium_mg')
      .gte('entry_date', summaryWindow.start)
      .lte('entry_date', summaryWindow.end),
    supabase
      .from('sleep_entries')
      .select('entry_date, sleep_start_at, sleep_end_at, quality')
      .gte('entry_date', summaryWindow.start)
      .lte('entry_date', summaryWindow.end),
    // Fasting is a point-in-time status; we show it for the currently selected date.
    supabase
      .from('fasting_windows')
      .select('fast_start_at, fast_end_at')
      .eq('entry_date', selectedDate)
      .maybeSingle(),
    // Steps for the selected date (imported from Shortcuts)
    supabase
      .from('steps_entries')
      .select('steps, entry_date, updated_at')
      .eq('entry_date', selectedDate)
      .order('updated_at', { ascending: false })
      .limit(1),
    // Previous weight before selected date (for day delta)
    supabase
      .from('weight_entries')
      .select('weight_lbs, entry_date')
      .lt('entry_date', selectedDate)
      .order('entry_date', { ascending: false })
      .limit(1),
  ])

  const vitalsRows = vitalsSum.data ?? []
  const vitalsAgg = vitalsRows.reduce(
    (acc, r) => {
      acc.n += 1
      acc.sys += Number(r.systolic)
      acc.dia += Number(r.diastolic)
      acc.pulse += Number(r.pulse ?? 0)
      return acc
    },
    { n: 0, sys: 0, dia: 0, pulse: 0 }
  )

  const weightRows = weightSum.data ?? []
  const weightFirst = weightRows.length ? Number(weightRows[0].weight_lbs) : null
  const weightLast = weightRows.length ? Number(weightRows[weightRows.length - 1].weight_lbs) : null

  const prevWeight = prevWeightRow?.data?.[0]?.weight_lbs != null ? Number(prevWeightRow.data[0].weight_lbs) : null

  // For day range, delta is more useful as change vs previous weight entry.
  const weightDelta =
    summaryRange === 'day'
      ? prevWeight != null && weightLast != null
        ? Number((weightLast - prevWeight).toFixed(1))
        : null
      : weightFirst != null && weightLast != null
        ? Number((weightLast - weightFirst).toFixed(1))
        : null

  // Sleep summary
  const sleepRows = sleepSum.data ?? []
  const sleepDurationsMin = sleepRows
    .map((r) => {
      if (!r.sleep_start_at || !r.sleep_end_at) return null
      const a = new Date(r.sleep_start_at).getTime()
      const b = new Date(r.sleep_end_at).getTime()
      if (!Number.isFinite(a) || !Number.isFinite(b)) return null
      const min = Math.round((b - a) / 60000)
      return min > 0 ? min : null
    })
    .filter((x): x is number => typeof x === 'number')

  const sleepAvgMin = sleepDurationsMin.length
    ? Math.round(sleepDurationsMin.reduce((s, n) => s + n, 0) / sleepDurationsMin.length)
    : null

  const sleepQualityVals = sleepRows
    .map((r) => (r.quality == null ? null : Number(r.quality)))
    .filter((x): x is number => typeof x === 'number' && Number.isFinite(x))

  const sleepQualityAvg = sleepQualityVals.length
    ? Number((sleepQualityVals.reduce((s, n) => s + n, 0) / sleepQualityVals.length).toFixed(1))
    : null

  // "Last night" = entries for selectedDate (wake date). Use the most recent entry.
  const lastSleep = (sleep ?? []).length ? (sleep ?? [])[0] : null
  const lastSleepMin =
    lastSleep?.sleep_start_at && lastSleep?.sleep_end_at
      ? Math.max(
          0,
          Math.round(
            (new Date(lastSleep.sleep_end_at).getTime() - new Date(lastSleep.sleep_start_at).getTime()) /
              60000
          )
        )
      : null
  const lastSleepQuality = lastSleep?.quality != null ? Number(lastSleep.quality) : null

  const fastingActive = !!fastingWin.data?.fast_start_at && !fastingWin.data?.fast_end_at

  const summaryStats: SummaryStats = {
    range: summaryRange,
    start: summaryWindow.start,
    end: summaryWindow.end,

    fasting_active: fastingActive,

    calories: (foodSum.data ?? []).reduce((s, r) => s + Number(r.calories ?? 0), 0),
    protein_g: (foodSum.data ?? []).reduce((s, r) => s + Number(r.protein_g ?? 0), 0),
    carbs_g: (foodSum.data ?? []).reduce((s, r) => s + Number(r.carbs_g ?? 0), 0),
    fat_g: (foodSum.data ?? []).reduce((s, r) => s + Number(r.fat_g ?? 0), 0),

    prev_day: foodPrevDay
      ? {
          calories: (foodPrevDay ?? []).reduce((s, r) => s + Number(r.calories ?? 0), 0),
          protein_g: (foodPrevDay ?? []).reduce((s, r) => s + Number(r.protein_g ?? 0), 0),
          carbs_g: (foodPrevDay ?? []).reduce((s, r) => s + Number(r.carbs_g ?? 0), 0),
          fat_g: (foodPrevDay ?? []).reduce((s, r) => s + Number(r.fat_g ?? 0), 0),
        }
      : null,

    water_ml: (hydrationSum.data ?? []).reduce((s, r) => s + Number(r.water_ml ?? 0), 0),
    sodium_mg: (hydrationSum.data ?? []).reduce((s, r) => s + Number(r.sodium_mg ?? 0), 0),
    potassium_mg: (hydrationSum.data ?? []).reduce((s, r) => s + Number(r.potassium_mg ?? 0), 0),
    magnesium_mg: (hydrationSum.data ?? []).reduce((s, r) => s + Number(r.magnesium_mg ?? 0), 0),

    peptides_taken_mcg: (peptidesSum.data ?? []).reduce((s, r) => s + Number(r.actual_dose_mcg ?? 0), 0),

    steps: {
      today: stepsDay.data?.[0]?.steps != null ? Number(stepsDay.data?.[0]?.steps) : null,
    },

    sleep: {
      avg_duration_min: sleepAvgMin,
      quality_avg: sleepQualityAvg,
      nights: sleepDurationsMin.length,
      last_duration_min: lastSleepMin,
      last_quality: lastSleepQuality,
    },

    vitals: {
      systolic_avg: vitalsAgg.n ? Math.round(vitalsAgg.sys / vitalsAgg.n) : null,
      diastolic_avg: vitalsAgg.n ? Math.round(vitalsAgg.dia / vitalsAgg.n) : null,
      pulse_avg: vitalsAgg.n ? Math.round(vitalsAgg.pulse / vitalsAgg.n) : null,
      n: vitalsAgg.n,
    },

    weight: {
      first: weightFirst,
      last: weightLast,
      delta: weightDelta,
      prev: prevWeight,
    },
  }

  // Trends (last 30 days)
  const days = 30
  const today = new Date(selectedDate + 'T00:00:00')
  const dayKeys: string[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    dayKeys.push(formatDate(d))
  }

  const [food30, vitals30, peptides30, weight30] = await Promise.all([
    supabase
      .from('food_entries')
      .select('entry_date, calories, protein_g, carbs_g, fat_g')
      .gte('entry_date', dayKeys[0])
      .lte('entry_date', dayKeys[dayKeys.length - 1]),
    supabase
      .from('vitals_entries')
      .select('entry_date, systolic, diastolic, pulse')
      .gte('entry_date', dayKeys[0])
      .lte('entry_date', dayKeys[dayKeys.length - 1]),
    supabase
      .from('peptide_entries')
      .select('entry_date, name, actual_dose_mcg, status')
      .eq('status', 'taken')
      .gte('entry_date', dayKeys[0])
      .lte('entry_date', dayKeys[dayKeys.length - 1]),
    supabase
      .from('weight_entries')
      .select('entry_date, weight_lbs, created_at')
      .gte('entry_date', dayKeys[0])
      .lte('entry_date', dayKeys[dayKeys.length - 1])
      .order('created_at', { ascending: true }),
  ])

  const caloriesByDay = new Map<string, number>()
  const proteinByDay = new Map<string, number>()
  const carbsByDay = new Map<string, number>()
  const fatByDay = new Map<string, number>()

  for (const r of food30.data ?? []) {
    caloriesByDay.set(
      r.entry_date,
      (caloriesByDay.get(r.entry_date) ?? 0) + Number(r.calories ?? 0)
    )
    proteinByDay.set(
      r.entry_date,
      (proteinByDay.get(r.entry_date) ?? 0) + Number(r.protein_g ?? 0)
    )
    carbsByDay.set(r.entry_date, (carbsByDay.get(r.entry_date) ?? 0) + Number(r.carbs_g ?? 0))
    fatByDay.set(r.entry_date, (fatByDay.get(r.entry_date) ?? 0) + Number(r.fat_g ?? 0))
  }

  const vitalsAggByDay = new Map<
    string,
    { n: number; sys: number; dia: number; pulse: number }
  >()
  for (const r of vitals30.data ?? []) {
    const cur = vitalsAggByDay.get(r.entry_date) ?? { n: 0, sys: 0, dia: 0, pulse: 0 }
    cur.n += 1
    cur.sys += r.systolic
    cur.dia += r.diastolic
    cur.pulse += Number(r.pulse ?? 0)
    vitalsAggByDay.set(r.entry_date, cur)
  }

  function peptideKey(name: string) {
    return (
      'pep__' +
      name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
    )
  }

  // Normalize peptide names so the same peptide doesn't appear multiple times due to casing/punctuation.
  // e.g. "BPC-157" vs "bpc157" should be one series.
  function isAllLower(s: string) {
    return s === s.toLowerCase()
  }

  const keyToLabel = new Map<string, string>()
  for (const r of peptides30.data ?? []) {
    const raw = String(r.name ?? '').trim()
    if (!raw) continue
    const k = peptideKey(raw)
    const prev = keyToLabel.get(k)
    if (!prev) {
      keyToLabel.set(k, raw)
    } else {
      // Prefer a label with some capitalization/punctuation (looks nicer in legend).
      if (isAllLower(prev) && !isAllLower(raw)) keyToLabel.set(k, raw)
    }
  }

  const peptideKeys = Array.from(keyToLabel.keys()).sort((a, b) => {
    const la = keyToLabel.get(a) ?? a
    const lb = keyToLabel.get(b) ?? b
    return la.localeCompare(lb)
  })

  const peptideSeries = peptideKeys.map((key, idx) => {
    const palette = ['#a78bfa', '#22c55e', '#f97316', '#38bdf8', '#f43f5e', '#fbbf24']
    return { key, label: keyToLabel.get(key) ?? key, color: palette[idx % palette.length] }
  })

  const peptideByDay = new Map<string, Record<string, number>>()
  for (const r of peptides30.data ?? []) {
    const day = r.entry_date
    const raw = String(r.name ?? '').trim()
    if (!raw) continue
    const key = peptideKey(raw)
    const cur = peptideByDay.get(day) ?? {}
    cur[key] = (cur[key] ?? 0) + Number(r.actual_dose_mcg ?? 0)
    peptideByDay.set(day, cur)
  }

  const weightByDay = new Map<string, number>()
  for (const r of weight30.data ?? []) {
    weightByDay.set(r.entry_date, Number(r.weight_lbs))
  }

  const trendsPoints = dayKeys.map((k) => {
    const v = vitalsAggByDay.get(k)
    return {
      date: k.slice(5),
      calories: caloriesByDay.get(k) ?? null,
      protein_g: proteinByDay.get(k) ?? null,
      carbs_g: carbsByDay.get(k) ?? null,
      fat_g: fatByDay.get(k) ?? null,
      weight: weightByDay.get(k) ?? null,
      systolic: v ? Math.round(v.sys / v.n) : null,
      diastolic: v ? Math.round(v.dia / v.n) : null,
      pulse: v ? Math.round(v.pulse / v.n) : null,
      peptides_total_mcg: Object.values(peptideByDay.get(k) ?? {}).reduce((s, v) => s + v, 0),
      ...Object.fromEntries(Object.entries(peptideByDay.get(k) ?? {})),

    }
  })

  const tabs: Array<{ id: string; label: string }> = [
    { id: 'summary', label: 'Summary' },
    { id: 'trends', label: 'Trends' },
    { id: 'food', label: 'Food' },
    { id: 'sleep', label: 'Sleep' },
    { id: 'activity', label: 'Activity' },
    { id: 'training', label: 'Training' },
    { id: 'hydration', label: 'Hydration' },
    { id: 'peptides', label: 'Peptides' },
    { id: 'vitals', label: 'Vitals' },
    { id: 'weight', label: 'Weight' },
    { id: 'settings', label: 'Settings' },
  ]

  return (
    <main className="min-h-screen p-6 sm:p-8">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_40%_at_50%_0%,rgba(99,102,241,0.25),transparent_70%)]" />
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Dashboard</h1>
            <p className="text-sm text-slate-300">Signed in as {user.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <form action="/logout" method="post">
              <button className="rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 hover:bg-slate-900">Sign out</button>
            </form>
          </div>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="sr-only">Build {process.env.VERCEL_GIT_COMMIT_SHA ?? 'dev'}</div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <div className="text-xs text-slate-400">Calories</div>
              <div className="text-lg font-semibold">{totals.calories}</div>
              <div className="text-xs text-slate-300">
                P {Number(totals.protein).toFixed(1)} / C {Number(totals.carbs).toFixed(1)} / F {Number(totals.fat).toFixed(1)}
              </div>
              {targets?.calories != null ? (
                <div className="text-xs text-slate-400">
                  Remaining: {remaining.calories}
                </div>
              ) : null}
            </div>
            <div>
              <div className="text-xs text-slate-400">Peptides taken</div>
              <div className="text-lg font-semibold">
                {totals.peptideTakenMcg >= 1000
                  ? `${(totals.peptideTakenMcg / 1000).toFixed(2)} mg`
                  : `${Math.round(totals.peptideTakenMcg)} mcg`}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Avg BP</div>
              <div className="text-lg font-semibold">
                {totals.systolic && totals.diastolic
                  ? `${totals.systolic}/${totals.diastolic}`
                  : '—'}
              </div>
              <div className="text-xs text-slate-300">
                Pulse {totals.pulse ?? '—'}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Last weight</div>
              <div className="text-lg font-semibold">
                {totals.lastWeight != null ? `${totals.lastWeight} lb` : '—'}
              </div>
            </div>
          </div>

          <div className="flex items-end gap-3">
            <div className="hidden text-[10px] text-slate-500 sm:block">
              {process.env.VERCEL_GIT_COMMIT_SHA ? `build ${String(process.env.VERCEL_GIT_COMMIT_SHA).slice(0, 7)}` : ''}
            </div>
            <div>
              <div className="text-xs text-slate-400">Date</div>
              <form>
                <input type="hidden" name="tab" value={tab} />
                <input
                  className="rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  type="date"
                  name="date"
                  defaultValue={selectedDate}
                />
                <button className="ml-2 rounded-lg border border-slate-700 bg-slate-950/30 px-3 py-2 text-sm text-slate-100 hover:bg-slate-900">
                  Go
                </button>
              </form>
            </div>
          </div>
        </div>

        <nav className="flex flex-wrap gap-2 rounded-xl border border-slate-800 bg-slate-900/20 p-2">
          {tabs.map((t) => (
            <Link
              key={t.id}
              href={
                hasExplicitDate
                  ? `/dashboard?tab=${t.id}&date=${selectedDate}`
                  : `/dashboard?tab=${t.id}`
              }
              className={`rounded-lg px-3 py-2 text-sm ${
                t.id === tab
                  ? 'bg-indigo-500 text-white'
                  : 'border border-slate-700 bg-slate-950/20 text-slate-100 hover:bg-slate-900/40'
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-4">
          {tab === 'food' ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Food</h2>
              </div>

              <FastingClient selectedDate={selectedDate} />

              {(() => {
                const rows = food ?? []
                const withCals = rows.filter((r) => Number(r.calories ?? 0) > 0)
                if (!withCals.length) return null
                const times = withCals
                  .map((r) => new Date(r.created_at).getTime())
                  .filter((t) => Number.isFinite(t))
                  .sort((a, b) => a - b)
                if (!times.length) return null

                const first = new Date(times[0])
                const last = new Date(times[times.length - 1])
                const durMin = Math.max(0, Math.round((times[times.length - 1] - times[0]) / 60000))
                const h = Math.floor(durMin / 60)
                const m = durMin % 60

                const fmt = (d: Date) =>
                  d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

                return (
                  <div className="rounded-xl border border-slate-800 bg-slate-950/20 p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium">Eating window</div>
                        <div className="text-xs text-slate-400">Derived from logged food entries (calories &gt; 0).</div>
                      </div>
                      <div className="text-sm text-slate-200">
                        {fmt(first)} → {fmt(last)}
                        <span className="ml-2 text-xs text-slate-400">
                          ({h}h {m}m)
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })()}

              {favorites && favorites.length ? (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Favorites</div>
                  {favorites.length > 10 ? (
                    <div className="flex flex-wrap items-end gap-2">
                      <p className="text-xs text-slate-400">Tip: use search, or pick a favorite below.</p>
                      <form action={addFoodFromFavorite} className="flex flex-wrap items-end gap-2">
                        <input type="hidden" name="entry_date" value={selectedDate} />
                        <label className="grid gap-1 text-sm text-slate-200">
                          Item
                          <select
                            name="favorite_id"
                            className="h-10 min-w-64 rounded-lg border border-slate-700 bg-slate-950/40 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            defaultValue={favorites[0].id}
                          >
                            {favorites.map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="grid gap-1 text-sm text-slate-200">
                          Servings
                          <input
                            name="servings"
                            type="number"
                            step="0.01"
                            min={0.01}
                            defaultValue={1}
                            className="h-10 w-24 rounded-lg border border-slate-700 bg-slate-950/40 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </label>
                        <button className="h-10 rounded-lg bg-indigo-500 px-3 text-sm font-medium text-white hover:bg-indigo-400">
                          Add
                        </button>
                      </form>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {favorites.map((f) => (
                        <div key={f.id} className="flex items-center gap-2">
                          <form action={addFoodFromFavorite} className="flex items-center gap-2">
                            <input type="hidden" name="entry_date" value={selectedDate} />
                            <input type="hidden" name="favorite_id" value={f.id} />
                            <input
                              name="servings"
                              type="number"
                              step="0.01"
                              min={0.01}
                              defaultValue={1}
                              className="w-20 rounded-full border border-slate-700 bg-slate-950/30 px-2 py-1 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              title="Servings"
                            />
                            <button className="rounded-full border border-slate-700 bg-slate-950/30 px-3 py-1 text-sm text-slate-100 hover:bg-slate-900/50">
                              Add {f.name}
                            </button>
                          </form>
                          <form action={deleteFavorite}>
                            <input type="hidden" name="id" value={f.id} />
                            <button
                              className="rounded-full border border-slate-700 bg-slate-950/10 px-2 py-1 text-xs text-slate-200 hover:bg-slate-900"
                              title="Remove from favorites"
                            >
                              ✕
                            </button>
                          </form>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              <FoodClient
                selectedDate={selectedDate}
                prevDay={
                  foodPrevDay
                    ? {
                        calories: (foodPrevDay ?? []).reduce((s, r) => s + Number(r.calories ?? 0), 0),
                        protein: (foodPrevDay ?? []).reduce((s, r) => s + Number(r.protein_g ?? 0), 0),
                        carbs: (foodPrevDay ?? []).reduce((s, r) => s + Number(r.carbs_g ?? 0), 0),
                        fat: (foodPrevDay ?? []).reduce((s, r) => s + Number(r.fat_g ?? 0), 0),
                      }
                    : null
                }
              />


              <div className="rounded-xl border border-slate-800 bg-slate-950/20 p-4">
                <div className="flex items-baseline justify-between">
                  <h3 className="font-medium">Entries ({food?.length ?? 0})</h3>
                  <p className="text-xs text-slate-400">{selectedDate}</p>
                </div>
                {food && food.length ? (
                  <ul className="mt-3 divide-y">
                    {food.map((e) => (
                      <li key={e.id} className="py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-medium">{e.name}</div>
                            <div className="text-sm text-slate-200">
                              {Number(e.calories)} cal • P {Number(e.protein_g)} / C{' '}
                              {Number(e.carbs_g)} / F {Number(e.fat_g)}
                              <span className="ml-2 text-xs text-slate-400">({e.source})</span>
                            </div>
                            {e.note ? (
                              <div className="mt-1 whitespace-pre-wrap text-xs text-slate-300">
                                {e.note}
                              </div>
                            ) : null}
                          </div>

                          <div className="flex gap-2">
                            <form action={deleteFood}>
                              <input type="hidden" name="id" value={e.id} />
                              <button className="rounded-lg border border-slate-700 bg-slate-950/30 px-2 py-1 text-xs text-slate-100 hover:bg-slate-900/50">
                                Delete
                              </button>
                            </form>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-slate-300">No food entries yet.</p>
                )}
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/20 p-4">
                <h3 className="font-medium">Macro coach</h3>
                {targets?.calories != null ? (
                  <>
                    <ul className="mt-2 list-disc pl-5 text-sm text-slate-200">
                      <li>Calories remaining: {remaining.calories}</li>
                      <li>Protein remaining: {remaining.protein ?? '—'}</li>
                      <li>Carbs remaining: {remaining.carbs ?? '—'}</li>
                      <li>Fat remaining: {remaining.fat ?? '—'}</li>
                    </ul>
                    {favorites && favorites.length ? (
                      <div className="mt-3">
                        <div className="text-sm font-medium">Suggested favorites</div>
                        <div className="mt-2 grid gap-2">
                          {favorites
                            .map((f) => {
                              const remP = remaining.protein ?? 0
                              const remC = remaining.carbs ?? 0
                              const remF = remaining.fat ?? 0
                              // score: prefer high protein when protein remaining is high, and avoid overshooting fat/carbs.
                              const p = Number(f.protein_g ?? 0)
                              const c = Number(f.carbs_g ?? 0)
                              const fat = Number(f.fat_g ?? 0)
                              const score =
                                (remP > 0 ? Math.min(p, remP) * 3 : 0) +
                                (remC > 0 ? Math.min(c, remC) * 1 : 0) +
                                (remF > 0 ? Math.min(fat, remF) * 1 : 0) -
                                Math.max(0, fat - remF) * 2 -
                                Math.max(0, c - remC) * 1.5
                              return { f, score }
                            })
                            .sort((a, b) => b.score - a.score)
                            .slice(0, 3)
                            .map(({ f }) => (
                              <form key={f.id} action={addFoodFromFavorite} className="grid gap-2">
                                <input type="hidden" name="entry_date" value={selectedDate} />
                                <input type="hidden" name="favorite_id" value={f.id} />
                                <div className="flex items-center gap-2">
                                  <input
                                    name="servings"
                                    type="number"
                                    step="0.01"
                                    min={0.01}
                                    defaultValue={1}
                                    className="w-20 rounded-lg border border-slate-700 bg-slate-950/30 px-2 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    title="Servings"
                                  />
                                  <button className="w-full rounded-lg border border-slate-700 bg-slate-950/30 px-3 py-2 text-left text-sm text-slate-100 hover:bg-slate-900/50">
                                  <div className="font-medium">{f.name}</div>
                                  <div className="text-xs text-slate-300">
                                    {Number(f.calories)} cal • P {Number(f.protein_g)} / C {Number(f.carbs_g)} / F {Number(f.fat_g)}
                                  </div>
                                  </button>
                                </div>
                              </form>
                            ))}
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p className="mt-2 text-sm text-slate-300">
                    Set macro targets in Settings to enable recommendations.
                  </p>
                )}
              </div>
            </div>
          ) : tab === 'vitals' ? (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Vitals</h2>

              <form action={addVitals} className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950/20 p-4">
                <input type="hidden" name="entry_date" value={selectedDate} />
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="grid gap-1 text-sm">
                    Systolic
                    <input name="systolic" type="number" step="1" className="rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
                  </label>
                  <label className="grid gap-1 text-sm">
                    Diastolic
                    <input name="diastolic" type="number" step="1" className="rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
                  </label>
                  <label className="grid gap-1 text-sm">
                    Pulse
                    <input name="pulse" type="number" step="1" className="rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </label>
                </div>
                <button className="w-fit rounded-lg bg-indigo-500 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-400">Add vitals</button>
              </form>

              <VitalsList selectedDate={selectedDate} timeZone={timezone} />
            </div>
          ) : tab === 'weight' ? (
            <WeightClient
              key={`${selectedDate}:${totals.lastWeight ?? 'none'}`}
              selectedDate={selectedDate}
              lastWeight={totals.lastWeight != null ? Number(totals.lastWeight) : null}
            />
          ) : tab === 'settings' ? (
            <SettingsClient
              shortcutsToken={shortcutsToken}
              shortcutsStatus={{
                steps: stepsLatest?.[0] ?? null,
                cardio: cardioLatest?.[0] ?? null,
              }}
              timezoneInitial={timezone}
              initial={
                targets
                  ? {
                      calories: targets.calories ?? null,
                      protein_g: targets.protein_g ?? null,
                      carbs_g: targets.carbs_g ?? null,
                      fat_g: targets.fat_g ?? null,
                      hydration: hydrationTargets
                        ? {
                            unit_pref: (hydrationTargets.unit_pref as 'oz' | 'ml') ?? 'oz',
                            water_ml: hydrationTargets.water_ml ?? null,
                            sodium_mg: hydrationTargets.sodium_mg ?? null,
                            potassium_mg: hydrationTargets.potassium_mg ?? null,
                            magnesium_mg: hydrationTargets.magnesium_mg ?? null,
                          }
                        : null,
                    }
                  : null
              }
            />
          ) : tab === 'activity' ? (
            <ActivityClient selectedDate={selectedDate} />
          ) : tab === 'training' ? (
            <TrainingClient selectedDate={selectedDate} />
          ) : $1<div className="text-2xl font-black text-red-500">HYDRATION_TAB_ACTIVE</div>
            <HydrationClient
              selectedDate={selectedDate}
              targets={
                hydrationTargets
                  ? {
                      unit_pref: (hydrationTargets.unit_pref as 'oz' | 'ml') ?? 'oz',
                      water_ml: hydrationTargets.water_ml ?? null,
                      sodium_mg: hydrationTargets.sodium_mg ?? null,
                      potassium_mg: hydrationTargets.potassium_mg ?? null,
                      magnesium_mg: hydrationTargets.magnesium_mg ?? null,
                    }
                  : null
              }
              totals={hydrationTotals}
                          </>
          ) : tab === 'summary' ? (
            <SummaryClient
              stats={summaryStats}
              selectedDate={selectedDate}
              timeZone={timezone}
              unitPref={(hydrationTargets?.unit_pref as 'oz' | 'ml') ?? 'oz'}
              lastWeightAsOf={totals.lastWeight != null ? Number(totals.lastWeight) : null}
            />
          ) : tab === 'sleep' ? (
            <SleepClient selectedDate={selectedDate} timeZone={timezone} entries={(sleep ?? []) as SleepEntry[]} />
          ) : tab === 'trends' ? (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Trends (last 30 days)</h2>
              <TrendsClient points={trendsPoints} peptideSeries={peptideSeries} />
            </div>
          ) : tab === 'peptides' ? (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Peptides</h2>

              <PeptideScheduleClient />

              <PeptideQuickLogClient
                selectedDate={selectedDate}
                timeZone={timezone}
                scheduleItems={(peptideSchedule ?? []) as PeptideScheduleItem[]}
                takenToday={(peptideTakenToday ?? []) as PeptideTakenEntry[]}
              />

              <div className="rounded-xl border border-slate-800 bg-slate-950/20 p-4">
                <div className="text-sm font-medium">Log a dose</div>
                <div className="mt-3">
                  <PeptidesClient selectedDate={selectedDate} addPeptideAction={addPeptide} />
                </div>
              </div>

              <PeptideList selectedDate={selectedDate} />
            </div>
          ) : (
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">{tab}</h2>
              <p className="text-sm text-slate-300">UI coming next. Backend tables + RLS are ready.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
