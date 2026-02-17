'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
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
  const router = useRouter()
  const [estimate, setEstimate] = useState<Estimate | null>(null)
  const [aiOilTbsp, setAiOilTbsp] = useState<0 | 1 | 2 | 3>(0)
  const [addBusy, setAddBusy] = useState(false)

  const adjustedEstimate = useMemo(() => {
    if (!estimate) return null
    const oilTbsp = aiOilTbsp
    const oilCal = oilTbsp * 120
    const oilFat = oilTbsp * 14
    return {
      ...estimate,
      calories: Number(estimate.calories ?? 0) + oilCal,
      fat_g: Number(estimate.fat_g ?? 0) + oilFat,
    }
  }, [estimate, aiOilTbsp])

  const defaults = useMemo(() => {
    if (!adjustedEstimate) return null
    return {
      name: adjustedEstimate.name,
      calories: String(Math.round(adjustedEstimate.calories)),
      protein_g: String(Number(adjustedEstimate.protein_g ?? 0)),
      carbs_g: String(Number(adjustedEstimate.carbs_g ?? 0)),
      fat_g: String(Number(adjustedEstimate.fat_g ?? 0)),
      source: 'ai_photo',
    }
  }, [adjustedEstimate])

  const [name, setName] = useState('')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [source, setSource] = useState<'manual' | 'ai_photo' | 'db'>('manual')
  const [note, setNote] = useState('')

  const [q, setQ] = useState('')
  const [searchBusy, setSearchBusy] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [savedFavs, setSavedFavs] = useState<Set<string>>(() => new Set())
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
      perServing?: {
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
    perServing: { calories: number; protein_g: number; carbs_g: number; fat_g: number } | null
    serving: string | null
    servingGrams: number | null
    mode: 'perServing' | 'per100g'
  } | null>(null)
  const [grams, setGrams] = useState('100')
  const [servings, setServings] = useState('1')

  function parseServingGrams(serving: string | null) {
    if (!serving) return null
    // crude parse: look for "170 g" or "170g"
    const m = serving.toLowerCase().match(/(\d+(?:\.\d+)?)\s*g\b/)
    if (!m) return null
    const num = Number(m[1])
    return Number.isFinite(num) ? num : null
  }

  function parseServingMl(serving: string | null) {
    if (!serving) return null
    const m = serving.toLowerCase().match(/(\d+(?:\.\d+)?)\s*ml\b/)
    if (!m) return null
    const num = Number(m[1])
    return Number.isFinite(num) ? num : null
  }

  function applyDbItem(item: {
    name: string
    serving: string | null
    per100g: { calories: number | null; protein_g: number | null; carbs_g: number | null; fat_g: number | null }
    perServing?: { calories: number | null; protein_g: number | null; carbs_g: number | null; fat_g: number | null }
  }) {
    setName(item.name)

    const fromServing =
      item.perServing &&
      (item.perServing.calories != null ||
        item.perServing.protein_g != null ||
        item.perServing.carbs_g != null ||
        item.perServing.fat_g != null)
        ? {
            calories: Number(item.perServing.calories ?? 0),
            protein_g: Number(item.perServing.protein_g ?? 0),
            carbs_g: Number(item.perServing.carbs_g ?? 0),
            fat_g: Number(item.perServing.fat_g ?? 0),
          }
        : null

    const per100g = {
      calories: Number(item.per100g.calories ?? 0),
      protein_g: Number(item.per100g.protein_g ?? 0),
      carbs_g: Number(item.per100g.carbs_g ?? 0),
      fat_g: Number(item.per100g.fat_g ?? 0),
    }

    const servingGrams = parseServingGrams(item.serving) ?? parseServingMl(item.serving) ?? null

    if (fromServing) {
      setDbBase({
        per100g,
        perServing: fromServing,
        serving: item.serving,
        servingGrams,
        mode: 'perServing',
      })
      setServings('1')
      if (servingGrams != null) setGrams(String(servingGrams))

      // Per-serving (good for packaged items) — allow scaling by servings.
      setCalories(String(Math.round(fromServing.calories)))
      setProtein(String(Number(fromServing.protein_g.toFixed(1))))
      setCarbs(String(Number(fromServing.carbs_g.toFixed(1))))
      setFat(String(Number(fromServing.fat_g.toFixed(1))))
      setSource('db')
      setNotice('Using per-serving macros (adjust servings/grams)')
      return
    }

    setDbBase({ per100g, perServing: null, serving: item.serving, servingGrams, mode: 'per100g' })
    setServings('1')

    // Default: per-100g scaled by serving grams
    const g = parseServingGrams(item.serving) ?? parseServingMl(item.serving) ?? 100
    setGrams(String(g))

    const mult = g / 100
    setCalories(String(Math.round(per100g.calories * mult)))
    setProtein(String(Number((per100g.protein_g * mult).toFixed(1))))
    setCarbs(String(Number((per100g.carbs_g * mult).toFixed(1))))
    setFat(String(Number((per100g.fat_g * mult).toFixed(1))))
    setSource('db')
    setNotice('Using per-100g macros (scaled)')
  }

  function useEstimate() {
    if (!defaults) return
    setName(defaults.name)
    setCalories(defaults.calories)
    setProtein(defaults.protein_g)
    setCarbs(defaults.carbs_g)
    setFat(defaults.fat_g)
    setSource('ai_photo')

    // Lightly help the common failure mode (hidden oil). Don't clobber existing notes.
    if (!note.trim() && aiOilTbsp > 0) {
      setNote(`Includes ~${aiOilTbsp}${aiOilTbsp === 3 ? '+' : ''} Tbsp oil/dressing`)
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-4 rounded-xl border border-slate-800 bg-slate-950/20 p-4">
        <p className="text-xs text-slate-400">
          Note: OpenFoodFacts values can be per-100g. If a serving is shown, adjust grams in the form.
        </p>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="grid gap-1 text-sm">
            Search foods (OpenFoodFacts)
            <input
              className="rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void search()
                }
              }}
              placeholder="e.g. greek yogurt"
            />
          </label>
          <button
            type="button"
            onClick={search}
            disabled={searchBusy}
            className="h-10 rounded-lg border border-slate-700 bg-slate-950/30 px-3 text-sm text-slate-100 hover:bg-slate-900 disabled:opacity-50"
          >
            {searchBusy ? 'Searching…' : 'Search'}
          </button>
        </div>
        {notice ? <p className="text-sm text-emerald-400">{notice}</p> : null}
        {searchError ? <p className="text-sm text-red-400">{searchError}</p> : null}
        {results.length ? (
          <ul className="grid gap-2">
            {results.map((r, idx) => (
              <li key={idx} className="rounded-lg border border-slate-800 bg-slate-950/10 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">{r.name}</div>
                    {r.perServing && (r.perServing.calories != null || r.perServing.protein_g != null || r.perServing.carbs_g != null || r.perServing.fat_g != null) ? (
                      <div className="text-xs text-slate-200">
                        Per serving: {r.perServing.calories ?? '—'} cal • P {r.perServing.protein_g ?? '—'} / C{' '}
                        {r.perServing.carbs_g ?? '—'} / F {r.perServing.fat_g ?? '—'}
                      </div>
                    ) : null}
                    <div className="text-xs text-slate-300">
                      Per 100g: {r.per100g.calories ?? '—'} cal • P {r.per100g.protein_g ?? '—'} / C{' '}
                      {r.per100g.carbs_g ?? '—'} / F {r.per100g.fat_g ?? '—'}
                    </div>
                    {r.serving ? (
  <div className="text-xs text-slate-400">
    {r.serving.toLowerCase().includes('bottle') ? 'Bottle' : 'Serving'}: {r.serving}
  </div>
) : null}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded-lg bg-indigo-500 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-400"
                      onClick={() => applyDbItem(r)}
                    >
                      Use
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-slate-700 bg-slate-950/30 px-3 py-2 text-sm text-slate-100 hover:bg-slate-900/50 disabled:opacity-50"
                      disabled={
                        savedFavs.has(r.name) ||
                        (r.per100g.calories == null &&
                          r.perServing?.calories == null &&
                          r.per100g.protein_g == null &&
                          r.per100g.carbs_g == null &&
                          r.per100g.fat_g == null &&
                          r.perServing?.protein_g == null &&
                          r.perServing?.carbs_g == null &&
                          r.perServing?.fat_g == null)
                      }
                      title={savedFavs.has(r.name) ? 'Saved' : ''}
                      onClick={async () => {
                        try {
                          setSearchError(null)
                          setNotice(null)
                          const best =
                            r.perServing && (r.perServing.calories != null || r.perServing.protein_g != null)
                              ? r.perServing
                              : r.per100g
                          const res = await fetch('/api/favorites', {
                            method: 'POST',
                            headers: { 'content-type': 'application/json' },
                            body: JSON.stringify({
                              name: r.name,
                              calories: best.calories,
                              protein_g: best.protein_g,
                              carbs_g: best.carbs_g,
                              fat_g: best.fat_g,
                              serving: r.serving,
                            }),
                          })
                          const json = await res.json().catch(() => null)
                          if (!res.ok || !json?.ok) throw new Error(json?.error ?? 'Failed to save favorite')
                          setSavedFavs((prev) => new Set(prev).add(r.name))
                          setNotice('★ Saved to favorites')
                          router.refresh()
                        } catch (e) {
                          setSearchError(e instanceof Error ? e.message : String(e))
                        }
                      }}
                    >
                      {savedFavs.has(r.name) ? '★ Saved' : '★ Favorite'}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <FoodPhotoUploader
        onEstimate={(e) => {
          setEstimate(e)
          setAiOilTbsp(0)
        }}
      />

      {estimate && adjustedEstimate ? (
        <div className="rounded-xl border border-slate-800 bg-slate-950/20 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">AI estimate</div>
              <div className="text-sm text-slate-200">
                <div className="font-medium">{adjustedEstimate.name}</div>
                <div>
                  {Math.round(adjustedEstimate.calories)} cal • P {adjustedEstimate.protein_g} / C{' '}
                  {adjustedEstimate.carbs_g} / F {adjustedEstimate.fat_g}
                </div>

                <div className="mt-2">
                  <label className="grid gap-1 text-xs text-slate-300">
                    Added oil/dressing (common photo underestimate)
                    <select
                      className="w-fit rounded-lg border border-slate-700 bg-slate-950/40 px-2 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={aiOilTbsp}
                      onChange={(e) => setAiOilTbsp(Number(e.target.value) as 0 | 1 | 2 | 3)}
                    >
                      <option value={0}>Unknown / none</option>
                      <option value={1}>~1 Tbsp</option>
                      <option value={2}>~2 Tbsp</option>
                      <option value={3}>~2+ Tbsp</option>
                    </select>
                  </label>
                  {aiOilTbsp > 0 ? (
                    <div className="mt-1 text-xs text-slate-400">
                      Adds ~{aiOilTbsp * 120} cal and ~{aiOilTbsp * 14}g fat.
                    </div>
                  ) : null}
                </div>

                {estimate.confidence != null ? (
                  <div className="mt-2 text-xs text-slate-400">
                    Confidence: {Math.round(estimate.confidence * 100)}%
                  </div>
                ) : null}
                {estimate.notes ? (
                  <div className="mt-1 text-xs text-slate-400">{estimate.notes}</div>
                ) : null}
              </div>
            </div>
            <button
              className="rounded-lg border border-slate-700 bg-slate-950/30 px-2 py-1 text-xs text-slate-100 hover:bg-slate-900/50"
              onClick={() => setEstimate(null)}
              type="button"
            >
              Clear
            </button>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="rounded-lg bg-indigo-500 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-400"
              onClick={useEstimate}
            >
              Use estimate
            </button>
            <button
              className="rounded-lg border border-slate-700 bg-slate-950/30 px-3 py-2 text-sm text-slate-100 hover:bg-slate-900/50"
              onClick={() => setEstimate(null)}
              type="button"
            >
              Discard
            </button>
          </div>
        </div>
      ) : null}

      <form
        onSubmit={async (e) => {
          e.preventDefault()
          if (addBusy) return
          setAddBusy(true)
          try {
            const res = await fetch('/api/food/entry', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                entry_date: selectedDate,
                source,
                name,
                calories,
                protein_g: protein,
                carbs_g: carbs,
                fat_g: fat,
                note,
              }),
            })
            const json = await res.json().catch(() => null)
            if (!res.ok || !json?.ok) throw new Error(json?.error ?? 'Failed to add food')

            // Keep the values in place (less "glitchy"), but clear the AI card.
            setEstimate(null)
            setNotice('Added')
            router.refresh()
          } catch (err) {
            setSearchError(err instanceof Error ? err.message : String(err))
          } finally {
            setAddBusy(false)
          }
        }}
        className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950/20 p-4"
      >
        <input type="hidden" name="entry_date" value={selectedDate} />
        <input type="hidden" name="source" value={source} />

        {source === 'db' ? (
          <div className="rounded-lg border border-slate-800 bg-slate-950/20 p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">
                  {dbBase?.mode === 'perServing' ? 'Bottle macros' : 'Serving math'}
                </div>
                <div className="text-xs text-slate-300">
                  {dbBase?.mode === 'perServing'
                    ? 'Using per-bottle (per-serving) values from OpenFoodFacts.'
                    : 'OpenFoodFacts macros are usually per 100g. Pick grams to scale.'}
                  {dbBase?.serving ? ` ${dbBase.serving}` : ''}
                </div>
              </div>
              {dbBase?.mode === 'per100g' ? (
                <label className="grid gap-1 text-sm text-slate-200">
                  Grams
                  <input
                    className="w-28 rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              ) : dbBase?.mode === 'perServing' ? (
                <div className="flex flex-wrap items-end gap-3">
                  <label className="grid gap-1 text-sm text-slate-200">
                    Servings
                    <input
                      className="w-24 rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      type="number"
                      step="0.1"
                      min={0}
                      value={servings}
                      onChange={(e) => {
                        const s = e.target.value
                        setServings(s)
                        const num = Number(s)
                        if (!dbBase?.perServing || !Number.isFinite(num)) return
                        setCalories(String(Math.round(dbBase.perServing.calories * num)))
                        setProtein(String(Number((dbBase.perServing.protein_g * num).toFixed(1))))
                        setCarbs(String(Number((dbBase.perServing.carbs_g * num).toFixed(1))))
                        setFat(String(Number((dbBase.perServing.fat_g * num).toFixed(1))))
                        if (dbBase.servingGrams != null) setGrams(String(Math.round(dbBase.servingGrams * num)))
                      }}
                    />
                  </label>

                  {dbBase.servingGrams != null ? (
                    <label className="grid gap-1 text-sm text-slate-200">
                      Grams
                      <input
                        className="w-24 rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        type="number"
                        step="1"
                        min={0}
                        value={grams}
                        onChange={(e) => {
                          const g = e.target.value
                          setGrams(g)
                          const num = Number(g)
                          if (!dbBase?.perServing || dbBase.servingGrams == null || !Number.isFinite(num)) return
                          const s = num / dbBase.servingGrams
                          setServings(String(Number(s.toFixed(2))))
                          setCalories(String(Math.round(dbBase.perServing.calories * s)))
                          setProtein(String(Number((dbBase.perServing.protein_g * s).toFixed(1))))
                          setCarbs(String(Number((dbBase.perServing.carbs_g * s).toFixed(1))))
                          setFat(String(Number((dbBase.perServing.fat_g * s).toFixed(1))))
                        }}
                      />
                    </label>
                  ) : (
                    <div className="text-xs text-slate-400">(No serving grams provided)</div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-slate-400">—</div>
              )}
            </div>
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm text-slate-200">
            Name
            <input
              name="name"
              className="rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. Chicken burrito"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setSource('manual')
              }}
            />
          </label>
          <label className="grid gap-1 text-sm text-slate-200">
            Calories
            <input
              name="calories"
              type="number"
              step="1"
              className="rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
              value={calories}
              onChange={(e) => {
                setCalories(e.target.value)
                setSource('manual')
              }}
            />
          </label>
          <label className="grid gap-1 text-sm text-slate-200">
            Protein (g)
            <input
              name="protein_g"
              type="number"
              step="0.1"
              className="rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={protein}
              onChange={(e) => {
                setProtein(e.target.value)
                setSource('manual')
              }}
            />
          </label>
          <label className="grid gap-1 text-sm text-slate-200">
            Carbs (g)
            <input
              name="carbs_g"
              type="number"
              step="0.1"
              className="rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={carbs}
              onChange={(e) => {
                setCarbs(e.target.value)
                setSource('manual')
              }}
            />
          </label>
          <label className="grid gap-1 text-sm text-slate-200">
            Fat (g)
            <input
              name="fat_g"
              type="number"
              step="0.1"
              className="rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={fat}
              onChange={(e) => {
                setFat(e.target.value)
                setSource('manual')
              }}
            />
          </label>

          <label className="grid gap-1 text-sm text-slate-200 sm:col-span-2">
            Notes / ingredients (optional)
            <textarea
              name="note"
              rows={3}
              className="rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. 1 Dave's thin, 1 slice American cheese, homemade chicken salad, pickles"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
        </div>
        <button
          disabled={addBusy}
          className="w-fit rounded-lg bg-indigo-500 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
        >
          {addBusy ? 'Adding…' : 'Add food'}
        </button>
        <p className="text-xs text-slate-400">
          Source: <span className="font-mono">{source}</span>
        </p>
      </form>
    </div>
  )
}
