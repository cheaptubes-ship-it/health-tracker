'use client'

import { useEffect, useMemo, useState } from 'react'
import { peptideKey } from './peptides-utils'

type Item = {
  id: string
  normalized_name: string
  display_name: string | null
  dose_value: number | null
  dose_unit: string
  timing: 'am' | 'pm' | 'bedtime'
  days_of_week: number[]
  active: boolean
  note: string | null
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function dowLabel(days: number[]) {
  if (days.length === 7) return 'Daily'
  return days.map((d) => DOW[d] ?? String(d)).join(', ')
}

export function PeptideScheduleClient() {
  const [items, setItems] = useState<Item[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [debug, setDebug] = useState<any>(null)

  const weekView = useMemo(() => {
    // { timing: { dow: string[] } }
    const buckets: Record<string, Record<number, string[]>> = {
      am: { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] },
      pm: { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] },
      bedtime: { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] },
    }

    for (const it of items) {
      const labelName = it.display_name ?? it.normalized_name
      const dose = it.dose_value != null ? `${it.dose_value}${it.dose_unit}` : ''
      const label = `${labelName}${dose ? ` (${dose})` : ''}${it.active ? '' : ' [paused]'}`
      const days = Array.isArray(it.days_of_week) ? it.days_of_week : []
      for (const d of days) {
        if (buckets[it.timing]?.[d]) buckets[it.timing][d].push(label)
      }
    }

    return buckets
  }, [items])

  async function load() {
    setErr(null)
    const res = await fetch('/api/peptides/schedule')
    const json = await res.json().catch(() => null)
    if (!res.ok || !json?.ok) {
      setErr(json?.error ?? 'Failed to load')
      return
    }
    const nextItems = Array.isArray(json.items) ? json.items : []
    setItems(nextItems)

    // If the schedule is unexpectedly empty, fetch a lightweight debug snapshot.
    if (!nextItems.length) {
      try {
        const r2 = await fetch('/api/debug/whoami')
        const j2 = await r2.json().catch(() => null)
        if (r2.ok && j2?.ok) setDebug(j2)
      } catch {
        // ignore
      }
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const [name, setName] = useState('')
  const [doseValue, setDoseValue] = useState('')
  const [doseUnit, setDoseUnit] = useState<'u' | 'mcg' | 'mg'>('u')
  const [timing, setTiming] = useState<'am' | 'pm' | 'bedtime'>('am')
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6])
  const [active, setActive] = useState(true)
  const [note, setNote] = useState('')

  const canSave = useMemo(() => peptideKey(name).length > 0, [name])

  async function save() {
    if (!canSave) return
    setBusy(true)
    setErr(null)
    setNotice(null)
    try {
      const res = await fetch('/api/peptides/schedule', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          display_name: name,
          dose_value: doseValue ? Number(doseValue) : null,
          dose_unit: doseUnit,
          timing,
          days_of_week: days,
          active,
          note,
        }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.ok) throw new Error(json?.error ?? 'Failed')
      setNotice('Saved')
      setName('')
      setDoseValue('')
      setDoseUnit('u')
      setTiming('am')
      setDays([0, 1, 2, 3, 4, 5, 6])
      setActive(true)
      setNote('')
      await load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-800 bg-slate-950/20 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-sm font-medium">Schedule</div>
            <div className="text-xs text-slate-400">Create schedules + pause items to silence reminders (e.g., Retatrutide).</div>
          </div>

          <div className="flex flex-wrap gap-2">
            {!items.length ? (
              <button
                type="button"
                disabled={busy}
                className="rounded-lg border border-slate-700 bg-slate-950/30 px-3 py-2 text-sm text-slate-100 hover:bg-slate-900/50 disabled:opacity-50"
                onClick={async () => {
                  try {
                    setBusy(true)
                    setErr(null)
                    setNotice(null)
                    const res = await fetch('/api/peptides/schedule/seed', { method: 'POST' })
                    const json = await res.json().catch(() => null)
                    if (!res.ok || !json?.ok) throw new Error(json?.error ?? 'Failed to seed')
                    setNotice(
                      json?.seeded
                        ? `Seeded (${json?.count ?? 0} schedule items)`
                        : json?.message ?? 'No changes'
                    )
                    await load()
                  } catch (e) {
                    setErr(e instanceof Error ? e.message : String(e))
                  } finally {
                    setBusy(false)
                  }
                }}
              >
                Seed my schedule
              </button>
            ) : null}

            <button
              type="button"
              disabled={busy}
              className="rounded-lg border border-slate-700 bg-slate-950/10 px-3 py-2 text-sm text-slate-200 hover:bg-slate-900 disabled:opacity-50"
              onClick={async () => {
                try {
                  setBusy(true)
                  setErr(null)
                  setNotice(null)
                  const res = await fetch('/api/peptides/schedule/fix-bedtime', { method: 'POST' })
                  const json = await res.json().catch(() => null)
                  if (!res.ok || !json?.ok) throw new Error(json?.error ?? 'Failed')
                  setNotice(`Moved to bedtime (${json?.updated ?? 0} items)`)
                  await load()
                } catch (e) {
                  setErr(e instanceof Error ? e.message : String(e))
                } finally {
                  setBusy(false)
                }
              }}
            >
              Move 157 + TA-1 → Bedtime
            </button>

            <button
              type="button"
              disabled={busy}
              className="rounded-lg border border-slate-700 bg-slate-950/10 px-3 py-2 text-sm text-slate-200 hover:bg-slate-900 disabled:opacity-50"
              onClick={async () => {
                try {
                  setBusy(true)
                  setErr(null)
                  setNotice(null)
                  const res = await fetch('/api/peptides/profiles/seed', { method: 'POST' })
                  const json = await res.json().catch(() => null)
                  if (!res.ok || !json?.ok) throw new Error(json?.error ?? 'Failed to seed profiles')
                  setNotice(`Seeded vial profiles (${json?.count ?? 0})`)
                } catch (e) {
                  setErr(e instanceof Error ? e.message : String(e))
                } finally {
                  setBusy(false)
                }
              }}
            >
              Seed vial profiles
            </button>
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {!items.length && debug ? (
            <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-3 text-xs text-slate-300 sm:col-span-2">
              <div className="font-semibold text-slate-200">Debug (schedule is empty)</div>
              <div className="mt-1 grid gap-1">
                <div>
                  env: {debug?.env?.vercelEnv ?? '—'} / {debug?.env?.nodeEnv ?? '—'}
                </div>
                <div>supabase: {debug?.supabase?.urlHost ?? '—'}</div>
                <div>user: {debug?.user?.email ?? '—'} ({debug?.user?.id ?? '—'})</div>
                <div className="text-slate-400">
                  If you seeded yesterday but it’s empty today, you’re likely in a different environment/project or logged into a different user.
                </div>
              </div>
            </div>
          ) : null}

          <label className="grid gap-1 text-sm text-slate-200">
            Peptide
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 rounded-lg border border-slate-700 bg-slate-950/40 px-3 text-slate-100"
              placeholder="e.g. BPC-157"
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1 text-sm text-slate-200">
              Dose
              <input
                value={doseValue}
                onChange={(e) => setDoseValue(e.target.value)}
                className="h-10 rounded-lg border border-slate-700 bg-slate-950/40 px-3 text-slate-100"
                placeholder="e.g. 5"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-200">
              Unit
              <select
                value={doseUnit}
                onChange={(e) => setDoseUnit(e.target.value as any)}
                className="h-10 rounded-lg border border-slate-700 bg-slate-950/40 px-3 text-slate-100"
              >
                <option value="u">u</option>
                <option value="mcg">mcg</option>
                <option value="mg">mg</option>
              </select>
            </label>
          </div>

          <label className="grid gap-1 text-sm text-slate-200">
            Timing
            <select
              value={timing}
              onChange={(e) => setTiming(e.target.value as any)}
              className="h-10 rounded-lg border border-slate-700 bg-slate-950/40 px-3 text-slate-100"
            >
              <option value="am">Morning (AM)</option>
              <option value="pm">Evening (PM)</option>
              <option value="bedtime">Bedtime</option>
            </select>
          </label>

          <label className="grid gap-1 text-sm text-slate-200">
            Days
            <select
              multiple
              value={days.map(String)}
              onChange={(e) => {
                const next = Array.from(e.target.selectedOptions).map((o) => Number(o.value))
                setDays(next)
              }}
              className="h-24 rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-slate-100"
            >
              {DOW.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
            <div className="text-xs text-slate-400">Tip: Cmd/Ctrl-click to select multiple.</div>
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-200">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Active (send reminders)
          </label>

          <label className="grid gap-1 text-sm text-slate-200 sm:col-span-2">
            Notes
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-16 rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-slate-100"
            />
          </label>

          <button
            type="button"
            disabled={busy || !canSave}
            onClick={() => void save()}
            className="w-fit rounded-lg bg-indigo-500 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
          >
            Add schedule item
          </button>

          {notice ? <p className="text-sm text-emerald-400">{notice}</p> : null}
          {err ? <p className="text-sm text-red-400">{err}</p> : null}
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/20 p-4">
        <div className="flex items-baseline justify-between">
          <h3 className="font-medium">Week view</h3>
          <div className="text-xs text-slate-400">AM / PM / Bedtime</div>
        </div>

        <div className="mt-3 overflow-auto rounded-lg border border-slate-800">
          <div className="min-w-[900px]">
            <div className="grid grid-cols-[120px_repeat(7,1fr)] border-b border-slate-800 bg-slate-950/30 text-xs text-slate-300">
              <div className="p-2">Time</div>
              {DOW.map((d) => (
                <div key={d} className="p-2 font-medium">{d}</div>
              ))}
            </div>

            {(['am', 'pm', 'bedtime'] as const).map((t) => (
              <div key={t} className="grid grid-cols-[120px_repeat(7,1fr)] border-b border-slate-800">
                <div className="p-2 text-sm font-medium text-slate-100">
                  {t === 'am' ? 'Morning' : t === 'pm' ? 'Evening' : 'Bedtime'}
                </div>
                {DOW.map((_, d) => (
                  <div key={d} className="p-2 text-xs text-slate-200">
                    {(weekView[t][d] ?? []).length ? (
                      <ul className="grid gap-1">
                        {(weekView[t][d] ?? []).map((x, idx) => (
                          <li key={idx} className="rounded bg-slate-950/30 px-2 py-1">{x}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/20 p-4">
        <div className="flex items-baseline justify-between">
          <h3 className="font-medium">Current schedule (editable)</h3>
        </div>
        {items.length ? (
          <ul className="mt-3 divide-y divide-slate-800">
            {items.map((it) => (
              <li key={it.id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-slate-100">
                      {it.display_name ?? it.normalized_name} • {it.timing.toUpperCase()} • {dowLabel(it.days_of_week ?? [])}
                    </div>
                    <div className="text-xs text-slate-300">
                      Dose: {it.dose_value ?? '—'} {it.dose_unit}
                      {it.note ? <span className="ml-2 text-slate-400">{it.note}</span> : null}
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-sm text-slate-200">
                    <input
                      type="checkbox"
                      checked={it.active}
                      onChange={async (e) => {
                        const next = e.target.checked
                        setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, active: next } : x)))
                        try {
                          const res = await fetch('/api/peptides/schedule', {
                            method: 'POST',
                            headers: { 'content-type': 'application/json' },
                            body: JSON.stringify({
                              id: it.id,
                              display_name: it.display_name ?? it.normalized_name,
                              dose_value: it.dose_value,
                              dose_unit: it.dose_unit,
                              timing: it.timing,
                              days_of_week: it.days_of_week,
                              active: next,
                              note: it.note,
                            }),
                          })
                          const json = await res.json().catch(() => null)
                          if (!res.ok || !json?.ok) throw new Error(json?.error ?? 'Failed')
                        } catch (e2) {
                          setErr(e2 instanceof Error ? e2.message : String(e2))
                        }
                      }}
                    />
                    Active
                  </label>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-slate-300">No schedule items yet.</p>
        )}
      </div>
    </div>
  )
}
