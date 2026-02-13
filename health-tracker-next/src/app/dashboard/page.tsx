import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { addWeight } from './server-actions'

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

  // Daily totals
  const [{ data: food }, { data: vitals }, { data: peptides }, { data: weights }] =
    await Promise.all([
      supabase
        .from('food_entries')
        .select('calories, protein_g, carbs_g, fat_g')
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
                <input
                  type="hidden"
                  name="tab"
                  value={tab}
                />
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
          {tab === 'weight' ? (
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
              <p className="text-sm text-neutral-600">
                Next: we’ll add the full Food/Peptides/Vitals UIs here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">{tab}</h2>
              <p className="text-sm text-neutral-600">
                I’m currently porting the full feature set (forms + lists + AI meal
                estimate + favorites + macro coach). Weight is live first.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
