import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  addFood,
  addFoodFromFavorite,
  addPeptide,
  addVitals,
  addWeight,
  deleteFood,
  saveFavoriteFromFood,
  saveMacroTargets,
} from './server-actions'
import { FoodClient } from './food-client'
import { PeptideList } from './peptide-list'
import { PeptidesClient } from './peptides-client'
import { VitalsList } from './vitals-list'
import { TrendsClient } from './trends-client'

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; date?: string }>
}) {
  const { tab = 'food', date } = await searchParams
  const selectedDate = date || formatDate(new Date())

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

  const [{ data: food }, { data: vitals }, { data: peptides }, { data: weights }] =
    await Promise.all([
      supabase
        .from('food_entries')
        .select('id, name, calories, protein_g, carbs_g, fat_g, created_at, source')
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
        .order('entry_date', { ascending: false })
        .limit(1),
    ])

  const { data: favorites } = await supabase
    .from('favorite_foods')
    .select('id, name, calories, protein_g, carbs_g, fat_g')
    .order('created_at', { ascending: false })
    .limit(30)

  const { data: targets } = await supabase
    .from('macro_targets')
    .select('calories, protein_g, carbs_g, fat_g')
    .maybeSingle()

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

  // Trends (last 30 days)
  const days = 30
  const today = new Date(selectedDate + 'T00:00:00')
  const dayKeys: string[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    dayKeys.push(d.toISOString().slice(0, 10))
  }

  const [food30, vitals30, peptides30, weight30] = await Promise.all([
    supabase
      .from('food_entries')
      .select('entry_date, calories')
      .gte('entry_date', dayKeys[0])
      .lte('entry_date', dayKeys[dayKeys.length - 1]),
    supabase
      .from('vitals_entries')
      .select('entry_date, systolic, diastolic, pulse')
      .gte('entry_date', dayKeys[0])
      .lte('entry_date', dayKeys[dayKeys.length - 1]),
    supabase
      .from('peptide_entries')
      .select('entry_date, actual_dose_mcg, status')
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
  for (const r of food30.data ?? []) {
    caloriesByDay.set(
      r.entry_date,
      (caloriesByDay.get(r.entry_date) ?? 0) + Number(r.calories ?? 0)
    )
  }

  const vitalsAgg = new Map<
    string,
    { n: number; sys: number; dia: number; pulse: number }
  >()
  for (const r of vitals30.data ?? []) {
    const cur = vitalsAgg.get(r.entry_date) ?? { n: 0, sys: 0, dia: 0, pulse: 0 }
    cur.n += 1
    cur.sys += r.systolic
    cur.dia += r.diastolic
    cur.pulse += Number(r.pulse ?? 0)
    vitalsAgg.set(r.entry_date, cur)
  }

  const peptideByDay = new Map<string, number>()
  for (const r of peptides30.data ?? []) {
    peptideByDay.set(
      r.entry_date,
      (peptideByDay.get(r.entry_date) ?? 0) + Number(r.actual_dose_mcg ?? 0)
    )
  }

  const weightByDay = new Map<string, number>()
  for (const r of weight30.data ?? []) {
    weightByDay.set(r.entry_date, Number(r.weight_lbs))
  }

  const trendsPoints = dayKeys.map((k) => {
    const v = vitalsAgg.get(k)
    return {
      date: k.slice(5),
      calories: caloriesByDay.get(k) ?? null,
      weight: weightByDay.get(k) ?? null,
      systolic: v ? Math.round(v.sys / v.n) : null,
      diastolic: v ? Math.round(v.dia / v.n) : null,
      pulse: v ? Math.round(v.pulse / v.n) : null,
      peptide_mcg: peptideByDay.get(k) ?? null,
    }
  })

  const tabs: Array<{ id: string; label: string }> = [
    { id: 'food', label: 'Food' },
    { id: 'peptides', label: 'Peptides' },
    { id: 'vitals', label: 'Vitals' },
    { id: 'weight', label: 'Weight' },
    { id: 'trends', label: 'Trends' },
    { id: 'settings', label: 'Settings' },
  ]

  return (
    <main className="min-h-screen p-6 sm:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Dashboard</h1>
            <p className="text-sm text-neutral-600">Signed in as {user.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <form action="/logout" method="post">
              <button className="rounded border px-3 py-2 text-sm">Sign out</button>
            </form>
          </div>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4 rounded-lg border p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <div className="text-xs text-neutral-500">Calories</div>
              <div className="text-lg font-semibold">{totals.calories}</div>
              <div className="text-xs text-neutral-600">
                P {totals.protein} / C {totals.carbs} / F {totals.fat}
              </div>
              {targets?.calories != null ? (
                <div className="text-xs text-neutral-500">
                  Remaining: {remaining.calories}
                </div>
              ) : null}
            </div>
            <div>
              <div className="text-xs text-neutral-500">Peptides taken</div>
              <div className="text-lg font-semibold">
                {totals.peptideTakenMcg >= 1000
                  ? `${(totals.peptideTakenMcg / 1000).toFixed(2)} mg`
                  : `${Math.round(totals.peptideTakenMcg)} mcg`}
              </div>
            </div>
            <div>
              <div className="text-xs text-neutral-500">Avg BP</div>
              <div className="text-lg font-semibold">
                {totals.systolic && totals.diastolic
                  ? `${totals.systolic}/${totals.diastolic}`
                  : '—'}
              </div>
              <div className="text-xs text-neutral-600">
                Pulse {totals.pulse ?? '—'}
              </div>
            </div>
            <div>
              <div className="text-xs text-neutral-500">Last weight</div>
              <div className="text-lg font-semibold">
                {totals.lastWeight != null ? `${totals.lastWeight} lb` : '—'}
              </div>
            </div>
          </div>

          <div className="flex items-end gap-3">
            <div>
              <div className="text-xs text-neutral-500">Date</div>
              <form>
                <input type="hidden" name="tab" value={tab} />
                <input
                  className="rounded border px-3 py-2 text-sm"
                  type="date"
                  name="date"
                  defaultValue={selectedDate}
                />
                <button className="ml-2 rounded border px-3 py-2 text-sm">
                  Go
                </button>
              </form>
            </div>
          </div>
        </div>

        <nav className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <Link
              key={t.id}
              href={`/dashboard?tab=${t.id}&date=${selectedDate}`}
              className={`rounded px-3 py-2 text-sm ${
                t.id === tab
                  ? 'bg-black text-white'
                  : 'border text-neutral-800 hover:bg-neutral-50'
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        <div className="rounded-lg border p-4">
          {tab === 'food' ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Food</h2>
              </div>

              <FoodClient
                selectedDate={selectedDate}
                addFoodAction={addFood}
                saveFavoriteAction={saveFavoriteFromFood}
              />

              {favorites && favorites.length ? (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Favorites</div>
                  <div className="flex flex-wrap gap-2">
                    {favorites.map((f) => (
                      <form key={f.id} action={addFoodFromFavorite}>
                        <input type="hidden" name="entry_date" value={selectedDate} />
                        <input type="hidden" name="favorite_id" value={f.id} />
                        <button className="rounded-full border px-3 py-1 text-sm hover:bg-neutral-50">
                          {f.name}
                        </button>
                      </form>
                    ))}
                  </div>
                </div>
              ) : null}


              <div className="rounded-lg border p-4">
                <div className="flex items-baseline justify-between">
                  <h3 className="font-medium">Entries ({food?.length ?? 0})</h3>
                  <p className="text-xs text-neutral-500">{selectedDate}</p>
                </div>
                {food && food.length ? (
                  <ul className="mt-3 divide-y">
                    {food.map((e) => (
                      <li key={e.id} className="py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-medium">{e.name}</div>
                            <div className="text-sm text-neutral-700">
                              {Number(e.calories)} cal • P {Number(e.protein_g)} / C{' '}
                              {Number(e.carbs_g)} / F {Number(e.fat_g)}
                              <span className="ml-2 text-xs text-neutral-500">
                                ({e.source})
                              </span>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <form action={saveFavoriteFromFood}>
                              <input type="hidden" name="name" value={e.name} />
                              <input type="hidden" name="calories" value={String(e.calories)} />
                              <input type="hidden" name="protein_g" value={String(e.protein_g)} />
                              <input type="hidden" name="carbs_g" value={String(e.carbs_g)} />
                              <input type="hidden" name="fat_g" value={String(e.fat_g)} />
                              <button className="rounded border px-2 py-1 text-xs hover:bg-neutral-50">
                                Favorite
                              </button>
                            </form>
                            <form action={deleteFood}>
                              <input type="hidden" name="id" value={e.id} />
                              <button className="rounded border px-2 py-1 text-xs hover:bg-neutral-50">
                                Delete
                              </button>
                            </form>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-neutral-600">No food entries yet.</p>
                )}
              </div>

              <div className="rounded-lg border p-4">
                <h3 className="font-medium">Macro coach</h3>
                {targets?.calories != null ? (
                  <>
                    <ul className="mt-2 list-disc pl-5 text-sm text-neutral-700">
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
                              <form key={f.id} action={addFoodFromFavorite}>
                                <input type="hidden" name="entry_date" value={selectedDate} />
                                <input type="hidden" name="favorite_id" value={f.id} />
                                <button className="w-full rounded border px-3 py-2 text-left text-sm hover:bg-neutral-50">
                                  <div className="font-medium">{f.name}</div>
                                  <div className="text-xs text-neutral-600">
                                    {Number(f.calories)} cal • P {Number(f.protein_g)} / C {Number(f.carbs_g)} / F {Number(f.fat_g)}
                                  </div>
                                </button>
                              </form>
                            ))}
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p className="mt-2 text-sm text-neutral-600">
                    Set macro targets in Settings to enable recommendations.
                  </p>
                )}
              </div>
            </div>
          ) : tab === 'vitals' ? (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Vitals</h2>

              <form action={addVitals} className="grid gap-3 rounded-lg border bg-neutral-50 p-4">
                <input type="hidden" name="entry_date" value={selectedDate} />
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="grid gap-1 text-sm">
                    Systolic
                    <input name="systolic" type="number" step="1" className="rounded border px-3 py-2" required />
                  </label>
                  <label className="grid gap-1 text-sm">
                    Diastolic
                    <input name="diastolic" type="number" step="1" className="rounded border px-3 py-2" required />
                  </label>
                  <label className="grid gap-1 text-sm">
                    Pulse
                    <input name="pulse" type="number" step="1" className="rounded border px-3 py-2" />
                  </label>
                </div>
                <button className="w-fit rounded bg-black px-3 py-2 text-sm text-white">Add vitals</button>
              </form>

              <VitalsList selectedDate={selectedDate} />
            </div>
          ) : tab === 'weight' ? (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Weight</h2>
              <form action={addWeight} className="flex gap-2">
                <input type="hidden" name="entry_date" value={selectedDate} />
                <input
                  name="weight_lbs"
                  type="number"
                  step="0.1"
                  min={0}
                  className="w-40 rounded border px-3 py-2"
                  placeholder="e.g. 185.4"
                  required
                />
                <button className="rounded bg-black px-3 py-2 text-sm text-white">
                  Save
                </button>
              </form>
            </div>
          ) : tab === 'settings' ? (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Settings</h2>
              <form action={saveMacroTargets} className="grid gap-3 max-w-md">
                <label className="grid gap-1 text-sm">
                  Calories
                  <input
                    name="calories"
                    type="number"
                    className="rounded border px-3 py-2"
                    defaultValue={targets?.calories ?? ''}
                  />
                </label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <label className="grid gap-1 text-sm">
                    Protein (g)
                    <input
                      name="protein_g"
                      type="number"
                      className="rounded border px-3 py-2"
                      defaultValue={targets?.protein_g ?? ''}
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    Carbs (g)
                    <input
                      name="carbs_g"
                      type="number"
                      className="rounded border px-3 py-2"
                      defaultValue={targets?.carbs_g ?? ''}
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    Fat (g)
                    <input
                      name="fat_g"
                      type="number"
                      className="rounded border px-3 py-2"
                      defaultValue={targets?.fat_g ?? ''}
                    />
                  </label>
                </div>
                <button className="w-fit rounded bg-black px-3 py-2 text-sm text-white">
                  Save targets
                </button>
              </form>
              <p className="text-sm text-neutral-600">
                Next: meal photo → estimate → edit → save, plus USDA/OpenFoodFacts
                search.
              </p>
            </div>
          ) : tab === 'trends' ? (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Trends (last 30 days)</h2>
              <TrendsClient points={trendsPoints} />
            </div>
          ) : tab === 'peptides' ? (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Peptides</h2>

              <PeptidesClient selectedDate={selectedDate} addPeptideAction={addPeptide} />

              <PeptideList selectedDate={selectedDate} />
            </div>
          ) : (
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">{tab}</h2>
              <p className="text-sm text-neutral-600">UI coming next. Backend tables + RLS are ready.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
