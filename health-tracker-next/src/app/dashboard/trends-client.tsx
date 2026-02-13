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
  weight?: number | null
  systolic?: number | null
  diastolic?: number | null
  pulse?: number | null
  peptide_mcg?: number | null
}

export function TrendsClient({ points }: { points: Point[] }) {
  return (
    <div className="space-y-6">
      <div className="h-72">
        <div className="mb-2 text-sm font-medium">Calories</div>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="calories" stroke="#111827" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="h-72">
        <div className="mb-2 text-sm font-medium">Weight (lb)</div>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="weight" stroke="#2563eb" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="h-72">
        <div className="mb-2 text-sm font-medium">Blood pressure</div>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="systolic" stroke="#ef4444" dot={false} />
            <Line type="monotone" dataKey="diastolic" stroke="#f97316" dot={false} />
            <Line type="monotone" dataKey="pulse" stroke="#10b981" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="h-72">
        <div className="mb-2 text-sm font-medium">Peptides taken (mcg)</div>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="peptide_mcg" stroke="#8b5cf6" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="text-xs text-neutral-500">
        Note: BP/pulse values are daily averages; weight is the most recent entry per day.
      </p>
    </div>
  )
}
