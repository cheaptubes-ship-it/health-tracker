'use client'

import { useMemo, useState } from 'react'

type Item = {
  id: string
  display_name: string | null
  normalized_name: string
  dose_value: number | null
  dose_unit: string
  timing: 'am' | 'pm' | 'bedtime'
  days_of_week: number[]
  active: boolean
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function nyDow() {
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short' })
  const w = fmt.format(new Date())
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return map[w] ?? new Date().getDay()
}

export function PeptideQuickLogClient({
  selectedDate,
  scheduleItems,
}: {
  selectedDate: string
  scheduleItems: Item[]
}) {
  const [busyId, setBusyId] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const todayDow = nyDow()

  const due = useMemo(() => {
    const active = scheduleItems.filter((s) => s.active)
    const matchesDay = active.filter((s) => (s.days_of_week ?? []).includes(todayDow))

    // Bedtime merged into PM
    const am = matchesDay.filter((s) => s.timing === 'am')
    const pm = matchesDay.filter((s) => s.timing === 'pm' || s.timing === 'bedtime')

    const sort = (a: Item, b: Item) => (a.display_name ?? a.normalized_name).localeCompare(b.display_name ?? b.normalized_name)

    return {
      am: am.sort(sort),
      pm: pm.sort(sort),
    }
  }, [scheduleItems, todayDow])

  async function quickLog(schedule_id: string) {
    setErr(null)
    setNotice(null)
    setBusyId(schedule_id)
    try {
      const res = await fetch('/api/peptides/quick-log', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ schedule_id, entry_date: selectedDate }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.ok) throw new Error(json?.error ?? 'Failed')
      setNotice('Logged')
      // The peptide list below is server-rendered; easiest is a full refresh.
      window.location.reload()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusyId(null)
    }
  }

  const label = (it: Item) => {
    const name = it.display_name ?? it.normalized_name
    const dose = it.dose_value != null ? `${it.dose_value}${it.dose_unit}` : ''
    return `${name}${dose ? ` (${dose})` : ''}`
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/20 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <div className="text-sm font-medium">Quick log (taken now)</div>
          <div className="text-xs text-slate-400">
            Today: {DOW[todayDow]} • AM window 6–8am • PM window 6–8pm
          </div>
        </div>
      </div>

      {err ? <p className="mt-2 text-sm text-red-400">{err}</p> : null}
      {notice ? <p className="mt-2 text-sm text-emerald-400">{notice}</p> : null}

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <div className="text-xs font-semibold text-slate-300">AM</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {due.am.length ? (
              due.am.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  disabled={busyId === it.id}
                  onClick={() => void quickLog(it.id)}
                  className="rounded-full border border-slate-700 bg-slate-950/30 px-3 py-1 text-sm text-slate-100 hover:bg-slate-900/50 disabled:opacity-50"
                >
                  {busyId === it.id ? 'Logging…' : label(it)}
                </button>
              ))
            ) : (
              <div className="text-sm text-slate-500">—</div>
            )}
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-slate-300">PM</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {due.pm.length ? (
              due.pm.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  disabled={busyId === it.id}
                  onClick={() => void quickLog(it.id)}
                  className="rounded-full border border-slate-700 bg-slate-950/30 px-3 py-1 text-sm text-slate-100 hover:bg-slate-900/50 disabled:opacity-50"
                >
                  {busyId === it.id ? 'Logging…' : label(it)}
                </button>
              ))
            ) : (
              <div className="text-sm text-slate-500">—</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
