'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { HydrationEntry } from './hydration-types'

type Targets = {
  unit_pref: 'oz' | 'ml'
  water_ml: number | null
  sodium_mg: number | null
  potassium_mg: number | null
  magnesium_mg: number | null
}

type Totals = {
  water_ml: number
  sodium_mg: number
  potassium_mg: number
  magnesium_mg: number
  caffeine_mg: number
  sugar_g: number
}

function mlToOz(ml: number) {
  return ml / 29.5735
}

function ozToMl(oz: number) {
  return oz * 29.5735
}

export function HydrationClient({
  selectedDate,
  targets,
  totals,
  entries,
}: {
  selectedDate: string
  targets: Targets | null
  totals: Totals
  entries: HydrationEntry[]
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const unit: 'oz' | 'ml' = targets?.unit_pref ?? 'oz'

  const remaining = useMemo(() => {
    return {
      water_ml: targets?.water_ml != null ? Math.max(0, targets.water_ml - totals.water_ml) : null,
      sodium_mg: targets?.sodium_mg != null ? Math.max(0, targets.sodium_mg - totals.sodium_mg) : null,
      potassium_mg: targets?.potassium_mg != null ? Math.max(0, targets.potassium_mg - totals.potassium_mg) : null,
      magnesium_mg: targets?.magnesium_mg != null ? Math.max(0, targets.magnesium_mg - totals.magnesium_mg) : null,
    }
  }, [targets, totals])

  async function add(payload: Record<string, unknown>) {
    setError(null)
    setNotice(null)
    const res = await fetch('/api/hydration/entry', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ entry_date: selectedDate, ...payload }),
    })
    const json = await res.json().catch(() => null)
    if (!res.ok || !json?.ok) throw new Error(json?.error ?? 'Failed to add hydration')
    setNotice('Saved')
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Hydration</h2>
          <p className="text-sm text-slate-300">Track water + electrolytes (LMNT/Propel).</p>
        </div>
      </div>

      <div className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950/20 p-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="text-sm text-slate-200">
            <div className="font-medium">Today</div>
            <div className="text-xs text-slate-400">{selectedDate}</div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-3">
              <div className="text-xs text-slate-400">Water</div>
              <div className="text-lg font-semibold">
                {unit === 'oz'
                  ? `${mlToOz(totals.water_ml).toFixed(1)} oz`
                  : `${Math.round(totals.water_ml)} ml`}
              </div>
              {remaining.water_ml != null ? (
                <div className="text-xs text-slate-400">
                  Remaining: {unit === 'oz' ? `${mlToOz(remaining.water_ml).toFixed(1)} oz` : `${Math.round(remaining.water_ml)} ml`}
                </div>
              ) : null}
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-3">
              <div className="text-xs text-slate-400">Sodium</div>
              <div className="text-lg font-semibold">{Math.round(totals.sodium_mg)} mg</div>
              {remaining.sodium_mg != null ? (
                <div className="text-xs text-slate-400">Remaining: {Math.round(remaining.sodium_mg)} mg</div>
              ) : null}
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-3">
              <div className="text-xs text-slate-400">Potassium</div>
              <div className="text-lg font-semibold">{Math.round(totals.potassium_mg)} mg</div>
              {remaining.potassium_mg != null ? (
                <div className="text-xs text-slate-400">Remaining: {Math.round(remaining.potassium_mg)} mg</div>
              ) : null}
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-3">
              <div className="text-xs text-slate-400">Magnesium</div>
              <div className="text-lg font-semibold">{Math.round(totals.magnesium_mg)} mg</div>
              {remaining.magnesium_mg != null ? (
                <div className="text-xs text-slate-400">Remaining: {Math.round(remaining.magnesium_mg)} mg</div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg bg-indigo-500 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-400"
            onClick={() =>
              void add({ name: 'Water', water_ml: ozToMl(8) })
            }
          >
            + 8 oz water
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-700 bg-slate-950/30 px-3 py-2 text-sm text-slate-100 hover:bg-slate-900/50"
            onClick={() =>
              void add({ name: 'Water', water_ml: ozToMl(16) })
            }
          >
            + 16 oz water
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-700 bg-slate-950/30 px-3 py-2 text-sm text-slate-100 hover:bg-slate-900/50"
            onClick={() =>
              void add({ name: 'Water', water_ml: ozToMl(32) })
            }
          >
            + 32 oz water
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-700 bg-slate-950/30 px-3 py-2 text-sm text-slate-100 hover:bg-slate-900/50"
            onClick={() =>
              void add({ name: 'LMNT (1 packet)', sodium_mg: 1000, potassium_mg: 200, magnesium_mg: 60 })
            }
          >
            + LMNT
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-700 bg-slate-950/30 px-3 py-2 text-sm text-slate-100 hover:bg-slate-900/50"
            onClick={() =>
              void add({ name: 'Propel (1 pkt)', sodium_mg: 230, potassium_mg: 60 })
            }
          >
            + Propel
          </button>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/10 p-4">
          <div className="flex items-baseline justify-between">
            <h3 className="font-medium">Entries ({entries.length})</h3>
            <p className="text-xs text-slate-400">{selectedDate}</p>
          </div>

          {entries.length ? (
            <ul className="mt-3 divide-y divide-slate-800">
              {entries.map((e) => (
                <li key={e.id} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-slate-100">{e.name}</div>
                      <div className="mt-1 text-xs text-slate-300">
                        {e.water_ml ? `Water ${unit === 'oz' ? `${mlToOz(Number(e.water_ml)).toFixed(1)} oz` : `${Math.round(Number(e.water_ml))} ml`}` : ''}
                        {e.sodium_mg != null ? ` • Na ${Math.round(Number(e.sodium_mg))} mg` : ''}
                        {e.potassium_mg != null ? ` • K ${Math.round(Number(e.potassium_mg))} mg` : ''}
                        {e.magnesium_mg != null ? ` • Mg ${Math.round(Number(e.magnesium_mg))} mg` : ''}
                        {e.caffeine_mg != null ? ` • Caf ${Math.round(Number(e.caffeine_mg))} mg` : ''}
                        {e.sugar_g != null ? ` • Sugar ${Number(e.sugar_g)} g` : ''}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="rounded-lg border border-slate-700 bg-slate-950/30 px-2 py-1 text-xs text-slate-100 hover:bg-slate-900/50"
                      onClick={async () => {
                        try {
                          setError(null)
                          setNotice(null)
                          const res = await fetch('/api/hydration/delete', {
                            method: 'POST',
                            headers: { 'content-type': 'application/json' },
                            body: JSON.stringify({ id: e.id }),
                          })
                          const json = await res.json().catch(() => null)
                          if (!res.ok || !json?.ok) throw new Error(json?.error ?? 'Failed to delete')
                          setNotice('Deleted')
                          router.refresh()
                        } catch (err) {
                          setError(err instanceof Error ? err.message : String(err))
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
            <p className="mt-3 text-sm text-slate-300">No hydration entries yet.</p>
          )}
        </div>

        {notice ? <p className="text-sm text-emerald-400">{notice}</p> : null}
        {error ? <p className="text-sm text-red-400">{error}</p> : null}

        <p className="text-xs text-slate-400">
          Note: water targets + unit preference are set in Settings (Hydration section).
        </p>
      </div>
    </div>
  )
}
