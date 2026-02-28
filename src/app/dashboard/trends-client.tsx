'use client'

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
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
  // plus dynamic pep__* keys
  [k: string]: unknown
}

type PeptideSeries = { key: string; label: string; color: string }

export function TrendsClient({
  points,
  peptideSeries,
}: {
  points: Point[]
  peptideSeries: PeptideSeries[]
}) {
  return (
    <div className="space-y-6">
      <div className="h-80">
        <div className="mb-2 text-sm font-medium text-slate-100">Calories + Macros</div>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
            <XAxis dataKey="date" stroke="rgba(226,232,240,0.65)" tick={{ fill: 'rgba(226,232,240,0.65)', fontSize: 12 }} />
            <YAxis yAxisId="cal" stroke="rgba(226,232,240,0.65)" tick={{ fill: 'rgba(226,232,240,0.65)', fontSize: 12 }} domain={[0, 'auto']} />
            <YAxis yAxisId="mac" orientation="right" stroke="rgba(226,232,240,0.35)" tick={{ fill: 'rgba(226,232,240,0.65)', fontSize: 12 }} domain={[0, 'auto']} />
            <Tooltip
              contentStyle={{ background: 'rgba(2,6,23,0.92)', border: '1px solid rgba(51,65,85,0.8)', borderRadius: 12 }}
              labelStyle={{ color: 'rgba(226,232,240,0.9)' }}
              itemStyle={{ color: 'rgba(226,232,240,0.9)' }}
            />
            <Legend wrapperStyle={{ color: 'rgba(226,232,240,0.75)' }} />

            <Line yAxisId="cal" type="monotone" dataKey="calories" name="Calories" stroke="#60a5fa" strokeWidth={2} dot={false} connectNulls />
            <Line yAxisId="mac" type="monotone" dataKey="protein_g" name="Protein (g)" stroke="#34d399" strokeWidth={2} dot={false} connectNulls />
            <Line yAxisId="mac" type="monotone" dataKey="carbs_g" name="Carbs (g)" stroke="#fbbf24" strokeWidth={2} dot={false} connectNulls />
            <Line yAxisId="mac" type="monotone" dataKey="fat_g" name="Fat (g)" stroke="#f472b6" strokeWidth={2} dot={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="h-72">
        <div className="mb-2 text-sm font-medium text-slate-100">Weight (lb)</div>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
            <XAxis dataKey="date" stroke="rgba(226,232,240,0.65)" tick={{ fill: 'rgba(226,232,240,0.65)', fontSize: 12 }} />
            <YAxis stroke="rgba(226,232,240,0.65)" tick={{ fill: 'rgba(226,232,240,0.65)', fontSize: 12 }} domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{ background: 'rgba(2,6,23,0.92)', border: '1px solid rgba(51,65,85,0.8)', borderRadius: 12 }}
              labelStyle={{ color: 'rgba(226,232,240,0.9)' }}
              itemStyle={{ color: 'rgba(226,232,240,0.9)' }}
            />
            <Line type="monotone" dataKey="weight" stroke="#38bdf8" strokeWidth={2} dot={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="h-72">
        <div className="mb-2 text-sm font-medium text-slate-100">Blood pressure + pulse</div>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
            <XAxis dataKey="date" stroke="rgba(226,232,240,0.65)" tick={{ fill: 'rgba(226,232,240,0.65)', fontSize: 12 }} />
            <YAxis stroke="rgba(226,232,240,0.65)" tick={{ fill: 'rgba(226,232,240,0.65)', fontSize: 12 }} domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{ background: 'rgba(2,6,23,0.92)', border: '1px solid rgba(51,65,85,0.8)', borderRadius: 12 }}
              labelStyle={{ color: 'rgba(226,232,240,0.9)' }}
              itemStyle={{ color: 'rgba(226,232,240,0.9)' }}
            />
            <Legend wrapperStyle={{ color: 'rgba(226,232,240,0.75)' }} />
            <Line type="monotone" dataKey="systolic" name="Systolic" stroke="#fb7185" strokeWidth={2} dot={false} connectNulls />
            <Line type="monotone" dataKey="diastolic" name="Diastolic" stroke="#f97316" strokeWidth={2} dot={false} connectNulls />
            <Line type="monotone" dataKey="pulse" name="Pulse" stroke="#34d399" strokeWidth={2} dot={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="h-80">
        <div className="mb-2 text-sm font-medium text-slate-100">Peptides taken (mcg) — by peptide</div>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
            <XAxis dataKey="date" stroke="rgba(226,232,240,0.65)" tick={{ fill: 'rgba(226,232,240,0.65)', fontSize: 12 }} />
            <YAxis stroke="rgba(226,232,240,0.65)" tick={{ fill: 'rgba(226,232,240,0.65)', fontSize: 12 }} domain={[0, 'auto']} />
            <Tooltip
              contentStyle={{ background: 'rgba(2,6,23,0.92)', border: '1px solid rgba(51,65,85,0.8)', borderRadius: 12 }}
              labelStyle={{ color: 'rgba(226,232,240,0.9)' }}
              itemStyle={{ color: 'rgba(226,232,240,0.9)' }}
            />
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

      <p className="text-xs text-neutral-500">
        Note: BP/pulse values are daily averages; weight is the most recent entry per day.
      </p>
    </div>
  )
}
