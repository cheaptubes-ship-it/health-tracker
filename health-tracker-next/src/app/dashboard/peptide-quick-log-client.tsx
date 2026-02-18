'use client'

import { useMemo, useState } from 'react'
import { peptideKey } from './peptides-utils'

export type Item = {
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

function tzDowForYmd(timeZone: string, ymd: string) {
  // Use noon local time to avoid DST edges.
  const d = new Date(`${ymd}T12:00:00`)
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' })
  const w = fmt.format(d)
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return map[w] ?? d.getDay()
}

export type TakenEntry = {
  id: string
  name: string
  timing: string | null
  status: string
  entry_date: string
}

export function PeptideQuickLogClient({
  selectedDate,
  timeZone,
  scheduleItems,
  takenToday,
}: {
  selectedDate: string
  timeZone: string
  scheduleItems: Item[]
  takenToday: TakenEntry[]
}) {
  const [busyId, setBusyId] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [lastLoggedEntryId, setLastLoggedEntryId] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

  const selectedDow = useMemo(() => tzDowForYmd(timeZone, selectedDate), [timeZone, selectedDate])

  const due = useMemo(() => {
    // IMPORTANT: key by (peptide name, timing).
    // Some peptides have multiple doses per day (e.g. BPC-157 AM + Bedtime).
    // If we key by name only, logging the AM dose would incorrectly hide the Bedtime dose.
    const takenKeys = new Set(
      (takenToday ?? [])
        .map((e) => {
          const k = peptideKey(String(e.name ?? ''))
          const t = String(e.timing ?? '').trim() || 'unknown'
          return k ? `${k}__${t}` : ''
        })
        .filter(Boolean)
    )

    const active = scheduleItems.filter((s) => s.active)
    const matchesDay = showAll ? active : active.filter((s) => (s.days_of_week ?? []).includes(selectedDow))

    // Hide items already logged today (by peptide name+timing)
    const notLogged = matchesDay.filter((s) => {
      const key = peptideKey(s.display_name ?? s.normalized_name)
      const t = String(s.timing ?? '').trim() || 'unknown'
      const composite = key ? `${key}__${t}` : ''
      return composite && !takenKeys.has(composite)
    })

    // Bedtime merged into PM
    const am = notLogged.filter((s) => s.timing === 'am')
    const pm = notLogged.filter((s) => s.timing === 'pm' || s.timing === 'bedtime')

    const sort = (a: Item, b: Item) =>
      (a.display_name ?? a.normalized_name).localeCompare(b.display_name ?? b.normalized_name)

    return {
      am: am.sort(sort),
      pm: pm.sort(sort),
      takenCount: takenKeys.size,
    }
  }, [scheduleItems, takenToday, selectedDow, showAll])

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
      setLastLoggedEntryId(json?.entryId ?? null)
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
            Date: {selectedDate} ({DOW[selectedDow]}) • AM window 6–8am • PM window 6–8pm
          </div>
        </div>
      </div>

      {err ? <p className="mt-2 text-sm text-red-400">{err}</p> : null}
      <div className="mt-2 flex flex-wrap items-center gap-3">
        {notice ? <p className="text-sm text-emerald-400">{notice}</p> : null}

        <label className="flex items-center gap-2 text-xs text-slate-300">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-600 bg-slate-950/40"
            checked={showAll}
            onChange={(e) => setShowAll(e.target.checked)}
          />
          Show all (ignore schedule days)
        </label>

        {lastLoggedEntryId ? (
          <button
            type="button"
            className="rounded-lg border border-slate-700 bg-slate-950/20 px-2 py-1 text-xs text-slate-100 hover:bg-slate-900/40"
            onClick={async () => {
              try {
                setErr(null)
                setNotice(null)
                const res = await fetch('/api/peptides/quick-log/delete', {
                  method: 'POST',
                  headers: { 'content-type': 'application/json' },
                  body: JSON.stringify({ id: lastLoggedEntryId }),
                })
                const json = await res.json().catch(() => null)
                if (!res.ok || !json?.ok) throw new Error(json?.error ?? 'Failed to undo')
                setNotice('Undid last log')
                setLastLoggedEntryId(null)
                window.location.reload()
              } catch (e) {
                setErr(e instanceof Error ? e.message : String(e))
              }
            }}
          >
            Undo
          </button>
        ) : null}
      </div>

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
