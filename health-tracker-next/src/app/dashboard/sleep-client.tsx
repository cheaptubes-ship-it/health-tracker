'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

export type SleepEntry = {
  id: string
  entry_date: string
  sleep_start_at: string | null
  sleep_end_at: string | null
  quality: number | null
  note: string | null
  created_at: string
}

function minutesBetween(a: string | null, b: string | null) {
  if (!a || !b) return null
  const start = new Date(a).getTime()
  const end = new Date(b).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null
  const min = Math.round((end - start) / 60000)
  return min > 0 ? min : null
}

function fmtDuration(min: number) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${h}h ${m}m`
}

export function SleepClient({
  selectedDate,
  timeZone,
  entries,
}: {
  selectedDate: string
  timeZone: string
  entries: SleepEntry[]
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)

  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [quality, setQuality] = useState('')
  const [note, setNote] = useState('')

  function isoToLocalInput(iso: string | null) {
    if (!iso) return ''
    const d = new Date(iso)
    if (!Number.isFinite(d.getTime())) return ''
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const modeLabel = useMemo(() => (editingId ? 'Update sleep' : 'Save sleep'), [editingId])

  async function save() {
    setError(null)
    setNotice(null)
    const endpoint = editingId ? '/api/sleep/update' : '/api/sleep/entry'

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: editingId,
        entry_date: selectedDate,
        sleep_start_at: start || null,
        sleep_end_at: end || null,
        quality: quality ? Number(quality) : null,
        note,
      }),
    })
    const json = await res.json().catch(() => null)
    if (!res.ok || !json?.ok) throw new Error(json?.error ?? 'Failed to save')
    setNotice(editingId ? 'Updated' : 'Saved')
    setEditingId(null)
    setStart('')
    setEnd('')
    setQuality('')
    setNote('')
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Sleep</h2>
        <p className="text-sm text-slate-300">Log sleep start/end and a quick quality score.</p>
      </div>

      <div className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950/20 p-4">
        <div className="text-xs text-slate-400">Date: {selectedDate}</div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1 text-sm text-slate-200">
            Start
            <input
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="h-10 rounded-lg border border-slate-700 bg-slate-950/40 px-3 text-slate-100"
            />
          </label>
          <label className="grid gap-1 text-sm text-slate-200">
            End
            <input
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="h-10 rounded-lg border border-slate-700 bg-slate-950/40 px-3 text-slate-100"
            />
          </label>
          <label className="grid gap-1 text-sm text-slate-200">
            Quality (1-5)
            <input
              type="number"
              min={1}
              max={5}
              step={1}
              value={quality}
              onChange={(e) => setQuality(e.target.value)}
              className="h-10 rounded-lg border border-slate-700 bg-slate-950/40 px-3 text-slate-100"
            />
          </label>
        </div>

        <label className="grid gap-1 text-sm text-slate-200">
          Notes
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="min-h-16 rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-slate-100"
          />
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="w-fit rounded-lg bg-indigo-500 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-400"
            onClick={() => void save().catch((e) => setError(e instanceof Error ? e.message : String(e)))}
          >
            {modeLabel}
          </button>

          {editingId ? (
            <button
              type="button"
              className="w-fit rounded-lg border border-slate-700 bg-slate-950/30 px-3 py-2 text-sm text-slate-100 hover:bg-slate-900/50"
              onClick={() => {
                setEditingId(null)
                setStart('')
                setEnd('')
                setQuality('')
                setNote('')
                setNotice(null)
                setError(null)
              }}
            >
              Cancel
            </button>
          ) : null}
        </div>

        {notice ? <p className="text-sm text-emerald-400">{notice}</p> : null}
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/20 p-4">
        <div className="flex items-baseline justify-between">
          <h3 className="font-medium">Entries ({entries.length})</h3>
          <div className="text-xs text-slate-400">{selectedDate}</div>
        </div>

        {entries.length ? (
          <ul className="mt-3 divide-y divide-slate-800">
            {entries.map((e) => {
              const min = minutesBetween(e.sleep_start_at, e.sleep_end_at)
              return (
                <li key={e.id} className="py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-slate-100">
                        {min != null ? fmtDuration(min) : '—'}
                        {e.quality != null ? (
                          <span className="ml-2 text-xs text-slate-300">Quality {e.quality}/5</span>
                        ) : null}
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        {e.sleep_start_at ? new Date(e.sleep_start_at).toLocaleString([], { timeZone }) : '—'} →{' '}
                        {e.sleep_end_at ? new Date(e.sleep_end_at).toLocaleString([], { timeZone }) : '—'}
                      </div>
                      {e.note ? (
                        <div className="mt-1 whitespace-pre-wrap text-xs text-slate-300">{e.note}</div>
                      ) : null}
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded-lg border border-slate-700 bg-slate-950/30 px-2 py-1 text-xs text-slate-100 hover:bg-slate-900/50"
                        onClick={() => {
                          setEditingId(e.id)
                          setStart(isoToLocalInput(e.sleep_start_at))
                          setEnd(isoToLocalInput(e.sleep_end_at))
                          setQuality(e.quality != null ? String(e.quality) : '')
                          setNote(e.note ?? '')
                          setNotice(null)
                          setError(null)
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-slate-700 bg-slate-950/10 px-2 py-1 text-xs text-slate-200 hover:bg-slate-900"
                        onClick={async () => {
                          try {
                            setError(null)
                            setNotice(null)
                            const res = await fetch('/api/sleep/delete', {
                              method: 'POST',
                              headers: { 'content-type': 'application/json' },
                              body: JSON.stringify({ id: e.id }),
                            })
                            const json = await res.json().catch(() => null)
                            if (!res.ok || !json?.ok) throw new Error(json?.error ?? 'Failed to delete')
                            setNotice('Deleted')
                            if (editingId === e.id) setEditingId(null)
                            router.refresh()
                          } catch (err) {
                            setError(err instanceof Error ? err.message : String(err))
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-slate-300">No sleep entries yet.</p>
        )}
      </div>
    </div>
  )
}
