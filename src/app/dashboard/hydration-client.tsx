'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function HydrationClient() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function addEmergenC() {
    try {
      setError(null)
      setNotice(null)
      // API call here
      setNotice('Emergen-C added')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  async function addCalm() {
    try {
      setError(null)
      setNotice(null)
      // API call here
      setNotice('Calm added')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="space-y-4 p-4">
      <button
        type="button"
        onClick={() => addEmergenC()}
        className="rounded-lg border border-slate-700 bg-slate-950/30 px-3 py-2 text-sm text-slate-100 hover:bg-slate-900"
      >
        Add Emergen-C (1000mg vitamin C)
      </button>
      <button
        type="button"
        onClick={() => addCalm()}
        className="rounded-lg border border-slate-700 bg-slate-950/30 px-3 py-2 text-sm text-slate-100 hover:bg-slate-900"
      >
        Add Calm (325mg magnesium, 2 tsp)
      </button>
      {notice ? <p className="text-sm text-emerald-400">{notice}</p> : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  )
}
