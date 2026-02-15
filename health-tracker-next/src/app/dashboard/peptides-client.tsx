'use client'

import { useEffect, useMemo, useState } from 'react'
import { calcPeptide, peptideKey } from './peptides-utils'

type AddPeptideAction = (formData: FormData) => Promise<void>

type PeptideProfile = {
  normalized_name: string
  display_name: string | null
  vial_amount: number
  vial_unit: 'mg' | 'mcg'
  recon_volume_ml: number
  default_note: string | null
}

export function PeptidesClient({
  selectedDate,
  addPeptideAction,
}: {
  selectedDate: string
  addPeptideAction: AddPeptideAction
}) {
  const [name, setName] = useState('')
  const [profiles, setProfiles] = useState<PeptideProfile[]>([])
  const [profilesLoaded, setProfilesLoaded] = useState(false)
  const [vialAmount, setVialAmount] = useState('')
  const [vialUnit, setVialUnit] = useState<'mg' | 'mcg'>('mg')
  const [reconVolume, setReconVolume] = useState('')
  const [dose, setDose] = useState('')
  const [doseUnit, setDoseUnit] = useState<'mcg' | 'mg'>('mcg')
  const [frequency, setFrequency] = useState('')
  const [timing, setTiming] = useState('')
  const [note, setNote] = useState('')
  const [saveDefault, setSaveDefault] = useState(false)
  const [defaultLoading, setDefaultLoading] = useState(false)
  const [takenNow, setTakenNow] = useState(false)
  const [sideEffectNote, setSideEffectNote] = useState('')
  const [sideEffectTags, setSideEffectTags] = useState<string[]>([])

  const commonSideEffects = [
    { id: 'pins_needles', label: 'Pins/needles' },
    { id: 'sleep', label: 'Sleep issues' },
    { id: 'anxiety', label: 'Anxiety/irritability' },
    { id: 'headache', label: 'Headache' },
    { id: 'gi', label: 'GI upset' },
  ]

  useEffect(() => {
    if (profilesLoaded) return
    void (async () => {
      try {
        const res = await fetch('/api/peptides/profiles')
        const json = await res.json().catch(() => null)
        if (res.ok && json?.ok && Array.isArray(json.items)) {
          setProfiles(json.items)
        }
      } finally {
        setProfilesLoaded(true)
      }
    })()
  }, [profilesLoaded])

  const calc = useMemo(() => {
    const va = Number(vialAmount)
    const rv = Number(reconVolume)
    const dd = Number(dose)
    if (!Number.isFinite(va) || !Number.isFinite(rv) || !Number.isFinite(dd)) return null
    if (va <= 0 || rv <= 0 || dd <= 0) return null
    return calcPeptide({
      vial_amount: va,
      vial_unit: vialUnit,
      recon_volume_ml: rv,
      desired_dose: dd,
      desired_dose_unit: doseUnit,
    })
  }, [vialAmount, vialUnit, reconVolume, dose, doseUnit])

  return (
    <div className="space-y-4">
      <form
        action={addPeptideAction}
        className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950/20 p-4"
      >
        <input type="hidden" name="entry_date" value={selectedDate} />

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm text-slate-200">
            Name
            <input
              name="name"
              list="peptide-names"
              className="rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. BPC-157"
              required
              value={name}
              onChange={async (e) => {
                const next = e.target.value
                setName(next)

                const key = peptideKey(next)
                const prof = profiles.find((p) => p.normalized_name === key) ?? null
                // Autofill vial/recon defaults if the user hasn't typed anything yet.
                if (prof) {
                  if (!vialAmount.trim()) setVialAmount(String(prof.vial_amount))
                  if (!reconVolume.trim()) setReconVolume(String(prof.recon_volume_ml))
                  setVialUnit(prof.vial_unit)
                  if (!note.trim() && prof.default_note) setNote(String(prof.default_note))
                }

                // Fetch default note (normalized server-side) and prefill if memo is empty.
                if (!next.trim()) return
                if (note.trim()) return
                try {
                  setDefaultLoading(true)
                  const res = await fetch(`/api/peptides/defaults?name=${encodeURIComponent(next)}`)
                  const json = await res.json().catch(() => null)
                  if (res.ok && json?.ok && json.default_note) setNote(String(json.default_note))
                } finally {
                  setDefaultLoading(false)
                }
              }}
            />
            <datalist id="peptide-names">
              {profiles
                .map((p) => p.display_name)
                .filter((x): x is string => Boolean(x))
                .map((n) => (
                  <option key={n} value={n} />
                ))}
            </datalist>
          </label>

          <label className="grid gap-1 text-sm text-slate-200">
            Vial amount
            <div className="flex gap-2">
              <input
                name="vial_amount"
                type="number"
                step="0.01"
                className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
                value={vialAmount}
                onChange={(e) => setVialAmount(e.target.value)}
              />
              <select
                name="vial_unit"
                className="rounded-lg border border-slate-700 bg-slate-950/40 px-2 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={vialUnit}
                onChange={(e) => setVialUnit(e.target.value as 'mg' | 'mcg')}
              >
                <option value="mg">mg</option>
                <option value="mcg">mcg</option>
              </select>
            </div>
          </label>

          <label className="grid gap-1 text-sm text-slate-200">
            Recon volume (ml)
            <input
              name="recon_volume_ml"
              type="number"
              step="0.01"
              className="rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
              value={reconVolume}
              onChange={(e) => setReconVolume(e.target.value)}
            />
          </label>

          <label className="grid gap-1 text-sm text-slate-200">
            Desired dose
            <div className="flex gap-2">
              <input
                name="desired_dose"
                type="number"
                step="0.01"
                className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
                value={dose}
                onChange={(e) => setDose(e.target.value)}
              />
              <select
                name="desired_dose_unit"
                className="rounded-lg border border-slate-700 bg-slate-950/40 px-2 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={doseUnit}
                onChange={(e) => setDoseUnit(e.target.value as 'mcg' | 'mg')}
              >
                <option value="mcg">mcg</option>
                <option value="mg">mg</option>
              </select>
            </div>
          </label>

          <label className="grid gap-1 text-sm text-slate-200">
            Frequency
            <input
              name="frequency"
              className="rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="daily / 2x weekly"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
            />
          </label>

          <label className="grid gap-1 text-sm text-slate-200">
            Timing
            <input
              name="timing"
              className="rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="morning / bedtime"
              value={timing}
              onChange={(e) => setTiming(e.target.value)}
            />
          </label>
        </div>

        {calc ? (
          <div className="rounded-xl border border-slate-800 bg-slate-950/20 p-3">
            <div className="text-sm font-semibold">Dose math</div>
            <div className="mt-2 grid gap-2 text-sm text-slate-200 sm:grid-cols-2">
              <div>
                Concentration:{' '}
                <span className="font-mono">
                  {calc.concentration_mcg_per_ml.toFixed(2)} mcg/mL
                </span>
              </div>
              <div>
                Volume needed:{' '}
                <span className="font-mono">{calc.volume_needed_ml.toFixed(3)} mL</span>
              </div>
              <div className="sm:col-span-2">
                Syringe units (100u=1mL):{' '}
                <span className="font-mono">{calc.syringe_units.toFixed(1)} units</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-400">
            Fill vial amount, recon volume, and desired dose to see the syringe math.
          </div>
        )}

        <div className="grid gap-2">
          <label className="grid gap-1 text-sm text-slate-200">
            Memo
            <textarea
              name="note"
              rows={3}
              className="rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder={defaultLoading ? 'Loading default note…' : 'Optional notes for this entry'}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>

          <div className="rounded-xl border border-slate-800 bg-slate-950/20 p-3">
            <div className="text-sm font-semibold text-slate-100">Side effects (optional)</div>
            <div className="mt-2 flex flex-wrap gap-3">
              {commonSideEffects.map((se) => {
                const checked = sideEffectTags.includes(se.id)
                return (
                  <label key={se.id} className="flex items-center gap-2 text-sm text-slate-200">
                    <input
                      type="checkbox"
                      name="side_effect_tags"
                      value={se.id}
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) setSideEffectTags((prev) => [...prev, se.id])
                        else setSideEffectTags((prev) => prev.filter((x) => x !== se.id))
                      }}
                    />
                    {se.label}
                  </label>
                )
              })}
            </div>
            <label className="mt-2 grid gap-1 text-sm text-slate-200">
              Notes
              <input
                name="side_effect_note"
                className="rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. pins/needles at higher dose"
                value={sideEffectNote}
                onChange={(e) => setSideEffectNote(e.target.value)}
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                name="taken_now"
                checked={takenNow}
                onChange={(e) => setTakenNow(e.target.checked)}
              />
              Taken now
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                name="save_default_note"
                checked={saveDefault}
                onChange={(e) => setSaveDefault(e.target.checked)}
              />
              Save this memo as the default for this peptide name
            </label>
          </div>
        </div>

        <button className="w-fit rounded-lg bg-indigo-500 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-400">
          Add peptide
        </button>
      </form>
    </div>
  )
}
