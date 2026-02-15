'use client'

import { useEffect, useMemo, useState } from 'react'

type WindowRow = {
  entry_date: string
  fast_start_at: string | null
  fast_end_at: string | null
  note: string | null
  updated_at: string | null
}

function minutesBetween(a: string | null, b: string | null) {
  if (!a || !b) return null
  const A = new Date(a).getTime()
  const B = new Date(b).getTime()
  if (!Number.isFinite(A) || !Number.isFinite(B)) return null
  const min = Math.round((B - A) / 60000)
  return min >= 0 ? min : null
}

function fmtDuration(min: number) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${h}h ${m}m`
}

export function FastingClient({ selectedDate }: { selectedDate: string }) {
  const [row, setRow] = useState<WindowRow | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function load() {
    const res = await fetch(`/api/fasting/status?date=${encodeURIComponent(selectedDate)}`)
    const json = await res.json().catch(() => null)
    if (!res.ok || !json?.ok) {
      setErr(json?.error ?? 'Failed to load fasting')
      return
    }
    setRow(json.window)
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate])

  const status = useMemo(() => {
    const start = row?.fast_start_at ?? null
    const end = row?.fast_end_at ?? null
    if (start && !end) return { state: 'fasting' as const, start, end }
    if (start && end) return { state: 'ended' as const, start, end }
    return { state: 'none' as const, start: null, end: null }
  }, [row])

  const durationMin = useMemo(() => {
    if (status.state === 'fasting') return minutesBetween(status.start, new Date().toISOString())
    if (status.state === 'ended') return minutesBetween(status.start, status.end)
    return null
  }, [status])

  function isoToLocalInput(iso: string | null) {
    if (!iso) return ''
    const d = new Date(iso)
    if (!Number.isFinite(d.getTime())) return ''
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  function localInputToIso(local: string) {
    if (!local.trim()) return null
    const d = new Date(local)
    return Number.isFinite(d.getTime()) ? d.toISOString() : null
  }

  const [startEdit, setStartEdit] = useState('')
  const [endEdit, setEndEdit] = useState('')

  useEffect(() => {
    setStartEdit(isoToLocalInput(row?.fast_start_at ?? null))
    setEndEdit(isoToLocalInput(row?.fast_end_at ?? null))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row?.fast_start_at, row?.fast_end_at])

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/20 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-sm font-medium">Fasting window</div>
          <div className="text-xs text-slate-400">Manual fast start/end for the day (stored by wake date).</div>
        </div>
        <div className="text-xs text-slate-300">{selectedDate}</div>
      </div>

      {err ? <p className="mt-2 text-sm text-red-400">{err}</p> : null}
      {notice ? <p className="mt-2 text-sm text-emerald-400">{notice}</p> : null}

      <div className="mt-3 grid gap-2">
        <div className="text-sm text-slate-200">
          Status:{' '}
          <span className="font-medium">
            {status.state === 'fasting' ? 'Fasting' : status.state === 'ended' ? 'Ended' : 'Not set'}
          </span>
          {durationMin != null ? <span className="ml-2 text-slate-400">({fmtDuration(durationMin)})</span> : null}
        </div>

        <div className="text-xs text-slate-400">
          Start: {status.start ? new Date(status.start).toLocaleString() : '—'}
          {'  '}• End: {status.end ? new Date(status.end).toLocaleString() : '—'}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm text-slate-200">
            Start (adjust)
            <input
              type="datetime-local"
              value={startEdit}
              onChange={(e) => setStartEdit(e.target.value)}
              className="h-10 rounded-lg border border-slate-700 bg-slate-950/40 px-3 text-slate-100"
            />
          </label>
          <label className="grid gap-1 text-sm text-slate-200">
            End (adjust)
            <input
              type="datetime-local"
              value={endEdit}
              onChange={(e) => setEndEdit(e.target.value)}
              className="h-10 rounded-lg border border-slate-700 bg-slate-950/40 px-3 text-slate-100"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            className="rounded-lg bg-indigo-500 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
            onClick={async () => {
              try {
                setBusy(true)
                setErr(null)
                setNotice(null)
                const res = await fetch('/api/fasting/start', {
                  method: 'POST',
                  headers: { 'content-type': 'application/json' },
                  body: JSON.stringify({ entry_date: selectedDate }),
                })
                const json = await res.json().catch(() => null)
                if (!res.ok || !json?.ok) throw new Error(json?.error ?? 'Failed')
                setNotice('Fast started')
                await load()
              } catch (e) {
                setErr(e instanceof Error ? e.message : String(e))
              } finally {
                setBusy(false)
              }
            }}
          >
            Start fast (now)
          </button>

          <button
            type="button"
            disabled={busy}
            className="rounded-lg border border-slate-700 bg-slate-950/30 px-3 py-2 text-sm text-slate-100 hover:bg-slate-900/50 disabled:opacity-50"
            onClick={async () => {
              try {
                setBusy(true)
                setErr(null)
                setNotice(null)
                const res = await fetch('/api/fasting/end', {
                  method: 'POST',
                  headers: { 'content-type': 'application/json' },
                  body: JSON.stringify({ entry_date: selectedDate }),
                })
                const json = await res.json().catch(() => null)
                if (!res.ok || !json?.ok) throw new Error(json?.error ?? 'Failed')
                setNotice('Fast ended')
                await load()
              } catch (e) {
                setErr(e instanceof Error ? e.message : String(e))
              } finally {
                setBusy(false)
              }
            }}
          >
            End fast (now)
          </button>

          <button
            type="button"
            disabled={busy}
            className="rounded-lg border border-slate-700 bg-slate-950/30 px-3 py-2 text-sm text-slate-100 hover:bg-slate-900/50 disabled:opacity-50"
            onClick={async () => {
              try {
                setBusy(true)
                setErr(null)
                setNotice(null)
                const res = await fetch('/api/fasting/update', {
                  method: 'POST',
                  headers: { 'content-type': 'application/json' },
                  body: JSON.stringify({
                    entry_date: selectedDate,
                    fast_start_at: localInputToIso(startEdit),
                    fast_end_at: localInputToIso(endEdit),
                  }),
                })
                const json = await res.json().catch(() => null)
                if (!res.ok || !json?.ok) throw new Error(json?.error ?? 'Failed')
                setNotice('Updated')
                await load()
              } catch (e) {
                setErr(e instanceof Error ? e.message : String(e))
              } finally {
                setBusy(false)
              }
            }}
          >
            Save times
          </button>

          <button
            type="button"
            disabled={busy}
            className="rounded-lg border border-slate-700 bg-slate-950/10 px-3 py-2 text-sm text-slate-200 hover:bg-slate-900 disabled:opacity-50"
            onClick={() => void load()}
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  )
}
