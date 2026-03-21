'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type Steps = {
  entry_date: string
  steps: number
  distance_m: number | null
  active_kcal: number | null
  avg_hr: number | null
}

type Cardio = {
  id: string
  started_at: string
  ended_at: string | null
  kind: string
  distance_m: number | null
  duration_min: number | null
  avg_hr: number | null
  max_hr: number | null
  calories_kcal: number | null
  note: string | null
}

function mToMiles(m: number) {
  return m / 1609.344
}

export function ActivityClient({ selectedDate }: { selectedDate: string }) {
  const router = useRouter()
  const [err, setErr] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [steps, setSteps] = useState<Steps | null>(null)
  const [cardio, setCardio] = useState<Cardio[]>([])

  async function load() {
    setErr(null)
    const res = await fetch(`/api/activity?date=${encodeURIComponent(selectedDate)}`)
    const json = await res.json().catch(() => null)
    if (!res.ok || !json?.ok) {
      setErr(json?.error ?? 'Failed to load activity')
      return
    }
    setSteps(json.steps ?? null)
    setCardio(Array.isArray(json.cardio) ? json.cardio : [])
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Activity</h2>
          <p className="text-sm text-slate-300">Steps + cardio (walking/bike/elliptical/etc.)</p>
        </div>
        <button
          type="button"
          className="rounded-lg border border-slate-700 bg-slate-950/30 px-3 py-2 text-sm text-slate-100 hover:bg-slate-900/50"
          onClick={() => router.push(`/dashboard?tab=activity&date=${selectedDate}`)}
        >
          Refresh
        </button>
      </div>

      {notice ? <p className="text-sm text-emerald-400">{notice}</p> : null}
      {err ? <p className="text-sm text-red-400">{err}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-950/20 p-4">
          <div className="text-sm font-semibold text-slate-100">Steps (daily)</div>
          <div className="mt-2 text-sm text-slate-200">
            {steps ? (
              <>
                <div className="text-lg font-semibold">{steps.steps.toLocaleString()} steps</div>
                <div className="mt-1 text-xs text-slate-400">
                  {steps.distance_m != null
                    ? `${mToMiles(Number(steps.distance_m)).toFixed(2)} mi`
                    : '—'}
                  {steps.active_kcal != null ? ` • ${Math.round(Number(steps.active_kcal))} kcal` : ''}
                  {steps.avg_hr != null ? ` • avg HR ${steps.avg_hr}` : ''}
                </div>
              </>
            ) : (
              <div className="text-sm text-slate-300">
                No steps imported for {selectedDate}. (Use iPhone Shortcuts in Settings.)
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/20 p-4">
          <div className="text-sm font-semibold text-slate-100">Manual cardio (quick add)</div>
          <form
            className="mt-2 grid gap-2"
            onSubmit={async (e) => {
              e.preventDefault()
              setErr(null)
              setNotice(null)
              try {
                const fd = new FormData(e.currentTarget)
                const res = await fetch('/api/activity/cardio', {
                  method: 'POST',
                  headers: { 'content-type': 'application/json' },
                  body: JSON.stringify({
                    kind: fd.get('kind'),
                    started_at: `${selectedDate}T12:00:00`,
                    duration_min: fd.get('duration_min'),
                    distance_m: fd.get('distance_m'),
                    avg_hr: fd.get('avg_hr'),
                    max_hr: fd.get('max_hr'),
                    calories_kcal: fd.get('calories_kcal'),
                    note: fd.get('note'),
                  }),
                })
                const json = await res.json().catch(() => null)
                if (!res.ok || !json?.ok) throw new Error(json?.error ?? 'Failed to add cardio')
                setNotice('Added')
                ;(e.currentTarget as HTMLFormElement).reset()
                await load()
              } catch (e2) {
                setErr(e2 instanceof Error ? e2.message : String(e2))
              }
            }}
          >
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="grid gap-1 text-sm text-slate-200">
                Type
                <select
                  name="kind"
                  className="h-10 rounded-lg border border-slate-700 bg-slate-950/40 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  defaultValue="walk"
                >
                  <option value="walk">walk</option>
                  <option value="bike">bike</option>
                  <option value="elliptical">elliptical</option>
                  <option value="run">run</option>
                  <option value="other">other</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm text-slate-200">
                Duration (min)
                <input
                  name="duration_min"
                  type="number"
                  step="1"
                  min={0}
                  className="h-10 rounded-lg border border-slate-700 bg-slate-950/40 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>
              <label className="grid gap-1 text-sm text-slate-200">
                Distance (m)
                <input
                  name="distance_m"
                  type="number"
                  step="1"
                  min={0}
                  className="h-10 rounded-lg border border-slate-700 bg-slate-950/40 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>
              <label className="grid gap-1 text-sm text-slate-200">
                Calories (kcal)
                <input
                  name="calories_kcal"
                  type="number"
                  step="1"
                  min={0}
                  className="h-10 rounded-lg border border-slate-700 bg-slate-950/40 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>
              <label className="grid gap-1 text-sm text-slate-200">
                Avg HR
                <input
                  name="avg_hr"
                  type="number"
                  step="1"
                  min={0}
                  className="h-10 rounded-lg border border-slate-700 bg-slate-950/40 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>
              <label className="grid gap-1 text-sm text-slate-200">
                Max HR
                <input
                  name="max_hr"
                  type="number"
                  step="1"
                  min={0}
                  className="h-10 rounded-lg border border-slate-700 bg-slate-950/40 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>
            </div>
            <label className="grid gap-1 text-sm text-slate-200">
              Notes
              <input
                name="note"
                className="h-10 rounded-lg border border-slate-700 bg-slate-950/40 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="optional"
              />
            </label>

            <button className="w-fit rounded-lg bg-indigo-500 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-400">
              Add cardio
            </button>
          </form>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/20 p-4">
        <div className="flex items-baseline justify-between">
          <h3 className="font-medium">Cardio entries ({cardio.length})</h3>
          <p className="text-xs text-slate-400">{selectedDate}</p>
        </div>

        {cardio.length ? (
          <ul className="mt-3 divide-y divide-slate-800">
            {cardio.map((c) => (
              <li key={c.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-100">{c.kind}</div>
                    <div className="text-sm text-slate-200">
                      {c.duration_min != null ? `${Math.round(Number(c.duration_min))} min` : '—'}
                      {c.distance_m != null ? ` • ${mToMiles(Number(c.distance_m)).toFixed(2)} mi` : ''}
                      {c.calories_kcal != null ? ` • ${Math.round(Number(c.calories_kcal))} kcal` : ''}
                    </div>
                    <div className="text-xs text-slate-400">
                      {c.avg_hr != null ? `avg HR ${c.avg_hr}` : ''}
                      {c.max_hr != null ? ` • max HR ${c.max_hr}` : ''}
                    </div>
                    {c.note ? <div className="mt-1 text-xs text-slate-300">{c.note}</div> : null}
                  </div>

                  <button
                    className="rounded-lg border border-slate-700 bg-slate-950/30 px-2 py-1 text-xs text-slate-100 hover:bg-slate-900/50"
                    onClick={async () => {
                      try {
                        setErr(null)
                        setNotice(null)
                        const res = await fetch('/api/activity/cardio', {
                          method: 'DELETE',
                          headers: { 'content-type': 'application/json' },
                          body: JSON.stringify({ id: c.id }),
                        })
                        const json = await res.json().catch(() => null)
                        if (!res.ok || !json?.ok) throw new Error(json?.error ?? 'Failed to delete')
                        setNotice('Deleted')
                        await load()
                      } catch (e2) {
                        setErr(e2 instanceof Error ? e2.message : String(e2))
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-slate-300">No cardio entries yet.</p>
        )}
      </div>

      <p className="text-xs text-slate-400">
        Tip: For automatic imports from Apple Health, use iPhone Shortcuts (Settings → iPhone Shortcuts).
      </p>
    </div>
  )
}
