'use client'

import { useState } from 'react'

async function maybeConvertHeicToJpeg(file: File): Promise<File> {
  const t = (file.type ?? '').toLowerCase()
  const name = (file.name ?? '').toLowerCase()
  const looksHeic = t.includes('heic') || t.includes('heif') || name.endsWith('.heic') || name.endsWith('.heif')
  if (!looksHeic) return file

  // Convert in-browser so iPhone photos “just work”.
  // heic2any returns a Blob (or Blob[]) depending on options.
  const mod = await import('heic2any')
  const heic2any = ((mod as unknown as { default?: unknown }).default ?? mod) as (
    opts: { blob: Blob; toType: string; quality?: number }
  ) => Promise<Blob | Blob[]>

  const out = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 })
  const blob = Array.isArray(out) ? out[0] : out
  if (!(blob instanceof Blob)) return file

  const newName = file.name?.replace(/\.(heic|heif)$/i, '.jpg') || 'meal.jpg'
  return new File([blob], newName, { type: 'image/jpeg' })
}

async function downscaleToJpeg(file: File, opts?: { maxDim?: number; targetMaxBytes?: number }) {
  const maxDim = opts?.maxDim ?? 1600
  const targetMaxBytes = opts?.targetMaxBytes ?? 3_500_000 // keep under common serverless limits

  // Skip animated GIFs.
  if ((file.type ?? '').toLowerCase() === 'image/gif') return file

  // If already small enough, do nothing.
  if (file.size <= targetMaxBytes) return file

  async function fileToImageBitmap(f: File): Promise<ImageBitmap> {
    // createImageBitmap works in modern browsers (including iOS 16+), and avoids manual <img> decoding.
    return await createImageBitmap(f)
  }

  const bmp = await fileToImageBitmap(file)
  const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height))
  const w = Math.max(1, Math.round(bmp.width * scale))
  const h = Math.max(1, Math.round(bmp.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return file
  ctx.drawImage(bmp, 0, 0, w, h)

  async function toJpeg(quality: number): Promise<Blob | null> {
    return await new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', quality))
  }

  // Try a couple qualities to get under the byte limit.
  const qualities = [0.85, 0.75, 0.65]
  for (const q of qualities) {
    const blob = await toJpeg(q)
    if (blob && blob.size <= targetMaxBytes) {
      return new File([blob], 'meal.jpg', { type: 'image/jpeg' })
    }
  }

  // Fallback: return the last attempt even if it's still large (better than original png).
  const blob = await toJpeg(0.6)
  return blob ? new File([blob], 'meal.jpg', { type: 'image/jpeg' }) : file
}

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
  portionMode,
  onPortionMode,
  onReestimate,
}: {
  onEstimate: (e: Estimate, preparedFile?: File) => void
  portionMode: 'standard' | 'conservative' | 'heavy'
  onPortionMode: (m: 'standard' | 'conservative' | 'heavy') => void
  onReestimate?: (portionMode: 'standard' | 'conservative' | 'heavy') => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function estimateFromFile(file: File, portion_mode: 'standard' | 'conservative' | 'heavy') {
    const converted = await maybeConvertHeicToJpeg(file)
    const prepared = await downscaleToJpeg(converted)
    const fd = new FormData()
    fd.append('image', prepared)
    fd.append('portion_mode', portion_mode)
    const res = await fetch('/api/food/estimate', { method: 'POST', body: fd })
    const json = await res.json().catch(() => null)
    if (!res.ok || !json?.ok) {
      throw new Error(json?.message ?? json?.error ?? `Failed to estimate macros (HTTP ${res.status})`)
    }
    onEstimate(json.estimate, prepared)
    return prepared
  }

  async function onPick(file: File) {
    setBusy(true)
    setError(null)

    try {
      await estimateFromFile(file, portionMode)
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
      <div className="flex flex-wrap items-center gap-3">
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
        <label className="inline-flex items-center gap-2 text-xs text-neutral-500">
          Portions
          <select
            className="rounded border px-2 py-1 text-xs"
            value={portionMode}
            onChange={(e) => onPortionMode(e.target.value as 'standard' | 'conservative' | 'heavy')}
          >
            <option value="standard">Standard (deli)</option>
            <option value="conservative">Conservative</option>
            <option value="heavy">Heavy</option>
          </select>
        </label>
        {onReestimate ? (
          <button
            type="button"
            className="rounded border px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-50"
            onClick={() => onReestimate(portionMode)}
          >
            Refresh
          </button>
        ) : null}
        <span className="text-xs text-neutral-500">Uses AI. You’ll confirm/edit before saving.</span>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  )
}
