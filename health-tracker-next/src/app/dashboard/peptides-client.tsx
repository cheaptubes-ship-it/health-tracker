'use client'

import { useMemo, useState } from 'react'
import { calcPeptide } from './peptides-utils'

type AddPeptideAction = (formData: FormData) => Promise<void>

export function PeptidesClient({
  selectedDate,
  addPeptideAction,
}: {
  selectedDate: string
  addPeptideAction: AddPeptideAction
}) {
  const [name, setName] = useState('')
  const [vialAmount, setVialAmount] = useState('')
  const [vialUnit, setVialUnit] = useState<'mg' | 'mcg'>('mg')
  const [reconVolume, setReconVolume] = useState('')
  const [dose, setDose] = useState('')
  const [doseUnit, setDoseUnit] = useState<'mcg' | 'mg'>('mcg')
  const [frequency, setFrequency] = useState('')
  const [timing, setTiming] = useState('')

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
        className="grid gap-3 rounded-lg border bg-neutral-50 p-4"
      >
        <input type="hidden" name="entry_date" value={selectedDate} />

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            Name
            <input
              name="name"
              className="rounded border px-3 py-2"
              placeholder="e.g. BPC-157"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <label className="grid gap-1 text-sm">
            Vial amount
            <div className="flex gap-2">
              <input
                name="vial_amount"
                type="number"
                step="0.01"
                className="w-full rounded border px-3 py-2"
                required
                value={vialAmount}
                onChange={(e) => setVialAmount(e.target.value)}
              />
              <select
                name="vial_unit"
                className="rounded border px-2 py-2 text-sm"
                value={vialUnit}
                onChange={(e) => setVialUnit(e.target.value as 'mg' | 'mcg')}
              >
                <option value="mg">mg</option>
                <option value="mcg">mcg</option>
              </select>
            </div>
          </label>

          <label className="grid gap-1 text-sm">
            Recon volume (ml)
            <input
              name="recon_volume_ml"
              type="number"
              step="0.01"
              className="rounded border px-3 py-2"
              required
              value={reconVolume}
              onChange={(e) => setReconVolume(e.target.value)}
            />
          </label>

          <label className="grid gap-1 text-sm">
            Desired dose
            <div className="flex gap-2">
              <input
                name="desired_dose"
                type="number"
                step="0.01"
                className="w-full rounded border px-3 py-2"
                required
                value={dose}
                onChange={(e) => setDose(e.target.value)}
              />
              <select
                name="desired_dose_unit"
                className="rounded border px-2 py-2 text-sm"
                value={doseUnit}
                onChange={(e) => setDoseUnit(e.target.value as 'mcg' | 'mg')}
              >
                <option value="mcg">mcg</option>
                <option value="mg">mg</option>
              </select>
            </div>
          </label>

          <label className="grid gap-1 text-sm">
            Frequency
            <input
              name="frequency"
              className="rounded border px-3 py-2"
              placeholder="daily / 2x weekly"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
            />
          </label>

          <label className="grid gap-1 text-sm">
            Timing
            <input
              name="timing"
              className="rounded border px-3 py-2"
              placeholder="morning / bedtime"
              value={timing}
              onChange={(e) => setTiming(e.target.value)}
            />
          </label>
        </div>

        {calc ? (
          <div className="rounded-lg border bg-white p-3">
            <div className="text-sm font-semibold">Dose math</div>
            <div className="mt-2 grid gap-2 text-sm text-neutral-700 sm:grid-cols-2">
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
          <div className="text-xs text-neutral-500">
            Fill vial amount, recon volume, and desired dose to see the syringe math.
          </div>
        )}

        <button className="w-fit rounded bg-black px-3 py-2 text-sm text-white">
          Add peptide
        </button>
      </form>
    </div>
  )
}
