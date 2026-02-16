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

    // Client-side guard: iPhone photos are often HEIC/HEIF, which we don't convert yet.
    const t = (file.type ?? '').toLowerCase()
    if (t.includes('heic') || t.includes('heif')) {
      setBusy(false)
      setError('That photo is HEIC/HEIF (common on iPhone). Please convert/share as JPG or PNG and try again.')
      return
    }

    try {
      const fd = new FormData()
      fd.append('image', file)
      const res = await fetch('/api/food/estimate', { method: 'POST', body: fd })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.ok) {
        throw new Error(json?.message ?? json?.error ?? `Failed to estimate macros (HTTP ${res.status})`)
      }
      onEstimate(json.estimate)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      // Safari sometimes throws this for fetch failures / unsupported file handling.
      setError(
        msg === 'The string did not match the expected pattern.'
          ? 'Upload failed. If you’re on iPhone, try sharing the photo as JPG/PNG (not HEIC) and retry.'
          : msg
      )
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
