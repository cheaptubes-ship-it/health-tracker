'use client'

import Link from 'next/link'
import type { SummaryRange, SummaryStats } from './summary-types'

function mlToOz(ml: number) {
  return ml / 29.5735
}

export function SummaryClient({
  stats,
  selectedDate,
  unitPref,
  lastWeightAsOf,
}: {
  stats: SummaryStats
  selectedDate: string
  unitPref: 'oz' | 'ml'
  lastWeightAsOf: number | null
}) {
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
          <div className="text-sm font-semibold">Weight</div>
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
      </div>
    </div>
  )
}
