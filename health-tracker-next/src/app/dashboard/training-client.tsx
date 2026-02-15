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
            {workoutExercises.map((ex) => (
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
            ))}
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
