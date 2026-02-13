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

type AddFoodAction = (formData: FormData) => Promise<void>
type SaveFavoriteAction = (formData: FormData) => Promise<void>

export function FoodClient({
  selectedDate,
  addFoodAction,
  saveFavoriteAction,
}: {
  selectedDate: string
  addFoodAction: AddFoodAction
  saveFavoriteAction: SaveFavoriteAction
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
      source: 'ai_photo',
    }
  }, [estimate])

  const [name, setName] = useState('')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [source, setSource] = useState<'manual' | 'ai_photo' | 'db'>('manual')

  const [q, setQ] = useState('')
  const [searchBusy, setSearchBusy] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [results, setResults] = useState<
    Array<{
      name: string
      serving: string | null
      per100g: {
        calories: number | null
        protein_g: number | null
        carbs_g: number | null
        fat_g: number | null
      }
    }>
  >([])

  async function search() {
    const query = q.trim()
    if (!query) return
    setSearchBusy(true)
    setSearchError(null)
    try {
      const res = await fetch(`/api/food/search?q=${encodeURIComponent(query)}`)
      const json = await res.json()
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error ?? 'Search failed')
      }
      setResults(Array.isArray(json.items) ? json.items : [])
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : String(e))
    } finally {
      setSearchBusy(false)
    }
  }

  const [dbBase, setDbBase] = useState<{
    per100g: { calories: number; protein_g: number; carbs_g: number; fat_g: number }
    serving: string | null
  } | null>(null)
  const [grams, setGrams] = useState('100')

  function parseServingGrams(serving: string | null) {
    if (!serving) return null
    // crude parse: look for "170 g" or "170g"
    const m = serving.toLowerCase().match(/(\d+(?:\.\d+)?)\s*g\b/)
    if (!m) return null
    const num = Number(m[1])
    return Number.isFinite(num) ? num : null
  }

  function applyDbItem(item: {
    name: string
    serving: string | null
    per100g: { calories: number | null; protein_g: number | null; carbs_g: number | null; fat_g: number | null }
  }) {
    setName(item.name)

    const base = {
      calories: Number(item.per100g.calories ?? 0),
      protein_g: Number(item.per100g.protein_g ?? 0),
      carbs_g: Number(item.per100g.carbs_g ?? 0),
      fat_g: Number(item.per100g.fat_g ?? 0),
    }

    setDbBase({ per100g: base, serving: item.serving })

    const g = parseServingGrams(item.serving) ?? 100
    setGrams(String(g))

    const mult = g / 100
    setCalories(String(Math.round(base.calories * mult)))
    setProtein(String(Number((base.protein_g * mult).toFixed(1))))
    setCarbs(String(Number((base.carbs_g * mult).toFixed(1))))
    setFat(String(Number((base.fat_g * mult).toFixed(1))))
    setSource('db')
  }

  function useEstimate() {
    if (!defaults) return
    setName(defaults.name)
    setCalories(defaults.calories)
    setProtein(defaults.protein_g)
    setCarbs(defaults.carbs_g)
    setFat(defaults.fat_g)
    setSource('ai_photo')
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-4 rounded-lg border bg-white p-4">
        <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="grid gap-1 text-sm">
            Search foods (OpenFoodFacts)
            <input
              className="rounded border px-3 py-2"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="e.g. greek yogurt"
            />
          </label>
          <button
            type="button"
            onClick={search}
            disabled={searchBusy}
            className="h-10 rounded border px-3 text-sm hover:bg-neutral-50 disabled:opacity-50"
          >
            {searchBusy ? 'Searching…' : 'Search'}
          </button>
        </div>
        {searchError ? <p className="text-sm text-red-600">{searchError}</p> : null}
        {results.length ? (
          <ul className="grid gap-2">
            {results.map((r, idx) => (
              <li key={idx} className="rounded border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">{r.name}</div>
                    <div className="text-xs text-neutral-600">
                      Per 100g: {r.per100g.calories ?? '—'} cal • P {r.per100g.protein_g ?? '—'} / C{' '}
                      {r.per100g.carbs_g ?? '—'} / F {r.per100g.fat_g ?? '—'}
                    </div>
                    {r.serving ? (
                      <div className="text-xs text-neutral-500">Serving: {r.serving}</div>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded bg-black px-3 py-2 text-sm text-white"
                      onClick={() => applyDbItem(r)}
                    >
                      Use
                    </button>
                    <form action={saveFavoriteAction}>
                      <input type="hidden" name="name" value={r.name} />
                      <input type="hidden" name="calories" value={r.per100g.calories ?? ''} />
                      <input type="hidden" name="protein_g" value={r.per100g.protein_g ?? ''} />
                      <input type="hidden" name="carbs_g" value={r.per100g.carbs_g ?? ''} />
                      <input type="hidden" name="fat_g" value={r.per100g.fat_g ?? ''} />
                      <input type="hidden" name="serving" value={r.serving ?? ''} />
                      <button
                        className="rounded border px-3 py-2 text-sm hover:bg-neutral-50"
                        type="submit"
                        disabled={r.per100g.calories == null}
                        title={r.per100g.calories == null ? 'Missing calories data' : ''}
                      >
                        Favorite
                      </button>
                    </form>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

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
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="rounded bg-black px-3 py-2 text-sm text-white"
              onClick={useEstimate}
            >
              Use estimate
            </button>
            <button
              className="rounded border px-3 py-2 text-sm hover:bg-neutral-50"
              onClick={() => setEstimate(null)}
              type="button"
            >
              Discard
            </button>
          </div>
        </div>
      ) : null}

      <form
        action={addFoodAction}
        className="grid gap-3 rounded-lg border bg-neutral-50 p-4"
      >
        <input type="hidden" name="entry_date" value={selectedDate} />
        <input type="hidden" name="source" value={source} />

        {source === 'db' ? (
          <div className="rounded border bg-white p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Serving math</div>
                <div className="text-xs text-neutral-600">
                  OpenFoodFacts macros are usually per 100g. Pick grams to scale.
                  {dbBase?.serving ? ` Serving: ${dbBase.serving}` : ''}
                </div>
              </div>
              <label className="grid gap-1 text-sm">
                Grams
                <input
                  className="w-28 rounded border px-3 py-2"
                  type="number"
                  step="1"
                  min={0}
                  value={grams}
                  onChange={(e) => {
                    const g = e.target.value
                    setGrams(g)
                    const num = Number(g)
                    if (!dbBase || !Number.isFinite(num)) return
                    const mult = num / 100
                    setCalories(String(Math.round(dbBase.per100g.calories * mult)))
                    setProtein(String(Number((dbBase.per100g.protein_g * mult).toFixed(1))))
                    setCarbs(String(Number((dbBase.per100g.carbs_g * mult).toFixed(1))))
                    setFat(String(Number((dbBase.per100g.fat_g * mult).toFixed(1))))
                  }}
                />
              </label>
            </div>
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            Name
            <input
              name="name"
              className="rounded border px-3 py-2"
              placeholder="e.g. Chicken burrito"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setSource('manual')
              }}
            />
          </label>
          <label className="grid gap-1 text-sm">
            Calories
            <input
              name="calories"
              type="number"
              step="1"
              className="rounded border px-3 py-2"
              required
              value={calories}
              onChange={(e) => {
                setCalories(e.target.value)
                setSource('manual')
              }}
            />
          </label>
          <label className="grid gap-1 text-sm">
            Protein (g)
            <input
              name="protein_g"
              type="number"
              step="0.1"
              className="rounded border px-3 py-2"
              value={protein}
              onChange={(e) => {
                setProtein(e.target.value)
                setSource('manual')
              }}
            />
          </label>
          <label className="grid gap-1 text-sm">
            Carbs (g)
            <input
              name="carbs_g"
              type="number"
              step="0.1"
              className="rounded border px-3 py-2"
              value={carbs}
              onChange={(e) => {
                setCarbs(e.target.value)
                setSource('manual')
              }}
            />
          </label>
          <label className="grid gap-1 text-sm">
            Fat (g)
            <input
              name="fat_g"
              type="number"
              step="0.1"
              className="rounded border px-3 py-2"
              value={fat}
              onChange={(e) => {
                setFat(e.target.value)
                setSource('manual')
              }}
            />
          </label>
        </div>
        <button className="w-fit rounded bg-black px-3 py-2 text-sm text-white">
          Add food
        </button>
        <p className="text-xs text-neutral-500">
          Source: <span className="font-mono">{source}</span>
        </p>
      </form>
    </div>
  )
}
