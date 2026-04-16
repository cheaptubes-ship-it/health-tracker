'use client'

import { useEffect, useState } from 'react'

type WellnessEntry = {
  pain_overall: number | null
  pain_back: number | null
  pain_feet: number | null
  pain_joints: number | null
  mobility_score: number | null
  exercise_minutes: number | null
  brain_fog: number | null
  cognitive_clarity: number | null
  memory_score: number | null
  word_retrieval: number | null
  focus_duration_minutes: number | null
  headache: boolean
  headache_severity: number | null
  mood: number | null
  anxiety: number | null
  depression: number | null
  motivation: number | null
  craving_alcohol: number | null
  craving_cannabis: number | null
  energy_am: number | null
  energy_pm: number | null
  notes: string | null
}

type SliderProps = {
  label: string
  value: number | null
  onChange: (v: number) => void
  hint?: string
  inverted?: boolean
}

function Slider({ label, value, onChange, hint, inverted }: SliderProps) {
  const color = () => {
    if (value == null) return 'text-slate-400'
    if (inverted) {
      if (value <= 3) return 'text-emerald-400'
      if (value <= 6) return 'text-yellow-400'
      return 'text-red-400'
    } else {
      if (value >= 7) return 'text-emerald-400'
      if (value >= 4) return 'text-yellow-400'
      return 'text-red-400'
    }
  }
  return (
    <div className="grid gap-1">
      <div className="flex items-baseline justify-between">
        <label className="text-sm text-slate-200">{label}</label>
        <span className={`text-lg font-semibold ${color()}`}>{value ?? '—'}</span>
      </div>
      {hint && <div className="text-xs text-slate-500">{hint}</div>}
      <input
        type="range" min={1} max={10}
        value={value ?? 5}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-indigo-500"
      />
      <div className="flex justify-between text-xs text-slate-500">
        <span>1</span><span>10</span>
      </div>
    </div>
  )
}

const empty: WellnessEntry = {
  pain_overall: null, pain_back: null, pain_feet: null, pain_joints: null,
  mobility_score: null, steps_walked: null, exercise_minutes: null,
  brain_fog: null, cognitive_clarity: null, memory_score: null,
  word_retrieval: null, focus_duration_minutes: null,
  headache: false, headache_severity: null,
  mood: null, anxiety: null, depression: null, motivation: null,
  craving_alcohol: null, craving_cannabis: null,
  energy_am: null, energy_pm: null, notes: null,
}

export function WellnessClient({ selectedDate }: { selectedDate: string }) {
  const [entry, setEntry] = useState<WellnessEntry>(empty)
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    setLoaded(false)
    void (async () => {
      try {
        const res = await fetch(`/api/wellness?date=${selectedDate}`)
        const json = await res.json().catch(() => null)
        if (res.ok && json?.ok && json.entry) {
          setEntry({ ...empty, ...json.entry })
        } else {
          setEntry(empty)
        }
      } finally {
        setLoaded(true)
      }
    })()
  }, [selectedDate])

  function set<K extends keyof WellnessEntry>(key: K, val: WellnessEntry[K]) {
    setEntry(prev => ({ ...prev, [key]: val }))
    setSaved(false)
  }

  async function save() {
    setBusy(true)
    setErr(null)
    setSaved(false)
    try {
      const res = await fetch('/api/wellness', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...entry, entry_date: selectedDate }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.ok) throw new Error(json?.error ?? 'Failed to save')
      setSaved(true)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  if (!loaded) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-950/20 p-4">
        <p className="text-sm text-slate-400">Loading…</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">

      <div className="rounded-xl border border-slate-800 bg-slate-950/20 p-4">
        <h3 className="font-medium text-slate-100">Pain</h3>
        <p className="text-xs text-slate-400 mb-3">1 = no pain · 10 = worst pain</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Slider label="Overall pain" value={entry.pain_overall}
            onChange={v => set('pain_overall', v)} inverted />
          <Slider label="Back pain" value={entry.pain_back}
            onChange={v => set('pain_back', v)} inverted />
          <Slider label="Foot pain" value={entry.pain_feet}
            onChange={v => set('pain_feet', v)} inverted />
          <Slider label="Joint pain" value={entry.pain_joints}
            onChange={v => set('pain_joints', v)} inverted />
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/20 p-4">
        <h3 className="font-medium text-slate-100">Mobility</h3>
        <p className="text-xs text-slate-400 mb-3">10 = moving great</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Slider label="Mobility score" value={entry.mobility_score}
            onChange={v => set('mobility_score', v)} />

          <div className="grid gap-1">
            <label className="text-sm text-slate-200">Exercise minutes</label>
            <input type="number"
              value={entry.exercise_minutes ?? ''}
              onChange={e => set('exercise_minutes', e.target.value ? Number(e.target.value) : null)}
              className="rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-slate-100"
              placeholder="0" />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-indigo-800 bg-indigo-950/20 p-4">
        <h3 className="font-medium text-indigo-300">🧠 Cognitive / TBI Tracking</h3>
        <p className="text-xs text-slate-400 mb-3">Brain fog: 1=clear · 10=severe. Others: 10=best.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Slider label="Brain fog" value={entry.brain_fog}
            onChange={v => set('brain_fog', v)} inverted
            hint="1 = crystal clear · 10 = severe fog" />
          <Slider label="Cognitive clarity" value={entry.cognitive_clarity}
            onChange={v => set('cognitive_clarity', v)}
            hint="10 = sharpest" />
          <Slider label="Memory" value={entry.memory_score}
            onChange={v => set('memory_score', v)} />
          <Slider label="Word retrieval" value={entry.word_retrieval}
            onChange={v => set('word_retrieval', v)}
            hint="10 = words come easily" />
          <div className="grid gap-1">
            <label className="text-sm text-slate-200">Focus duration (minutes)</label>
            <input type="number"
              value={entry.focus_duration_minutes ?? ''}
              onChange={e => set('focus_duration_minutes', e.target.value ? Number(e.target.value) : null)}
              className="rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-slate-100"
              placeholder="minutes of focused work" />
          </div>
          <div className="grid gap-2">
            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input type="checkbox"
                checked={entry.headache}
                onChange={e => set('headache', e.target.checked)} />
              Headache today
            </label>
            {entry.headache && (
              <Slider label="Headache severity" value={entry.headache_severity}
                onChange={v => set('headache_severity', v)} inverted />
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-emerald-800 bg-emerald-950/20 p-4">
        <h3 className="font-medium text-emerald-300">Mood & Sobriety Support</h3>
        <p className="text-xs text-slate-400 mb-3">Cravings: 1=none · 10=intense. Others: 10=best.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Slider label="Mood" value={entry.mood}
            onChange={v => set('mood', v)} />
          <Slider label="Anxiety" value={entry.anxiety}
            onChange={v => set('anxiety', v)} inverted
            hint="1=calm · 10=severe" />
          <Slider label="Depression" value={entry.depression}
            onChange={v => set('depression', v)} inverted
            hint="1=none · 10=severe" />
          <Slider label="Motivation" value={entry.motivation}
            onChange={v => set('motivation', v)} />
          <Slider label="Alcohol craving" value={entry.craving_alcohol}
            onChange={v => set('craving_alcohol', v)} inverted
            hint="1=none at all · goal is always 1" />
          <Slider label="Cannabis craving" value={entry.craving_cannabis}
            onChange={v => set('craving_cannabis', v)} inverted
            hint="1=none at all · goal is always 1" />
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/20 p-4">
        <h3 className="font-medium text-slate-100">Energy</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Slider label="Morning energy" value={entry.energy_am}
            onChange={v => set('energy_am', v)} />
          <Slider label="Afternoon energy" value={entry.energy_pm}
            onChange={v => set('energy_pm', v)} />
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/20 p-4">
        <label className="grid gap-2 text-sm text-slate-200">
          Notes
          <textarea
            value={entry.notes ?? ''}
            onChange={e => set('notes', e.target.value || null)}
            rows={3}
            className="rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-slate-100"
            placeholder="How are you feeling overall today?" />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button type="button" onClick={() => void save()} disabled={busy}
          className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-50">
          {busy ? 'Saving…' : 'Save wellness entry'}
        </button>
        {saved && <span className="text-sm text-emerald-400">✓ Saved for {selectedDate}</span>}
        {err && <span className="text-sm text-red-400">{err}</span>}
      </div>
    </div>
  )
}
