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
  const [lemonJuice, setLemonJuice] = useState(false)
  const [servings, setServings] = useState<'1' | '0.3333' | '0.5' | '0.6667'>('1')

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

  async function addEmergenC() {
    try {
      setError(null)
      setNotice(null)
      await add({
        name: 'Emergen-C (1000mg vitamin C)',
        servings: 1,
        water_ml: 0,
        sodium_mg: 0,
        potassium_mg: 0,
        magnesium_mg: 0,
        caffeine_mg: 0,
        sugar_g: 3.9,
        lemon_juice: false,
      })
      setNotice('Emergen-C added')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
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
              <div className="text-lg font-semibold">{remaining.sodium_mg ?? '—'}</div>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-3">
              <div className="text-xs text-slate-400">Potassium</div>
              <div className="text-lg font-semibold">{remaining.potassium_mg ?? '—'}</div>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-3">
              <div className="text-xs text-slate-400">Magnesium</div>
              <div className="text-lg font-semibold">{remaining.magnesium_mg ?? '—'}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => addEmergenC()}
            className="rounded-lg border border-slate-700 bg-slate-950/30 px-3 py-2 text-sm text-slate-100 hover:bg-slate-900"
          >
            Add Emergen-C (1000mg vitamin C)
          </button>
        </div>
      </div>
    )
}
