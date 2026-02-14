'use client'

import { useEffect, useState, useCallback } from 'react'

type Slot = {
  day_index: number
  slot_index: number
  slot_key: string
  slot_label: string
  exercise_name: string | null
  video_url: string | null
  ten_rm_weight: number | null
  ten_rm_unit: string
  default_sets: number | null
}

type ExerciseOption = { name: string; video_url: string }

type Program = {
  id: string
  name: string
  template_id: string
  current_week: number
  current_day: number
  inserted_deload_weeks: number
  isDeload: boolean
  repGoal: string | null
}

export function TrainingClient() {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [program, setProgram] = useState<Program | null>(null)
  const [slots, setSlots] = useState<Slot[]>([])
  const [options, setOptions] = useState<Record<string, ExerciseOption[]>>({})

  const load = useCallback(async () => {
    setErr(null)
    const res = await fetch('/api/training/program/current')
    const json = await res.json().catch(() => null)
    if (!res.ok || !json?.ok) {
      setErr(json?.error ?? 'Failed to load program')
      return
    }
    setProgram(json.program)
    const nextSlots: Slot[] = Array.isArray(json.slots) ? json.slots : []
    setSlots(nextSlots)

    // Fetch exercise options for each slot key (cached in state)
    const keys = Array.from(new Set(nextSlots.map((s) => s.slot_key).filter(Boolean)))
    await Promise.all(
      keys
        .filter((k) => !options[k])
        .map(async (k) => {
          const res2 = await fetch(`/api/training/exercises?slotKey=${encodeURIComponent(k)}`)
          const j2 = await res2.json().catch(() => null)
          if (res2.ok && j2?.ok && Array.isArray(j2.items)) {
            setOptions((prev) => ({ ...prev, [k]: j2.items }))
          }
        })
    )
  }, [options])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Training</h2>
          <p className="text-sm text-slate-300">
            Mesocycle 1 (v1). We’ll add the full 10RM→weight logic next.
          </p>
        </div>

        <button
          className="rounded-lg bg-indigo-500 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
          disabled={busy}
          onClick={async () => {
            try {
              setBusy(true)
              setErr(null)
              setNotice(null)
              const res = await fetch('/api/training/program/create', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({}),
              })
              const json = await res.json().catch(() => null)
              if (!res.ok || !json?.ok) throw new Error(json?.error ?? 'Failed to create program')
              setNotice('Created')
              await load()
            } catch (e) {
              setErr(e instanceof Error ? e.message : String(e))
            } finally {
              setBusy(false)
            }
          }}
        >
          {program ? 'Recreate program' : 'Create program'}
        </button>
      </div>

      {notice ? <p className="text-sm text-emerald-400">{notice}</p> : null}
      {err ? <p className="text-sm text-red-400">{err}</p> : null}

      {program ? (
        <div className="rounded-xl border border-slate-800 bg-slate-950/20 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-100">{program.name}</div>
              <div className="text-xs text-slate-400">{program.template_id}</div>
            </div>
            <div className="text-sm text-slate-200">
              Week {program.current_week} • Day {program.current_day}{' '}
              {program.isDeload ? (
                <span className="ml-2 rounded bg-amber-500/20 px-2 py-1 text-xs text-amber-200">
                  DELOAD
                </span>
              ) : null}
            </div>
          </div>

          <div className="mt-3 text-sm text-slate-300">
            Rep goal: <span className="font-mono text-slate-100">{program.repGoal ?? '—'}</span>
          </div>

          <div className="mt-4 grid gap-2">
            {slots.map((s) => (
              <div
                key={`${s.day_index}-${s.slot_index}`}
                className="rounded-lg border border-slate-800 bg-slate-950/10 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-100">
                      {s.slot_index}. {s.slot_label}
                    </div>
                    <div className="text-xs text-slate-400">{s.slot_key}</div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
                      <label className="grid gap-1 text-sm text-slate-200">
                        Exercise
                        <select
                          className="h-10 w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          value={s.exercise_name ?? ''}
                          onChange={async (e) => {
                            if (!program) return
                            const name = e.target.value
                            const opt = (options[s.slot_key] ?? []).find((x) => x.name === name) ?? null
                            try {
                              setErr(null)
                              const res = await fetch('/api/training/slot/update', {
                                method: 'POST',
                                headers: { 'content-type': 'application/json' },
                                body: JSON.stringify({
                                  program_id: program.id,
                                  day_index: s.day_index,
                                  slot_index: s.slot_index,
                                  exercise_name: name || null,
                                  video_url: opt?.video_url ?? null,
                                  ten_rm_weight: s.ten_rm_weight,
                                  ten_rm_unit: s.ten_rm_unit,
                                }),
                              })
                              const json = await res.json().catch(() => null)
                              if (!res.ok || !json?.ok) throw new Error(json?.error ?? 'Failed to save')
                              await load()
                            } catch (e2) {
                              setErr(e2 instanceof Error ? e2.message : String(e2))
                            }
                          }}
                        >
                          <option value="">— select —</option>
                          {(options[s.slot_key] ?? []).map((o) => (
                            <option key={o.name} value={o.name}>
                              {o.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="grid gap-1 text-sm text-slate-200">
                        10RM (lb)
                        <input
                          className="h-10 w-28 rounded-lg border border-slate-700 bg-slate-950/40 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          type="number"
                          step="0.5"
                          min={0}
                          value={s.ten_rm_weight ?? ''}
                          onChange={(e) => {
                            const v = e.target.value
                            setSlots((prev) =>
                              prev.map((x) =>
                                x.slot_index === s.slot_index && x.day_index === s.day_index
                                  ? { ...x, ten_rm_weight: v ? Number(v) : null }
                                  : x
                              )
                            )
                          }}
                          onBlur={async () => {
                            if (!program) return
                            try {
                              setErr(null)
                              const res = await fetch('/api/training/slot/update', {
                                method: 'POST',
                                headers: { 'content-type': 'application/json' },
                                body: JSON.stringify({
                                  program_id: program.id,
                                  day_index: s.day_index,
                                  slot_index: s.slot_index,
                                  exercise_name: s.exercise_name,
                                  video_url: s.video_url,
                                  ten_rm_weight: s.ten_rm_weight,
                                  ten_rm_unit: s.ten_rm_unit,
                                }),
                              })
                              const json = await res.json().catch(() => null)
                              if (!res.ok || !json?.ok) throw new Error(json?.error ?? 'Failed to save 10RM')
                              setNotice('Saved')
                            } catch (e2) {
                              setErr(e2 instanceof Error ? e2.message : String(e2))
                            }
                          }}
                        />
                      </label>
                    </div>

                    <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
                      <div>Sets: {s.default_sets ?? '—'}</div>
                      {s.video_url ? (
                        <a className="text-indigo-300 underline" href={s.video_url} target="_blank" rel="noreferrer">
                          Video
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-950/20 p-4 text-sm text-slate-300">
          No program yet. Click “Create program”.
        </div>
      )}

      <div className="rounded-xl border border-slate-800 bg-slate-950/20 p-4 text-sm text-slate-300">
        Next: exercise selection UI + 10RM entry per slot, then generate Week 1 weights from your 10RM.
      </div>
    </div>
  )
}
