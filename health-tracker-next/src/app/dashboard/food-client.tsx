'use client'

import { useMemo, useState } from 'react'
import { FoodPhotoUploader } from './food-photo-uploader'

type Estimate = {
  name: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  confidence?: number
  notes?: string
}

export function FoodClient({
  selectedDate,
}: {
  selectedDate: string
}) {
  const [estimate, setEstimate] = useState<Estimate | null>(null)

  const defaults = useMemo(() => {
    if (!estimate) return null
    return {
      name: estimate.name,
      calories: String(Math.round(estimate.calories)),
      protein_g: String(Number(estimate.protein_g ?? 0)),
      carbs_g: String(Number(estimate.carbs_g ?? 0)),
      fat_g: String(Number(estimate.fat_g ?? 0)),
    }
  }, [estimate])

  return (
    <div className="space-y-3">
      <FoodPhotoUploader onEstimate={setEstimate} />

      {estimate ? (
        <div className="rounded-lg border bg-white p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">AI estimate</div>
              <div className="text-sm text-neutral-700">
                <div className="font-medium">{estimate.name}</div>
                <div>
                  {Math.round(estimate.calories)} cal • P {estimate.protein_g} / C{' '}
                  {estimate.carbs_g} / F {estimate.fat_g}
                </div>
                {estimate.confidence != null ? (
                  <div className="text-xs text-neutral-500">
                    Confidence: {Math.round(estimate.confidence * 100)}%
                  </div>
                ) : null}
                {estimate.notes ? (
                  <div className="mt-1 text-xs text-neutral-500">{estimate.notes}</div>
                ) : null}
              </div>
            </div>
            <button
              className="rounded border px-2 py-1 text-xs hover:bg-neutral-50"
              onClick={() => setEstimate(null)}
              type="button"
            >
              Clear
            </button>
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            Next: click “Use estimate” to autofill the form (coming immediately).
          </p>
        </div>
      ) : null}

      {/* Hidden inputs helper for autofill via browser autocomplete isn't reliable; we'll use a dedicated form component next. */}
      {defaults ? (
        <div className="hidden" aria-hidden>
          <input defaultValue={selectedDate} />
          <input defaultValue={defaults.name} />
          <input defaultValue={defaults.calories} />
          <input defaultValue={defaults.protein_g} />
          <input defaultValue={defaults.carbs_g} />
          <input defaultValue={defaults.fat_g} />
        </div>
      ) : null}
    </div>
  )
}
