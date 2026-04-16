'use client'

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type Point = {
  date: string
  calories?: number | null
  protein_g?: number | null
  carbs_g?: number | null
  fat_g?: number | null
  weight?: number | null
  systolic?: number | null
  diastolic?: number | null
  pulse?: number | null
  peptides_total_mcg?: number | null
  [k: string]: unknown
}

type PeptideSeries = { key: string; label: string; color: string }
type RollingAvgPoint = { date: string; avg: number | null }
type PeptideStart = { name: string; start: string; color: string }
type CarbsBPPoint = { date: string; carbs: number; protein: number; systolic: number }
type FastingWeightPoint = { date: string; hours: number; drop: number }

const tooltipStyle = {
  contentStyle: { background: 'rgba(2,6,23,0.92)', border: '1px solid rgba(51,65,85,0.8)', borderRadius: 12 },
  labelStyle: { color: 'rgba(226,232,240,0.9)' },
  itemStyle: { color: 'rgba(226,232,240,0.9)' },
}

const axisStyle = {
  stroke: 'rgba(226,232,240,0.65)',
  tick: { fill: 'rgba(226,232,240,0.65)', fontSize: 12 },
}

const gridStyle = { strokeDasharray: '3 3', stroke: 'rgba(148,163,184,0.25)' }

function daysSince(dateStr: string) {
  const diff = (new Date().getTime() - new Date(dateStr + 'T00:00:00').getTime()) / 86400000
  return Math.round(diff)
}

export function TrendsClient({
  points,
  peptideSeries,
  rollingAvg,
  weeklySlope,
  isStalling,
  lossZone,
  peptideStarts,
  carbsBPPoints,
  fastingWeightPoints,
  days,
}: {
  points: Point[]
  peptideSeries: PeptideSeries[]
  rollingAvg: RollingAvgPoint[]
  weeklySlope: number | null
  isStalling: boolean
  lossZone: string | null
  peptideStarts: PeptideStart[]
  carbsBPPoints: CarbsBPPoint[]
  fastingWeightPoints: FastingWeightPoint[]
  days: number
}) {
  const weightChartData = points.map((p, i) => ({
    date: p.date,
    weight: p.weight ?? null,
    avg: rollingAvg[i]?.avg ?? null,
  }))

  const zoneBadge = {
    high:  { label: '🔵 High loss (>3 lb/wk)',      cls: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
    good:  { label: '🟢 Good loss (1.5-3 lb/wk)',   cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
    slow:  { label: '🟡 Slow loss (0.5-1.5 lb/wk)', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
    stall: { label: '🔴 Stall detected (<0.5 lb/wk)', cls: 'bg-red-500/20 text-red-300 border-red-500/40' },
  }[lossZone ?? ''] ?? null

  return (
    <div className="space-y-8">

      {/* ── GRAPH 1: Weight + Rolling Average ── */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-medium text-slate-100">Weight + 7-day average (lb)</div>
          <div className="flex flex-wrap items-center gap-2">
            {weeklySlope !== null && (
              <span className="text-xs text-slate-400">
                7-day rate: <span className="font-medium text-slate-200">{weeklySlope} lb/wk</span>
              </span>
            )}
            {zoneBadge && (
              <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${zoneBadge.cls}`}>
                {zoneBadge.label}
              </span>
            )}
          </div>
        </div>

        {isStalling && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
            ⚠️ Possible stall — less than 0.5 lb lost over the past 7 days. Consider a refeed day or diet break.
          </div>
        )}

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weightChartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid {...gridStyle} />
              <XAxis dataKey="date" {...axisStyle} />
              <YAxis {...axisStyle} domain={['auto', 'auto']} />
              <Tooltip {...tooltipStyle} />
              <Legend wrapperStyle={{ color: 'rgba(226,232,240,0.75)' }} />
              <Line
                type="monotone"
                dataKey="weight"
                name="Weight (lb)"
                stroke="rgba(148,163,184,0.4)"
                strokeWidth={1}
                dot={{ r: 2, fill: 'rgba(148,163,184,0.6)' }}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="avg"
                name="7-day avg"
                stroke="#38bdf8"
                strokeWidth={2.5}
                dot={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Peptide reference table */}
        <div className="rounded-lg border border-slate-800 bg-slate-950/20 p-3">
          <div className="mb-2 text-xs font-medium text-slate-400">Peptide start dates</div>
          <div className="grid gap-1.5">
            {peptideStarts.map((p) => {
              const d = daysSince(p.start)
              const cutoff = new Date(new Date().getTime() - days * 86400000)
              const inRange = new Date(p.start + 'T00:00:00') >= cutoff
              return (
                <div key={p.name} className="flex items-center gap-3 text-xs">
                  <span
                    className="inline-block h-2 w-2 flex-shrink-0 rounded-full"
                    style={{ background: p.color }}
                  />
                  <span className="w-36 font-medium text-slate-200">{p.name}</span>
                  <span className="text-slate-400">{p.start}</span>
                  <span className="text-slate-500">({d} days ago)</span>
                  {!inRange && (
                    <span className="italic text-slate-600">outside {days}d window</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── GRAPH 2: Carbs + Protein vs Next-Day BP ── */}
      <div className="space-y-3">
        <div className="text-sm font-medium text-slate-100">
          Carbs &amp; Protein vs next-day systolic BP
        </div>
        <div className="text-xs text-slate-400">
          Each point = macros eaten on day N → systolic on day N+1.
          {carbsBPPoints.length > 0 && ` ${carbsBPPoints.length} paired days.`}
        </div>
        {carbsBPPoints.length < 5 ? (
          <p className="text-sm text-slate-400">
            Not enough paired data yet ({carbsBPPoints.length} days).
          </p>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid {...gridStyle} />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="Grams"
                  {...axisStyle}
                  label={{ value: 'grams', position: 'insideBottomRight', offset: -8, fill: 'rgba(226,232,240,0.4)', fontSize: 11 }}
                />
                <YAxis
                  type="number"
                  dataKey="systolic"
                  name="Systolic"
                  {...axisStyle}
                  domain={['auto', 'auto']}
                  label={{ value: 'systolic', angle: -90, position: 'insideLeft', fill: 'rgba(226,232,240,0.4)', fontSize: 11 }}
                />
                <Tooltip
                  {...tooltipStyle}
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const d = payload[0]?.payload
                    return (
                      <div className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-xs text-slate-200">
                        <div>{d.date}</div>
                        <div>Carbs: {d.carbs}g → next-day systolic: {d.systolic}</div>
                        <div>Protein: {d.protein}g</div>
                      </div>
                    )
                  }}
                />
                <Legend wrapperStyle={{ color: 'rgba(226,232,240,0.75)' }} />
                <Scatter
                  name="Carbs → BP"
                  data={carbsBPPoints.map(p => ({ ...p, x: p.carbs }))}
                  fill="#fbbf24"
                  opacity={0.75}
                />
                <Scatter
                  name="Protein → BP"
                  data={carbsBPPoints.map(p => ({ ...p, x: p.protein }))}
                  fill="#34d399"
                  opacity={0.75}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── GRAPH 3: Fasting Duration vs Next-Morning Weight Drop ── */}
      <div className="space-y-3">
        <div className="text-sm font-medium text-slate-100">
          Fasting duration vs next-morning weight change
        </div>
        <div className="text-xs text-slate-400">
          Each point = fast duration → weight difference next morning (positive = loss).
          {fastingWeightPoints.length > 0 && ` ${fastingWeightPoints.length} fasting days with weight data.`}
        </div>
        {fastingWeightPoints.length < 5 ? (
          <p className="text-sm text-slate-400">
            Not enough paired data yet ({fastingWeightPoints.length} days).
          </p>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid {...gridStyle} />
                <XAxis
                  type="number"
                  dataKey="hours"
                  name="Fast hours"
                  {...axisStyle}
                  label={{ value: 'hours fasted', position: 'insideBottomRight', offset: -8, fill: 'rgba(226,232,240,0.4)', fontSize: 11 }}
                />
                <YAxis
                  type="number"
                  dataKey="drop"
                  name="Weight change"
                  {...axisStyle}
                  label={{ value: 'lbs lost', angle: -90, position: 'insideLeft', fill: 'rgba(226,232,240,0.4)', fontSize: 11 }}
                />
                <ReferenceLine y={0} stroke="rgba(148,163,184,0.4)" strokeDasharray="4 4" />
                <Tooltip
                  {...tooltipStyle}
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const d = payload[0]?.payload
                    return (
                      <div className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-xs text-slate-200">
                        <div>{d.date}</div>
                        <div>{d.hours}h fast → {d.drop > 0 ? `-${d.drop}` : `+${Math.abs(d.drop)}`} lb next morning</div>
                      </div>
                    )
                  }}
                />
                <Scatter
                  name="Fasting → weight change"
                  data={fastingWeightPoints}
                  fill="#a78bfa"
                  opacity={0.75}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── Calories + Macros ── */}
      <div className="space-y-3">
        <div className="text-sm font-medium text-slate-100">Calories + Macros</div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid {...gridStyle} />
              <XAxis dataKey="date" {...axisStyle} />
              <YAxis yAxisId="cal" {...axisStyle} domain={[0, 'auto']} />
              <YAxis yAxisId="mac" orientation="right" stroke="rgba(226,232,240,0.35)" tick={{ fill: 'rgba(226,232,240,0.65)', fontSize: 12 }} domain={[0, 'auto']} />
              <Tooltip {...tooltipStyle} />
              <Legend wrapperStyle={{ color: 'rgba(226,232,240,0.75)' }} />
              <Line yAxisId="cal" type="monotone" dataKey="calories" name="Calories" stroke="#60a5fa" strokeWidth={2} dot={false} connectNulls />
              <Line yAxisId="mac" type="monotone" dataKey="protein_g" name="Protein (g)" stroke="#34d399" strokeWidth={2} dot={false} connectNulls />
              <Line yAxisId="mac" type="monotone" dataKey="carbs_g" name="Carbs (g)" stroke="#fbbf24" strokeWidth={2} dot={false} connectNulls />
              <Line yAxisId="mac" type="monotone" dataKey="fat_g" name="Fat (g)" stroke="#f472b6" strokeWidth={2} dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Blood Pressure ── */}
      <div className="space-y-3">
        <div className="text-sm font-medium text-slate-100">Blood pressure + pulse</div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid {...gridStyle} />
              <XAxis dataKey="date" {...axisStyle} />
              <YAxis {...axisStyle} domain={['auto', 'auto']} />
              <Tooltip {...tooltipStyle} />
              <Legend wrapperStyle={{ color: 'rgba(226,232,240,0.75)' }} />
              <Line type="monotone" dataKey="systolic" name="Systolic" stroke="#fb7185" strokeWidth={2} dot={false} connectNulls />
              <Line type="monotone" dataKey="diastolic" name="Diastolic" stroke="#f97316" strokeWidth={2} dot={false} connectNulls />
              <Line type="monotone" dataKey="pulse" name="Pulse" stroke="#34d399" strokeWidth={2} dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Peptides ── */}
      {peptideSeries.length > 0 && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-slate-100">Peptides taken (mcg)</div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid {...gridStyle} />
                <XAxis dataKey="date" {...axisStyle} />
                <YAxis {...axisStyle} domain={[0, 'auto']} />
                <Tooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ color: 'rgba(226,232,240,0.75)' }} />
                {peptideSeries.map((s) => (
                  <Line
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.label}
                    stroke={s.color}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <p className="text-xs text-slate-500">
        BP/pulse are daily averages. Weight shown as raw entry + 7-day rolling average.
        Correlation charts use next-day lag for BP response.
      </p>
    </div>
  )
}
