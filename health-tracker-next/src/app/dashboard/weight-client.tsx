'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import { addWeight } from './server-actions'

function round1(n: number) {
  return Math.round(n * 10) / 10
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function WeightClient({
  selectedDate,
  lastWeight,
  todayEntries = [],
  deleteWeightAction,
}: {
  selectedDate: string
  lastWeight: number | null
  todayEntries?: Array<{ id: string; weight_lbs: number; created_at: string }>
  deleteWeightAction?: (formData: FormData) => Promise<void>
}) {
  const formRef = useRef<HTMLFormElement | null>(null)
  const base = useMemo(() => (lastWeight == null ? null : round1(Number(lastWeight))), [lastWeight])

  const [weight, setWeight] = useState<string>(() => (base != null ? String(base) : ''))
  const [isPending, startTransition] = useTransition()

  const deltas = [0.5, 1, 1.5, 2, 2.5, 3]

  function applyDelta(delta: number) {
    const cur = Number(String(weight).trim())
    const curNum = Number.isFinite(cur) ? cur : base ?? 0
    const next = Math.max(0, round1(curNum + delta))
    setWeight(String(next))
  }

  function submitWithValue(next: number) {
    setWeight(String(next))
    startTransition(() => {
      queueMicrotask(() => formRef.current?.requestSubmit())
    })
  }

  const helperText =
    base == null
      ? 'No previous weight yet.'
      : `Prefilled from last entry (${base} lb).`

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Weight</h2>

      <div className="text-xs text-slate-400">{helperText}</div>

      <form ref={formRef} action={addWeight} className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/20 p-4">
        <input type="hidden" name="entry_date" value={selectedDate} />

        <div className="flex flex-wrap items-end gap-2">
          <label className="grid gap-1 text-sm">
            Weight (lb)
            <input
              name="weight_lbs"
              type="number"
              step="0.1"
              min={0}
              inputMode="decimal"
              className="w-40 rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. 185.4"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              required
            />
          </label>

          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-indigo-500 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
          >
            {isPending ? 'Saving…' : 'Save'}
          </button>

          <button
            type="button"
            disabled={base == null || isPending}
            onClick={() => base != null && submitWithValue(base)}
            className="rounded-lg border border-slate-700 bg-slate-950/30 px-3 py-2 text-sm text-slate-100 hover:bg-slate-900 disabled:opacity-50"
            title={base == null ? 'No previous weight to copy.' : 'Log the previous weight unchanged.'}
          >
            Unchanged
          </button>
        </div>

        <div className="grid gap-2">
          <div className="text-xs text-slate-400">Quick adjust</div>
          <div className="grid gap-2">
            <div className="flex flex-wrap gap-2">
              {deltas.map((d) => (
                <button
                  key={`minus-${d}`}
                  type="button"
                  disabled={isPending}
                  onClick={() => applyDelta(-d)}
                  className="rounded-lg border border-slate-700 bg-slate-950/30 px-3 py-1.5 text-sm text-slate-100 hover:bg-slate-900 disabled:opacity-50"
                >
                  -{d}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {deltas.map((d) => (
                <button
                  key={`plus-${d}`}
                  type="button"
                  disabled={isPending}
                  onClick={() => applyDelta(d)}
                  className="rounded-lg border border-slate-700 bg-slate-950/30 px-3 py-1.5 text-sm text-slate-100 hover:bg-slate-900 disabled:opacity-50"
                >
                  +{d}
                </button>
              ))}
            </div>
          </div>
        </div>
      </form>

      {todayEntries.length > 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-950/20 p-4">
          <h3 className="font-medium">Today's entries ({todayEntries.length})</h3>
          <ul className="mt-3 divide-y divide-slate-800">
            {todayEntries.map((e) => (
              <li key={e.id} className="flex items-center justify-between py-2">
                <div className="text-sm text-slate-100">
                  {round1(e.weight_lbs)} lb
                  <span className="ml-2 text-xs text-slate-400">{fmtTime(e.created_at)}</span>
                </div>
                {deleteWeightAction ? (
                  <form action={deleteWeightAction}>
                    <input type="hidden" name="id" value={e.id} />
                    <button
                      type="submit"
                      className="rounded-lg border border-slate-700 bg-slate-950/30 px-2 py-1 text-xs text-slate-300 hover:bg-red-900/40 hover:text-red-300"
                    >
                      Delete
                    </button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
