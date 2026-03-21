'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { peptideKey } from './peptides-utils'

// Types
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

type Profile = {
  normalized_name: string
  display_name: string | null
  vial_amount: number
  vial_unit: 'mg' | 'mcg'
  recon_volume_ml: number
}

export function PeptideScheduleClient() {
  // State
  const [items, setItems] = useState<Item[]>([])
  const [profilesByKey, setProfilesByKey] = useState<Record<string, Profile>>({})
  const [busy, setBusy] = useState(false)
  const [cycleStatus, setCycleStatus] = useState<'on_cycle' | 'off_cycle'>('on_cycle')
 const [offCycleEnd, setOffCycleEnd] = useState<string | null>(null)
 const [showOffCycleForm, setShowOffCycleForm] = useState(false)
 const [err, setErr] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [debug, setDebug] = useState<any>(null)

  // Cycle status
  const [cycleStatus, setCycleStatus] = useState<'on_cycle' | 'off_cycle'>('on_cycle')
  const [offCycleEnd, setOffCycleEnd] = useState<string | null>(null)
  const [loadingCycleStatus, setLoadingCycleStatus] = useState(false)
  const [updatingCycleStatus, setUpdatingCycleStatus] = useState(false)
  const [offCycleInput, setOffCycleInput] = useState('')

  // Utils
  const approxMcg = useCallback((it: Item): number | null => {
    if (it.dose_value == null || !Number.isFinite(Number(it.dose_value))) return null
    const dv = Number(it.dose_value)
    const unit = String(it.dose_unit ?? '').trim()

    if (unit === 'mcg') return dv
    if (unit === 'mg') return dv * 1000

    if (unit === 'u') {
      const prof = profilesByKey[it.normalized_name]
      if (!prof) return null
      const vialAmount = Number(prof.vial_amount)
      const reconMl = Number(prof.recon_volume_ml)
      if (!Number.isFinite(vialAmount) || !Number.isFinite(reconMl) || reconMl <= 0) return null
      const vialMcg = prof.vial_unit === 'mg' ? vialAmount * 1000 : vialAmount
      const mcgPerMl = vialMcg / reconMl
      const mlNeeded = dv / 100 // 100u per mL
      return mcgPerMl * mlNeeded
    }

    return null
  }, [profilesByKey])

  // Load the peptide schedule data
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

    // Load cycle status
    setLoadingCycleStatus(true)
    try {
      const cycleRes = await fetch('/api/peptides/cycle')
      const cycleJson = await cycleRes.json().catch(() => null)
      if (cycleRes.ok && cycleJson?.ok) {
        setCycleStatus(cycleJson.status ?? 'on_cycle')
        setOffCycleEnd(cycleJson.off_cycle_end ?? null)
      }
    } catch {
      // ignore error
    } finally {
      setLoadingCycleStatus(false)
    }
  }

  useEffect(() => {
    void load()
    void (async () => {
      try {
        const res = await fetch('/api/peptides/profiles')
        const json = await res.json().catch(() => null)
        if (res.ok && json?.ok && Array.isArray(json.items)) {
          const rows = json.items as any[]
          const names = rows
            .map((x) => String(x?.display_name ?? '').trim())
            .filter(Boolean)
          setProfileNames(Array.from(new Set(names)).sort((a, b) => a.localeCompare(b)))

          const byKey: Record<string, Profile> = {}
          for (const r of rows) {
            const k = String(r?.normalized_name ?? '').trim()
            if (!k) continue
            const vial_unit = String(r?.vial_unit ?? 'mg') as 'mg' | 'mcg'
            byKey[k] = {
              normalized_name: k,
              display_name: r.display_name ?? null,
              vial_amount: Number(r.vial_amount ?? 0),
              vial_unit: vial_unit === 'mcg' ? 'mcg' : 'mg',
              recon_volume_ml: Number(r.recon_volume_ml ?? 0),
            }
          }
          setProfilesByKey(byKey)
        }
      } catch {
        // ignore
      }
    })()
  }, [])

  // Handle going off cycle
  async function goOffCycle() {
    if (!confirm('Schedule will be off cycle, and reminders will be suppressed. Continue?')) return
    try {
      setUpdatingCycleStatus(true)
      const res = await fetch('/api/peptides/cycle', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'off_cycle', off_cycle_end: offCycleInput || null }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.ok) throw new Error(json?.error ?? 'Failed to update cycle')
      setCycleStatus('off_cycle')
      setNotice('Off cycle')
      load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setUpdatingCycleStatus(false)
    }
  }

  // Handle resuming cycle
  async function resumeCycle() {
    try {
      setUpdatingCycleStatus(true)
      const res = await fetch('/api/peptides/cycle', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'on_cycle' }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.ok) throw new Error(json?.error ?? 'Failed to update cycle')
      setCycleStatus('on_cycle')
      setNotice('On cycle')
      load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setUpdatingCycleStatus(false)
    }
  }

  const onCycle = cycleStatus === 'on_cycle'

  return (
    <div className="space-y-4">
{/* Cycle Status Banner */}
<div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
<div className="flex items-center gap-3">
{cycleStatus === 'on_cycle' ? (
<span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 text-sm font-medium text-emerald-300">🟢 On Cycle</span>
) : (
<span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-3 py-1 text-sm font-medium text-amber-300">
🟡 Off Cycle{offCycleEnd ? (resumes ${offCycleEnd}) : ''}
</span>
)}
</div>
<div className="flex items-center gap-2">
{cycleStatus === 'on_cycle' ? (
<>
{showOffCycleForm ? (
<div className="flex items-center gap-2">
<input
 type="date"
 className="rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-1 text-sm text-slate-100"
 onChange={(e) => setOffCycleEnd(e.target.value || null)}
 placeholder="End date (optional)"
 />
<button
 type="button"
 className="rounded-lg bg-amber-600 px-3 py-1 text-sm font-medium text-white hover:bg-amber-500"
 onClick={() => toggleCycle('off_cycle', offCycleEnd)}
>
Confirm Off Cycle
</button>
<button
 type="button"
 className="rounded-lg border border-slate-700 px-3 py-1 text-sm text-slate-300 hover:bg-slate-800"
 onClick={() => setShowOffCycleForm(false)}
>
Cancel
</button>
</div>
) : (
<button
 type="button"
 className="rounded-lg border border-amber-700 bg-amber-950/30 px-3 py-2 text-sm font-medium text-amber-200 hover:bg-amber-900/40"
 onClick={() => setShowOffCycleForm(true)}
>
Go Off Cycle
</button>
)}
</>
) : (
<button
 type="button"
 className="rounded-lg border border-emerald-700 bg-emerald-950/30 px-3 py-2 text-sm font-medium text-emerald-200 hover:bg-emerald-900/40"
 onClick={() => toggleCycle('on_cycle')}
>
Resume Cycle
</button>
)}
</div>
</div>

      <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/20 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            Cycle status:
            <span
              className={`ml-2 rounded-full px-2 py-0.5 font-mono text-xs uppercase ${
                onCycle ? 'bg-green-700 text-green-200' : 'bg-amber-700 text-amber-200'
              }`}
            >
              {onCycle
                ? '🟢 On Cycle'
                : `🟡 Off Cycle${offCycleEnd ? ` (resumes ${offCycleEnd})` : ''}`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onCycle ? (
              <>
                <button
                  type="button"
                  disabled={updatingCycleStatus}
                  className="rounded border border-amber-600 bg-amber-500/10 px-3 py-2 text-sm text-amber-200 hover:bg-amber-600 disabled:opacity-50"
                  onClick={goOffCycle}
                >
                  Go Off Cycle
                </button>
                <input
                  type="date"
                  value={offCycleInput}
                  className="rounded border border-amber-600 bg-amber-500/10 px-3 py-2 text-sm text-amber-200 placeholder:text-amber-200 hover:bg-amber-600 disabled:opacity-50"
                  onChange={(e) => setOffCycleInput(e.target.value)}
                />
              </>
            ) : (
              <button
                type="button"
                disabled={updatingCycleStatus}
                className="rounded border border-green-600 bg-green-500/10 px-3 py-2 text-sm text-green-200 hover:bg-green-600 disabled:opacity-50"
                onClick={resumeCycle}
              >
                Resume Cycle
              </button>
            )}
          </div>
        </div>
      </div>

      <div className={`${onCycle ? '' : 'opacity-40'} mt-4 space-y-6`}>...</div>
    </div>
  )
}

