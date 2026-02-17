'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import { addWeight } from './server-actions'

function round1(n: number) {
  return Math.round(n * 10) / 10
}

export function WeightClient({
  selectedDate,
  lastWeight,
}: {
  selectedDate: string
  lastWeight: number | null
}) {
  const formRef = useRef<HTMLFormElement | null>(null)
  const base = useMemo(() => (lastWeight == null ? null : round1(Number(lastWeight))), [lastWeight])

  const [weight, setWeight] = useState<string>(() => (base != null ? String(base) : ''))
  const [isPending, startTransition] = useTransition()

  const deltas = [0.5, 1]

  function applyDelta(delta: number) {
    const cur = Number(String(weight).trim())
    const curNum = Number.isFinite(cur) ? cur : base ?? 0
    const next = Math.max(0, round1(curNum + delta))
    setWeight(String(next))
  }

  function submitWithValue(next: number) {
    setWeight(String(next))
    // Let state flush then submit.
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
          <div className="flex flex-wrap gap-2">
            {deltas
              .slice()
              .reverse()
              .map((d) => (
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
      </form>
    </div>
  )
}
