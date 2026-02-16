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
  deload_override?: boolean
  isDeload: boolean
  deloadPhase: 'half_weight' | 'half_weight_half_volume' | null
  dayLabel: string | null
  repGoal: string | null
}

export function TrainingClient({
  selectedDate,
}: {
  selectedDate: string
}) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [program, setProgram] = useState<Program | null>(null)
  const [slots, setSlots] = useState<Slot[]>([])
  const [options, setOptions] = useState<Record<string, ExerciseOption[]>>({})

  const [templateFile, setTemplateFile] = useState<File | null>(null)
  const [templateInfo, setTemplateInfo] = useState<{ bucket: string | null; path: string | null; sheet: string | null } | null>(null)
  const [templateBusy, setTemplateBusy] = useState(false)

  type Workout = {
    id: string
    entry_date: string
    program_id: string | null
    week_index: number | null
    day_index: number | null
    note: string | null
  }

  type WorkoutExercise = {
    id: string
    slot_index: number
    slot_instance: number
    slot_key: string | null
    exercise_name: string
    planned_sets: number | null
    planned_rep_goal: string | null
    planned_weight: number | null
    rating: number | null
    note: string | null
    sets: Array<{
      id: string
      set_index: number
      weight: number | null
      reps: number | null
      rir: number | null
      is_warmup: boolean
    }>
  }

  const [workout, setWorkout] = useState<Workout | null>(null)
  const [workoutExercises, setWorkoutExercises] = useState<WorkoutExercise[]>([])

  const exBySlot = useCallback(() => {
    // pick the latest instance per slot
    const map = new Map<number, WorkoutExercise>()
    for (const ex of workoutExercises) {
      const cur = map.get(ex.slot_index)
      if (!cur || Number(ex.slot_instance) > Number(cur.slot_instance)) map.set(ex.slot_index, ex)
    }
    return map
  }, [workoutExercises])

  const load = useCallback(async () => {
    setErr(null)

    // Program + slot selection
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

    // Workout logging (sets/reps/feedback)
    const wRes = await fetch(`/api/training/workout/current?date=${encodeURIComponent(selectedDate)}`)
    const wJson = await wRes.json().catch(() => null)
    if (!wRes.ok || !wJson?.ok) {
      setErr(wJson?.error ?? 'Failed to load workout')
      return
    }
    setWorkout(wJson.workout)
    setWorkoutExercises(Array.isArray(wJson.exercises) ? wJson.exercises : [])
  }, [options, selectedDate])

  useEffect(() => {
    void load()
    void (async () => {
      try {
        const res = await fetch('/api/training/template')
        const json = await res.json().catch(() => null)
        if (res.ok && json?.ok && json.template) setTemplateInfo(json.template)
      } catch {
        // ignore
      }
    })()
  }, [load])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Training</h2>
          <p className="text-sm text-slate-300">
            Mesocycle 1 (v1). Upload your template once; “Create/Recreate program” will seed from it.
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              type="file"
              accept=".xlsx"
              onChange={(e) => setTemplateFile(e.target.files?.[0] ?? null)}
              className="text-xs text-slate-300"
            />
            <button
              type="button"
              disabled={templateBusy || !templateFile}
              className="rounded-lg border border-slate-700 bg-slate-950/20 px-3 py-2 text-sm text-slate-100 hover:bg-slate-900/40 disabled:opacity-50"
              onClick={async () => {
                if (!templateFile) return
                try {
                  setTemplateBusy(true)
                  setErr(null)
                  const fd = new FormData()
                  fd.append('file', templateFile)
                  fd.append('sheet', 'Mesocycle 1 Basic Hypertrophy')
                  const res = await fetch('/api/training/template/upload', { method: 'POST', body: fd })
                  const json = await res.json().catch(() => null)
                  if (!res.ok || !json?.ok) throw new Error(json?.error ?? 'Upload failed')
                  setTemplateInfo({ bucket: json.bucket ?? null, path: json.path ?? null, sheet: json.sheet ?? null })
                  setNotice('Template uploaded')
                } catch (e) {
                  setErr(e instanceof Error ? e.message : String(e))
                } finally {
                  setTemplateBusy(false)
                }
              }}
            >
              {templateBusy ? 'Uploading…' : 'Upload template'}
            </button>

            {templateInfo?.path ? (
              <span className="text-xs text-slate-400">Current: {templateInfo.sheet ?? '—'}</span>
            ) : (
              <span className="text-xs text-slate-500">No template uploaded</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {program ? (
            <>
              <div className="flex flex-wrap gap-2 rounded-xl border border-slate-800 bg-slate-900/20 p-2">
                <button
                  type="button"
                  disabled={busy}
                  className="rounded-lg border border-slate-700 bg-slate-950/20 px-2 py-1 text-sm text-slate-100 hover:bg-slate-900/40 disabled:opacity-50"
                  onClick={async () => {
                    try {
                      setBusy(true)
                      setErr(null)
                      const res = await fetch('/api/training/program/advance', {
                        method: 'POST',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify({ dir: 'prev-week' }),
                      })
                      const json = await res.json().catch(() => null)
                      if (!res.ok || !json?.ok) throw new Error(json?.error ?? 'Failed')
                      await load()
                    } catch (e) {
                      setErr(e instanceof Error ? e.message : String(e))
                    } finally {
                      setBusy(false)
                    }
                  }}
                >
                  ← Week
                </button>
                <button
                  type="button"
                  disabled={busy}
                  className="rounded-lg border border-slate-700 bg-slate-950/20 px-2 py-1 text-sm text-slate-100 hover:bg-slate-900/40 disabled:opacity-50"
                  onClick={async () => {
                    try {
                      setBusy(true)
                      setErr(null)
                      const res = await fetch('/api/training/program/advance', {
                        method: 'POST',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify({ dir: 'next-week' }),
                      })
                      const json = await res.json().catch(() => null)
                      if (!res.ok || !json?.ok) throw new Error(json?.error ?? 'Failed')
                      await load()
                    } catch (e) {
                      setErr(e instanceof Error ? e.message : String(e))
                    } finally {
                      setBusy(false)
                    }
                  }}
                >
                  Week →
                </button>
              </div>

              <div className="flex flex-wrap gap-1 rounded-xl border border-slate-800 bg-slate-900/20 p-2">
                {([1, 2, 3, 4, 5] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    disabled={busy}
                    className={
                      'rounded-lg px-2 py-1 text-sm ' +
                      (program.current_day === d
                        ? 'bg-indigo-500 text-white'
                        : 'border border-slate-700 bg-slate-950/20 text-slate-100 hover:bg-slate-900/40')
                    }
                    onClick={async () => {
                      try {
                        setBusy(true)
                        setErr(null)
                        const res = await fetch('/api/training/program/update', {
                          method: 'POST',
                          headers: { 'content-type': 'application/json' },
                          body: JSON.stringify({ current_day: d }),
                        })
                        const json = await res.json().catch(() => null)
                        if (!res.ok || !json?.ok) throw new Error(json?.error ?? 'Failed')
                        await load()
                      } catch (e) {
                        setErr(e instanceof Error ? e.message : String(e))
                      } finally {
                        setBusy(false)
                      }
                    }}
                  >
                    D{d}
                  </button>
                ))}
              </div>

              <button
                type="button"
                disabled={busy}
                className="rounded-lg border border-amber-700 bg-amber-500/10 px-3 py-2 text-sm text-amber-200 hover:bg-amber-500/20 disabled:opacity-50"
                onClick={async () => {
                  try {
                    setBusy(true)
                    setErr(null)
                    const res = await fetch('/api/training/program/deload/start', { method: 'POST' })
                    const json = await res.json().catch(() => null)
                    if (!res.ok || !json?.ok) throw new Error(json?.error ?? 'Failed')
                    await load()
                  } catch (e) {
                    setErr(e instanceof Error ? e.message : String(e))
                  } finally {
                    setBusy(false)
                  }
                }}
              >
                Start deload week
              </button>
            </>
          ) : null}

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
              Week {program.current_week} • Day {program.current_day}
              {program.dayLabel ? <span className="ml-2 text-slate-400">({program.dayLabel})</span> : null}
              {program.isDeload ? (
                <span className="ml-2 rounded bg-amber-500/20 px-2 py-1 text-xs text-amber-200">
                  DELOAD{program.deloadPhase ? `: ${program.deloadPhase === 'half_weight' ? '½ weight' : '½ weight + ½ volume'}` : ''}
                </span>
              ) : null}
            </div>
          </div>

          <div className="mt-3 grid gap-2 text-sm text-slate-300">
            <div>
              Rep goal: <span className="font-mono text-slate-100">{program.repGoal ?? '—'}</span>
            </div>
            <div className="text-xs text-slate-400">
              Day focus: <span className="text-slate-200">{program.dayLabel ?? `Day ${program.current_day}`}</span>
            </div>
            {program.isDeload ? (
              <div className="text-xs text-amber-200">
                Deload mode:{' '}
                {program.deloadPhase === 'half_weight'
                  ? '½ weight (first half of week)'
                  : program.deloadPhase === 'half_weight_half_volume'
                    ? '½ weight + ½ sets/reps (second half of week)'
                    : 'deload'}
              </div>
            ) : null}
          </div>

          <div className="mt-4 grid gap-2">
            {slots.map((s) => {
              const ex = exBySlot().get(s.slot_index) ?? null
              const hasLoggedData = Boolean(
                ex && (ex.rating != null || (ex.sets ?? []).some((x) => x.weight != null || x.reps != null || x.rir != null))
              )

              return (
                <div
                  key={`${s.day_index}-${s.slot_index}`}
                  className="rounded-lg border border-slate-800 bg-slate-950/10 p-3"
                >
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
                            if (!workout) return
                            const name = e.target.value

                            if (hasLoggedData) {
                              const ok = window.confirm(
                                'You have already logged sets/feedback for this slot today. Switching the exercise won\'t delete anything, but it may be confusing. Continue?'
                              )
                              if (!ok) return
                            }

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

                              if (name) {
                                // Ensure there is a workout_exercise row for this slot so logging is in the same card.
                                const res2 = await fetch('/api/training/workout/exercise/ensure', {
                                  method: 'POST',
                                  headers: { 'content-type': 'application/json' },
                                  body: JSON.stringify({
                                    workout_id: workout.id,
                                    slot_index: s.slot_index,
                                    slot_key: s.slot_key,
                                    exercise_name: name,
                                    planned_sets: s.default_sets,
                                  }),
                                })
                                const j2 = await res2.json().catch(() => null)
                                if (!res2.ok || !j2?.ok) throw new Error(j2?.error ?? 'Failed to seed workout log')
                              }

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

                    {/* Embedded workout log */}
                    {ex ? (
                      <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/20 p-3">
                        <div className="flex flex-wrap items-end justify-between gap-3">
                          <div className="text-xs text-slate-400">
                            Workout log
                            {ex.planned_sets != null || ex.planned_rep_goal || ex.planned_weight != null ? (
                              <span className="ml-2 text-slate-500">
                                plan:{' '}
                                {ex.planned_sets != null ? `${ex.planned_sets} sets` : '—'}
                                {ex.planned_rep_goal ? ` • ${ex.planned_rep_goal}` : ''}
                                {ex.planned_weight != null ? ` • ${ex.planned_weight}` : ''}
                              </span>
                            ) : null}
                          </div>
                          <label className="grid gap-1 text-xs text-slate-300">
                            Feedback
                            <select
                              className="h-9 rounded-lg border border-slate-700 bg-slate-950/40 px-2 text-sm text-slate-100"
                              value={ex.rating ?? ''}
                              onChange={async (e) => {
                                const v = e.target.value
                                const rating = v === '' ? null : Number(v)
                                setWorkoutExercises((prev) =>
                                  prev.map((x) => (x.id === ex.id ? { ...x, rating } : x))
                                )
                                try {
                                  const res = await fetch('/api/training/workout/exercise/update', {
                                    method: 'POST',
                                    headers: { 'content-type': 'application/json' },
                                    body: JSON.stringify({ id: ex.id, rating }),
                                  })
                                  const json = await res.json().catch(() => null)
                                  if (!res.ok || !json?.ok) throw new Error(json?.error ?? 'Failed')
                                } catch (e2) {
                                  setErr(e2 instanceof Error ? e2.message : String(e2))
                                }
                              }}
                            >
                              <option value="">—</option>
                              <option value={-2}>-2 (bad)</option>
                              <option value={-1}>-1</option>
                              <option value={0}>0</option>
                              <option value={1}>+1</option>
                              <option value={2}>+2 (great)</option>
                            </select>
                          </label>
                        </div>

                        <div className="mt-3 grid gap-2">
                          {(ex.sets ?? []).map((setRow) => (
                            <div key={setRow.id} className="grid gap-2 sm:grid-cols-[auto_1fr_1fr_1fr_auto] sm:items-end">
                              <div className="text-xs text-slate-400">Set {setRow.set_index}</div>
                              <label className="grid gap-1 text-xs text-slate-300">
                                Weight
                                <input
                                  className="h-9 rounded-lg border border-slate-700 bg-slate-950/40 px-2 text-sm text-slate-100"
                                  type="number"
                                  step="0.5"
                                  value={setRow.weight ?? ''}
                                  onChange={(e) => {
                                    const v = e.target.value
                                    setWorkoutExercises((prev) =>
                                      prev.map((x) =>
                                        x.id === ex.id
                                          ? {
                                              ...x,
                                              sets: x.sets.map((y) =>
                                                y.id === setRow.id ? { ...y, weight: v ? Number(v) : null } : y
                                              ),
                                            }
                                          : x
                                      )
                                    )
                                  }}
                                  onBlur={async () => {
                                    try {
                                      const res = await fetch('/api/training/workout/set/upsert', {
                                        method: 'POST',
                                        headers: { 'content-type': 'application/json' },
                                        body: JSON.stringify({
                                          workout_exercise_id: ex.id,
                                          set_index: setRow.set_index,
                                          weight: setRow.weight,
                                          reps: setRow.reps,
                                          rir: setRow.rir,
                                          is_warmup: setRow.is_warmup,
                                        }),
                                      })
                                      const json = await res.json().catch(() => null)
                                      if (!res.ok || !json?.ok) throw new Error(json?.error ?? 'Failed')
                                    } catch (e2) {
                                      setErr(e2 instanceof Error ? e2.message : String(e2))
                                    }
                                  }}
                                />
                              </label>
                              <label className="grid gap-1 text-xs text-slate-300">
                                Reps
                                <input
                                  className="h-9 rounded-lg border border-slate-700 bg-slate-950/40 px-2 text-sm text-slate-100"
                                  type="number"
                                  step="1"
                                  value={setRow.reps ?? ''}
                                  onChange={(e) => {
                                    const v = e.target.value
                                    setWorkoutExercises((prev) =>
                                      prev.map((x) =>
                                        x.id === ex.id
                                          ? {
                                              ...x,
                                              sets: x.sets.map((y) =>
                                                y.id === setRow.id ? { ...y, reps: v ? Number(v) : null } : y
                                              ),
                                            }
                                          : x
                                      )
                                    )
                                  }}
                                  onBlur={async () => {
                                    try {
                                      const res = await fetch('/api/training/workout/set/upsert', {
                                        method: 'POST',
                                        headers: { 'content-type': 'application/json' },
                                        body: JSON.stringify({
                                          workout_exercise_id: ex.id,
                                          set_index: setRow.set_index,
                                          weight: setRow.weight,
                                          reps: setRow.reps,
                                          rir: setRow.rir,
                                          is_warmup: setRow.is_warmup,
                                        }),
                                      })
                                      const json = await res.json().catch(() => null)
                                      if (!res.ok || !json?.ok) throw new Error(json?.error ?? 'Failed')
                                    } catch (e2) {
                                      setErr(e2 instanceof Error ? e2.message : String(e2))
                                    }
                                  }}
                                />
                              </label>
                              <label className="grid gap-1 text-xs text-slate-300">
                                RIR
                                <input
                                  className="h-9 rounded-lg border border-slate-700 bg-slate-950/40 px-2 text-sm text-slate-100"
                                  type="number"
                                  step="1"
                                  value={setRow.rir ?? ''}
                                  onChange={(e) => {
                                    const v = e.target.value
                                    setWorkoutExercises((prev) =>
                                      prev.map((x) =>
                                        x.id === ex.id
                                          ? {
                                              ...x,
                                              sets: x.sets.map((y) =>
                                                y.id === setRow.id ? { ...y, rir: v ? Number(v) : null } : y
                                              ),
                                            }
                                          : x
                                      )
                                    )
                                  }}
                                  onBlur={async () => {
                                    try {
                                      const res = await fetch('/api/training/workout/set/upsert', {
                                        method: 'POST',
                                        headers: { 'content-type': 'application/json' },
                                        body: JSON.stringify({
                                          workout_exercise_id: ex.id,
                                          set_index: setRow.set_index,
                                          weight: setRow.weight,
                                          reps: setRow.reps,
                                          rir: setRow.rir,
                                          is_warmup: setRow.is_warmup,
                                        }),
                                      })
                                      const json = await res.json().catch(() => null)
                                      if (!res.ok || !json?.ok) throw new Error(json?.error ?? 'Failed')
                                    } catch (e2) {
                                      setErr(e2 instanceof Error ? e2.message : String(e2))
                                    }
                                  }}
                                />
                              </label>
                              <label className="flex items-center gap-2 text-xs text-slate-300">
                                <input
                                  type="checkbox"
                                  checked={setRow.is_warmup}
                                  onChange={async (e) => {
                                    const is_warmup = e.target.checked
                                    setWorkoutExercises((prev) =>
                                      prev.map((x) =>
                                        x.id === ex.id
                                          ? {
                                              ...x,
                                              sets: x.sets.map((y) =>
                                                y.id === setRow.id ? { ...y, is_warmup } : y
                                              ),
                                            }
                                          : x
                                      )
                                    )
                                    try {
                                      const res = await fetch('/api/training/workout/set/upsert', {
                                        method: 'POST',
                                        headers: { 'content-type': 'application/json' },
                                        body: JSON.stringify({
                                          workout_exercise_id: ex.id,
                                          set_index: setRow.set_index,
                                          weight: setRow.weight,
                                          reps: setRow.reps,
                                          rir: setRow.rir,
                                          is_warmup,
                                        }),
                                      })
                                      const json = await res.json().catch(() => null)
                                      if (!res.ok || !json?.ok) throw new Error(json?.error ?? 'Failed')
                                    } catch (e2) {
                                      setErr(e2 instanceof Error ? e2.message : String(e2))
                                    }
                                  }}
                                />
                                Warmup
                              </label>
                            </div>
                          ))}

                          <button
                            type="button"
                            className="w-fit rounded-lg border border-slate-700 bg-slate-950/30 px-3 py-2 text-sm text-slate-100 hover:bg-slate-900/50"
                            onClick={async () => {
                              const nextIndex = (ex.sets?.length ? Math.max(...ex.sets.map((x) => x.set_index)) : 0) + 1
                              const tempId = `tmp-${ex.id}-${nextIndex}`
                              setWorkoutExercises((prev) =>
                                prev.map((x) =>
                                  x.id === ex.id
                                    ? {
                                        ...x,
                                        sets: [
                                          ...x.sets,
                                          { id: tempId, set_index: nextIndex, weight: null, reps: null, rir: null, is_warmup: false },
                                        ],
                                      }
                                    : x
                                )
                              )
                              try {
                                const res = await fetch('/api/training/workout/set/upsert', {
                                  method: 'POST',
                                  headers: { 'content-type': 'application/json' },
                                  body: JSON.stringify({ workout_exercise_id: ex.id, set_index: nextIndex, weight: null, reps: null, rir: null, is_warmup: false }),
                                })
                                const json = await res.json().catch(() => null)
                                if (!res.ok || !json?.ok) throw new Error(json?.error ?? 'Failed to add set')
                                await load()
                              } catch (e2) {
                                setErr(e2 instanceof Error ? e2.message : String(e2))
                              }
                            }}
                          >
                            + Add set
                          </button>

                          <label className="mt-2 grid gap-1 text-xs text-slate-300">
                            Notes
                            <textarea
                              className="min-h-16 rounded-lg border border-slate-700 bg-slate-950/40 px-2 py-2 text-sm text-slate-100"
                              value={ex.note ?? ''}
                              onChange={(e) => {
                                const note = e.target.value
                                setWorkoutExercises((prev) => prev.map((x) => (x.id === ex.id ? { ...x, note } : x)))
                              }}
                              onBlur={async () => {
                                try {
                                  const res = await fetch('/api/training/workout/exercise/update', {
                                    method: 'POST',
                                    headers: { 'content-type': 'application/json' },
                                    body: JSON.stringify({ id: ex.id, note: ex.note ?? '' }),
                                  })
                                  const json = await res.json().catch(() => null)
                                  if (!res.ok || !json?.ok) throw new Error(json?.error ?? 'Failed')
                                } catch (e2) {
                                  setErr(e2 instanceof Error ? e2.message : String(e2))
                                }
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/10 p-3 text-sm text-slate-400">
                        Select an exercise above to start logging sets/reps here.
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-950/20 p-4 text-sm text-slate-300">
          No program yet. Click “Create program”.
        </div>
      )}

      <div className="rounded-xl border border-slate-800 bg-slate-950/20 p-4">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <h3 className="font-medium">Workout log</h3>
            <div className="text-xs text-slate-400">{selectedDate}</div>
          </div>
          {workout ? (
            <div className="text-xs text-slate-400">Workout: {workout.id.slice(0, 8)}</div>
          ) : null}
        </div>

        {workoutExercises.length ? (
          <div className="mt-3 grid gap-3">
            {(() => {
              const maxBySlot = new Map<number, number>()
              for (const ex of workoutExercises) {
                const cur = maxBySlot.get(ex.slot_index) ?? 0
                const next = Number(ex.slot_instance ?? 0)
                if (next > cur) maxBySlot.set(ex.slot_index, next)
              }
              const prev = workoutExercises.filter(
                (ex) => Number(ex.slot_instance ?? 0) < (maxBySlot.get(ex.slot_index) ?? 0)
              )

              if (!prev.length) {
                return <div className="text-sm text-slate-400">No previous exercises logged for today.</div>
              }

              return prev.map((ex) => (
              <div key={ex.id} className="rounded-lg border border-slate-800 bg-slate-950/10 p-3">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-100">{ex.exercise_name}</div>
                    <div className="text-xs text-slate-400">
                      {ex.planned_sets != null ? `${ex.planned_sets} sets` : ''}
                      {ex.planned_rep_goal ? ` • goal ${ex.planned_rep_goal}` : ''}
                      {ex.planned_weight != null ? ` • ${ex.planned_weight}` : ''}
                    </div>
                  </div>

                  <label className="grid gap-1 text-xs text-slate-300">
                    Feedback
                    <select
                      className="h-9 rounded-lg border border-slate-700 bg-slate-950/40 px-2 text-sm text-slate-100"
                      value={ex.rating ?? ''}
                      onChange={async (e) => {
                        const v = e.target.value
                        const rating = v === '' ? null : Number(v)
                        setWorkoutExercises((prev) =>
                          prev.map((x) => (x.id === ex.id ? { ...x, rating } : x))
                        )
                        try {
                          const res = await fetch('/api/training/workout/exercise/update', {
                            method: 'POST',
                            headers: { 'content-type': 'application/json' },
                            body: JSON.stringify({ id: ex.id, rating }),
                          })
                          const json = await res.json().catch(() => null)
                          if (!res.ok || !json?.ok) throw new Error(json?.error ?? 'Failed')
                        } catch (e2) {
                          setErr(e2 instanceof Error ? e2.message : String(e2))
                        }
                      }}
                    >
                      <option value="">—</option>
                      <option value={-2}>-2 (bad)</option>
                      <option value={-1}>-1</option>
                      <option value={0}>0</option>
                      <option value={1}>+1</option>
                      <option value={2}>+2 (great)</option>
                    </select>
                  </label>
                </div>

                <div className="mt-3">
                  <div className="grid gap-2">
                    {(ex.sets ?? []).map((s) => (
                      <div key={s.id} className="grid gap-2 sm:grid-cols-[auto_1fr_1fr_1fr_auto] sm:items-end">
                        <div className="text-xs text-slate-400">Set {s.set_index}</div>
                        <label className="grid gap-1 text-xs text-slate-300">
                          Weight
                          <input
                            className="h-9 rounded-lg border border-slate-700 bg-slate-950/40 px-2 text-sm text-slate-100"
                            type="number"
                            step="0.5"
                            value={s.weight ?? ''}
                            onChange={(e) => {
                              const v = e.target.value
                              setWorkoutExercises((prev) =>
                                prev.map((x) =>
                                  x.id === ex.id
                                    ? {
                                        ...x,
                                        sets: x.sets.map((y) =>
                                          y.id === s.id ? { ...y, weight: v ? Number(v) : null } : y
                                        ),
                                      }
                                    : x
                                )
                              )
                            }}
                            onBlur={async () => {
                              try {
                                const res = await fetch('/api/training/workout/set/upsert', {
                                  method: 'POST',
                                  headers: { 'content-type': 'application/json' },
                                  body: JSON.stringify({ workout_exercise_id: ex.id, set_index: s.set_index, weight: s.weight, reps: s.reps, rir: s.rir, is_warmup: s.is_warmup }),
                                })
                                const json = await res.json().catch(() => null)
                                if (!res.ok || !json?.ok) throw new Error(json?.error ?? 'Failed')
                              } catch (e2) {
                                setErr(e2 instanceof Error ? e2.message : String(e2))
                              }
                            }}
                          />
                        </label>
                        <label className="grid gap-1 text-xs text-slate-300">
                          Reps
                          <input
                            className="h-9 rounded-lg border border-slate-700 bg-slate-950/40 px-2 text-sm text-slate-100"
                            type="number"
                            step="1"
                            value={s.reps ?? ''}
                            onChange={(e) => {
                              const v = e.target.value
                              setWorkoutExercises((prev) =>
                                prev.map((x) =>
                                  x.id === ex.id
                                    ? {
                                        ...x,
                                        sets: x.sets.map((y) =>
                                          y.id === s.id ? { ...y, reps: v ? Number(v) : null } : y
                                        ),
                                      }
                                    : x
                                )
                              )
                            }}
                            onBlur={async () => {
                              try {
                                const res = await fetch('/api/training/workout/set/upsert', {
                                  method: 'POST',
                                  headers: { 'content-type': 'application/json' },
                                  body: JSON.stringify({ workout_exercise_id: ex.id, set_index: s.set_index, weight: s.weight, reps: s.reps, rir: s.rir, is_warmup: s.is_warmup }),
                                })
                                const json = await res.json().catch(() => null)
                                if (!res.ok || !json?.ok) throw new Error(json?.error ?? 'Failed')
                              } catch (e2) {
                                setErr(e2 instanceof Error ? e2.message : String(e2))
                              }
                            }}
                          />
                        </label>
                        <label className="grid gap-1 text-xs text-slate-300">
                          RIR
                          <input
                            className="h-9 rounded-lg border border-slate-700 bg-slate-950/40 px-2 text-sm text-slate-100"
                            type="number"
                            step="1"
                            value={s.rir ?? ''}
                            onChange={(e) => {
                              const v = e.target.value
                              setWorkoutExercises((prev) =>
                                prev.map((x) =>
                                  x.id === ex.id
                                    ? {
                                        ...x,
                                        sets: x.sets.map((y) =>
                                          y.id === s.id ? { ...y, rir: v ? Number(v) : null } : y
                                        ),
                                      }
                                    : x
                                )
                              )
                            }}
                            onBlur={async () => {
                              try {
                                const res = await fetch('/api/training/workout/set/upsert', {
                                  method: 'POST',
                                  headers: { 'content-type': 'application/json' },
                                  body: JSON.stringify({ workout_exercise_id: ex.id, set_index: s.set_index, weight: s.weight, reps: s.reps, rir: s.rir, is_warmup: s.is_warmup }),
                                })
                                const json = await res.json().catch(() => null)
                                if (!res.ok || !json?.ok) throw new Error(json?.error ?? 'Failed')
                              } catch (e2) {
                                setErr(e2 instanceof Error ? e2.message : String(e2))
                              }
                            }}
                          />
                        </label>
                        <label className="flex items-center gap-2 text-xs text-slate-300">
                          <input
                            type="checkbox"
                            checked={s.is_warmup}
                            onChange={async (e) => {
                              const is_warmup = e.target.checked
                              setWorkoutExercises((prev) =>
                                prev.map((x) =>
                                  x.id === ex.id
                                    ? {
                                        ...x,
                                        sets: x.sets.map((y) =>
                                          y.id === s.id ? { ...y, is_warmup } : y
                                        ),
                                      }
                                    : x
                                )
                              )
                              try {
                                const res = await fetch('/api/training/workout/set/upsert', {
                                  method: 'POST',
                                  headers: { 'content-type': 'application/json' },
                                  body: JSON.stringify({ workout_exercise_id: ex.id, set_index: s.set_index, weight: s.weight, reps: s.reps, rir: s.rir, is_warmup }),
                                })
                                const json = await res.json().catch(() => null)
                                if (!res.ok || !json?.ok) throw new Error(json?.error ?? 'Failed')
                              } catch (e2) {
                                setErr(e2 instanceof Error ? e2.message : String(e2))
                              }
                            }}
                          />
                          Warmup
                        </label>
                      </div>
                    ))}

                    <button
                      type="button"
                      className="w-fit rounded-lg border border-slate-700 bg-slate-950/30 px-3 py-2 text-sm text-slate-100 hover:bg-slate-900/50"
                      onClick={async () => {
                        const nextIndex = (ex.sets?.length ? Math.max(...ex.sets.map((x) => x.set_index)) : 0) + 1
                        // optimistic row
                        const tempId = `tmp-${ex.id}-${nextIndex}`
                        setWorkoutExercises((prev) =>
                          prev.map((x) =>
                            x.id === ex.id
                              ? {
                                  ...x,
                                  sets: [
                                    ...x.sets,
                                    { id: tempId, set_index: nextIndex, weight: null, reps: null, rir: null, is_warmup: false },
                                  ],
                                }
                              : x
                          )
                        )
                        try {
                          const res = await fetch('/api/training/workout/set/upsert', {
                            method: 'POST',
                            headers: { 'content-type': 'application/json' },
                            body: JSON.stringify({ workout_exercise_id: ex.id, set_index: nextIndex, weight: null, reps: null, rir: null, is_warmup: false }),
                          })
                          const json = await res.json().catch(() => null)
                          if (!res.ok || !json?.ok) throw new Error(json?.error ?? 'Failed to add set')
                          // reload to get real UUIDs
                          await load()
                        } catch (e2) {
                          setErr(e2 instanceof Error ? e2.message : String(e2))
                        }
                      }}
                    >
                      + Add set
                    </button>
                  </div>

                  <label className="mt-3 grid gap-1 text-xs text-slate-300">
                    Notes
                    <textarea
                      className="min-h-16 rounded-lg border border-slate-700 bg-slate-950/40 px-2 py-2 text-sm text-slate-100"
                      value={ex.note ?? ''}
                      onChange={(e) => {
                        const note = e.target.value
                        setWorkoutExercises((prev) => prev.map((x) => (x.id === ex.id ? { ...x, note } : x)))
                      }}
                      onBlur={async () => {
                        try {
                          const res = await fetch('/api/training/workout/exercise/update', {
                            method: 'POST',
                            headers: { 'content-type': 'application/json' },
                            body: JSON.stringify({ id: ex.id, note: ex.note ?? '' }),
                          })
                          const json = await res.json().catch(() => null)
                          if (!res.ok || !json?.ok) throw new Error(json?.error ?? 'Failed')
                        } catch (e2) {
                          setErr(e2 instanceof Error ? e2.message : String(e2))
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
              ))
            })()}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-300">
            No workout exercises yet. Create a program and select exercises, then refresh.
          </p>
        )}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/20 p-4 text-sm text-slate-300">
        Next: exercise selection UI + 10RM entry per slot, then generate Week 1 weights from your 10RM.
      </div>
    </div>
  )
}
