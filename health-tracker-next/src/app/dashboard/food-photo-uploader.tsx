'use client'

import { useState } from 'react'

type Estimate = {
  name: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  confidence?: number
  notes?: string
}

export function FoodPhotoUploader({
  onEstimate,
}: {
  onEstimate: (e: Estimate) => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onPick(file: File) {
    setBusy(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('image', file)
      const res = await fetch('/api/food/estimate', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok || !json?.ok) {
        throw new Error(json?.message ?? json?.error ?? 'Failed to estimate macros')
      }
      onEstimate(json.estimate)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded border px-3 py-2 text-sm hover:bg-neutral-50">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void onPick(f)
            }}
          />
          {busy ? 'Estimating…' : 'Meal from photo'}
        </label>
        <span className="text-xs text-neutral-500">
          Uses AI. You’ll confirm/edit before saving.
        </span>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  )
}
