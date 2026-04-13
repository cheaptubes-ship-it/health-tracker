'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { SummaryRange, SummaryStats } from './summary-types'

function mlToOz(ml: number) {
  return ml / 29.5735
}

export function SummaryClient({
  stats,
  selectedDate,
  unitPref,
  lastWeightAsOf,
  timeZone,
}: {
  stats: SummaryStats
  selectedDate: string
  unitPref: 'oz' | 'ml'
  lastWeightAsOf: number | null
  timeZone: string
}) {
  const [insight, setInsight] = useState<unknown | null>(null)
  const [insightBusy, setInsightBusy] = useState(false)
  const [insightErr, setInsightErr] = useState<string | null>(null)

  const shouldAutoGenerate = useMemo(() => {
    // Only auto-generate for day view, when weight dropped vs prev.
    if (stats.range !== 'day') return false
    if (stats.weight.delta == null || !(stats.weight.delta < 0)) return false

    // Morning in user's timezone (rough).
    const parts = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', hour12: false }).formatToParts(new Date())
    const h = Number(parts.find((p) => p.type === 'hour')?.value ?? NaN)
    if (!Number.isFinite(h)) return false
    return h >= 5 && h <= 11
  }, [stats.range, stats.weight.delta, timeZone])

  async function generateInsight() {
    setInsightBusy(true)
    setInsightErr(null)
    try {
      const cacheKey = `weightInsight:${selectedDate}`
      const cached = typeof window !== 'undefined' ? window.localStorage.getItem(cacheKey) : null
      if (cached) {
        setInsight(JSON.parse(cached))
        return
      }

      const res = await fetch('/api/insights/weight-loss', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ date: selectedDate }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.ok) throw new Error(json?.error ?? 'Failed to generate insight')
      setInsight(json.insight)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(cacheKey, JSON.stringify(json.insight))
      }
    } catch (e) {
      setInsightErr(e instanceof Error ? e.message : String(e))
    } finally {
      setInsightBusy(false)
    }
  }

  useEffect(() => {
    if (!shouldAutoGenerate) return
    void generateInsight()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldAutoGenerate, selectedDate])

  const ranges: Array<{ id: SummaryRange; label: string }> = [
    { id: 'day', label: 'Day' },
    { id: 'week', label: 'Week' },
    { id: 'month', label: 'Month' },
    { id: 'year', label: 'Year' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Summary</h2>
          <p className="text-sm text-slate-300">
            {stats.start} → {stats.end}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 rounded-xl border border-slate-800 bg-slate-900/20 p-2">
          {ranges.map((r) => (
            <Link
              key={r.id}
              href={`/dashboard?tab=summary&range=${r.id}&date=${selectedDate}`}
              className={
                `rounded-lg px-3 py-2 text-sm ` +
                (stats.range === r.id
                  ? 'bg-indigo-500 text-white'
                  : 'border border-slate-700 bg-slate-950/20 text-slate-100 hover:bg-slate-900/40')
              }
            >
              {r.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-950/20 p-4">
          <div className="text-sm font-semibold">
            Food (totals)
            {stats.fasting_active ? <span className="ml-2 text-xs text-slate-400">(fasting)</span> : null}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <div>
              <div className="text-xs text-slate-400">Calories</div>
              <div className="text-lg font-semibold">{stats.calories}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Macros</div>
              <div className="text-sm text-slate-200">
                P {Math.round(stats.protein_g)} / C {Math.round(stats.carbs_g)} / F {Math.round(stats.fat_g)}
              </div>
              {stats.prev_day ? (
                <div className="mt-1 text-xs text-slate-400">
                  Yesterday: {Math.round(stats.prev_day.calories)} cal • P {Math.round(stats.prev_day.protein_g)} / C {Math.round(stats.prev_day.carbs_g)} / F {Math.round(stats.prev_day.fat_g)}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/20 p-4">
          <div className="text-sm font-semibold">Hydration (totals)</div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <div>
              <div className="text-xs text-slate-400">Water</div>
              <div className="text-lg font-semibold">
                {unitPref === 'oz'
                  ? `${mlToOz(stats.water_ml).toFixed(1)} oz`
                  : `${Math.round(stats.water_ml)} ml`}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Electrolytes</div>
              <div className="text-sm text-slate-200">
                Na {Math.round(stats.sodium_mg)} / K {Math.round(stats.potassium_mg)} / Mg {Math.round(stats.magnesium_mg)} (mg)
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/20 p-4">
          <div className="text-sm font-semibold">Steps</div>
          <div className="mt-2 text-sm text-slate-200">
            {stats.steps.today != null ? (
              <>
                <div className="text-xs text-slate-400">Today</div>
                <div className="text-lg font-semibold">{Math.round(stats.steps.today).toLocaleString()}</div>
              </>
            ) : (
              <div className="text-sm text-slate-300">No steps yet today.</div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/20 p-4">
          <div className="text-sm font-semibold">Vitals (avg)</div>
          <div className="mt-2 text-sm text-slate-200">
            {stats.vitals.n ? (
              <>
                <div className="text-lg font-semibold">
                  {stats.vitals.systolic_avg ?? '—'}/{stats.vitals.diastolic_avg ?? '—'}
                </div>
                <div className="text-xs text-slate-400">Pulse {stats.vitals.pulse_avg ?? '—'} • n={stats.vitals.n}</div>
              </>
            ) : (
              <div className="text-sm text-slate-300">No vitals in range.</div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/20 p-4">
          <div className="flex items-baseline justify-between gap-3">
            <div className="text-sm font-semibold">Weight</div>
            {stats.range === 'day' ? (
              <button
                type="button"
                className="rounded border border-slate-700 bg-slate-950/20 px-2 py-1 text-xs text-slate-200 hover:bg-slate-900/40"
                onClick={() => void generateInsight()}
                disabled={insightBusy}
              >
                {insightBusy ? 'Thinking…' : 'AI'}
              </button>
            ) : null}
          </div>
          <div className="mt-2 text-sm text-slate-200">
            {stats.weight.first != null || stats.weight.last != null ? (
              <>
                <div className="text-xs text-slate-400">
                  {stats.weight.first != null ? `Start: ${stats.weight.first} lb` : 'Start: —'}
                </div>
                <div className="text-xs text-slate-400">
                  {stats.weight.last != null ? `End: ${stats.weight.last} lb` : 'End: —'}
                </div>
                <div className="text-lg font-semibold">
                  Δ {stats.weight.delta != null ? `${stats.weight.delta > 0 ? '+' : ''}${stats.weight.delta.toFixed(1)} lb` : '—'}
                </div>
                {stats.range === 'day' ? (
                  <div className="text-xs text-slate-400">
                    vs prev: {stats.weight.prev != null ? `${stats.weight.prev} lb` : '—'}
                  </div>
                ) : null}
              </>
            ) : lastWeightAsOf != null ? (
              <>
                <div className="text-xs text-slate-400">No weight logged in range.</div>
                <div className="text-lg font-semibold">Last known: {lastWeightAsOf} lb</div>
                <div className="text-xs text-slate-400">As of {selectedDate}</div>
              </>
            ) : (
              <div className="text-sm text-slate-300">No weight in range.</div>
            )}

            {insightErr ? <div className="mt-2 text-xs text-red-400">{insightErr}</div> : null}
            {insight ? (
              <div className="mt-2 rounded-lg border border-slate-800 bg-slate-950/30 p-2 text-xs text-slate-200">
                {typeof (insight as any)?.summary === 'string' ? (
                  <div>{String((insight as any).summary)}</div>
                ) : (
                  <div className="space-y-1">
                    {(insight as any)?.headline ? <div className="font-semibold">{String((insight as any).headline)}</div> : null}
                    {Array.isArray((insight as any)?.what_helped) ? (
                      <div>
                        <div className="text-slate-400">What likely helped</div>
                        <ul className="list-disc pl-5">
                          {((insight as any).what_helped as any[]).slice(0, 4).map((x: unknown, i: number) => (
                            <li key={i}>{String(x)}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {Array.isArray((insight as any)?.keep_doing) ? (
                      <div>
                        <div className="text-slate-400">Keep doing</div>
                        <ul className="list-disc pl-5">
                          {((insight as any).keep_doing as any[]).slice(0, 4).map((x: unknown, i: number) => (
                            <li key={i}>{String(x)}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/20 p-4">
          <div className="text-sm font-semibold">Peptides taken</div>
          <div className="mt-2 text-lg font-semibold">
            {stats.peptides_taken_mcg >= 1000
              ? `${(stats.peptides_taken_mcg / 1000).toFixed(2)} mg`
              : `${Math.round(stats.peptides_taken_mcg)} mcg`}
          </div>
          <div className="mt-1 text-xs text-slate-400">Total in range</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/20 p-4">
          <div className="text-sm font-semibold">Sleep</div>
          <div className="mt-2 text-sm text-slate-200">
            {stats.sleep.nights ? (
              <>
                <div className="text-xs text-slate-400">Last night</div>
                <div className="text-lg font-semibold">
                  {stats.sleep.last_duration_min != null
                    ? `${Math.floor(stats.sleep.last_duration_min / 60)}h ${stats.sleep.last_duration_min % 60}m`
                    : '—'}
                </div>
                <div className="text-xs text-slate-400">
                  Quality {stats.sleep.last_quality ?? '—'} • Avg {stats.sleep.avg_duration_min != null
                    ? `${Math.floor(stats.sleep.avg_duration_min / 60)}h ${stats.sleep.avg_duration_min % 60}m`
                    : '—'} • nights={stats.sleep.nights}
                </div>
              </>
            ) : (
              <div className="text-sm text-slate-300">No sleep in range.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
