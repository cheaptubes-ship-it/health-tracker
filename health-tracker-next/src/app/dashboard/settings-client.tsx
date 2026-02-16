'use client'

import { useState } from 'react'

export function SettingsClient({
  initial,
  timezoneInitial,
  shortcutsToken,
  shortcutsStatus,
}: {
  initial: {
    calories: number | null
    protein_g: number | null
    carbs_g: number | null
    fat_g: number | null

    hydration?: {
      unit_pref: 'oz' | 'ml'
      water_ml: number | null
      sodium_mg: number | null
      potassium_mg: number | null
      magnesium_mg: number | null
    } | null
  } | null
  timezoneInitial: string | null
  shortcutsToken: string | null
  shortcutsStatus: {
    steps: { entry_date: string; steps: number | null; updated_at: string | null } | null
    cardio: { kind: string; started_at: string | null; ended_at: string | null; updated_at: string | null } | null
  }
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const [tzBusy, setTzBusy] = useState(false)
  const [tzError, setTzError] = useState<string | null>(null)
  const [tzOk, setTzOk] = useState<string | null>(null)
  const [timezone, setTimezone] = useState(timezoneInitial ?? '')

  const [hydrationBusy, setHydrationBusy] = useState(false)
  const [hydrationError, setHydrationError] = useState<string | null>(null)
  const [hydrationOk, setHydrationOk] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setOk(null)
    try {
      const fd = new FormData(e.currentTarget)
      const payload = {
        calories: fd.get('calories'),
        protein_g: fd.get('protein_g'),
        carbs_g: fd.get('carbs_g'),
        fat_g: fd.get('fat_g'),
      }
      const res = await fetch('/api/macro-targets', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.ok) throw new Error(json?.error ?? 'Failed to save targets')
      setOk('Saved')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const [unitPref, setUnitPref] = useState<'oz' | 'ml'>(initial?.hydration?.unit_pref ?? 'oz')

  function mlToOz(ml: number) {
    return ml / 29.5735
  }
  function ozToMl(oz: number) {
    return oz * 29.5735
  }

  const initialWaterTarget =
    initial?.hydration?.water_ml != null
      ? unitPref === 'oz'
        ? String(Math.round(mlToOz(initial.hydration.water_ml)))
        : String(Math.round(initial.hydration.water_ml))
      : ''

  const [waterTarget, setWaterTarget] = useState(initialWaterTarget)
  const [sodiumTarget, setSodiumTarget] = useState(String(initial?.hydration?.sodium_mg ?? ''))
  const [potassiumTarget, setPotassiumTarget] = useState(String(initial?.hydration?.potassium_mg ?? ''))
  const [magnesiumTarget, setMagnesiumTarget] = useState(String(initial?.hydration?.magnesium_mg ?? ''))

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Settings</h2>

      <form onSubmit={onSubmit} className="grid gap-3 max-w-md">
        <label className="grid gap-1 text-sm text-slate-200">
          Calories
          <input
            name="calories"
            type="number"
            className="rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            defaultValue={initial?.calories ?? ''}
          />
        </label>
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="grid gap-1 text-sm text-slate-200">
            Protein (g)
            <input
              name="protein_g"
              type="number"
              className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              defaultValue={initial?.protein_g ?? ''}
            />
          </label>
          <label className="grid gap-1 text-sm text-slate-200">
            Carbs (g)
            <input
              name="carbs_g"
              type="number"
              className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              defaultValue={initial?.carbs_g ?? ''}
            />
          </label>
          <label className="grid gap-1 text-sm text-slate-200">
            Fat (g)
            <input
              name="fat_g"
              type="number"
              className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              defaultValue={initial?.fat_g ?? ''}
            />
          </label>
        </div>

        <button
          disabled={busy}
          className="w-fit rounded-lg bg-indigo-500 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Save targets'}
        </button>

        {ok ? <p className="text-sm text-emerald-400">{ok}</p> : null}
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
      </form>

      <p className="text-sm text-slate-300">
        Next: meal photo → estimate → edit → save, plus USDA/OpenFoodFacts search.
      </p>

      <div className="h-px bg-slate-800" />

      <div className="space-y-3 max-w-md">
        <h3 className="text-base font-semibold">iPhone Shortcuts (Health import)</h3>
        <p className="text-sm text-slate-300">
          For now we’ll import Steps and Cardio via iOS Shortcuts. This uses a per-user token.
        </p>

        <div className="grid gap-2">
          <div className="rounded-lg border border-slate-800 bg-slate-950/20 p-3">
            <div className="text-xs text-slate-400">Your Shortcuts token</div>
            <div className="mt-1 break-all font-mono text-sm text-slate-100">
              {shortcutsToken ?? '—'}
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/20 p-3">
            <div className="text-xs font-semibold text-slate-200">Peptide reminders (Shortcuts)</div>
            <div className="mt-1 text-xs text-slate-300">
              These endpoints return what’s due (and filter out doses already logged today). Use <span className="font-mono">format=text</span> for notifications.
            </div>
            <div className="mt-2 grid gap-2">
              <div>
                <div className="text-xs text-slate-400">AM (text)</div>
                <div className="break-all font-mono text-xs text-slate-100">
                  {shortcutsToken
                    ? `/api/peptides/reminder?token=${shortcutsToken}&timing=am&format=text`
                    : '—'}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">PM (text) — includes bedtime</div>
                <div className="break-all font-mono text-xs text-slate-100">
                  {shortcutsToken
                    ? `/api/peptides/reminder?token=${shortcutsToken}&timing=pm&format=text`
                    : '—'}
                </div>
              </div>
            </div>
            <div className="mt-2 text-xs text-slate-400">
              Tip: prepend your site URL in Shortcuts, e.g. <span className="font-mono">https://health-tracker-next.vercel.app</span>.
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/20 p-3">
            <div className="text-xs font-semibold text-slate-200">Import status</div>
            <div className="mt-2 text-xs text-slate-300">
              Steps last import:{' '}
              {shortcutsStatus.steps?.updated_at
                ? `${new Date(shortcutsStatus.steps.updated_at).toLocaleString()} (${shortcutsStatus.steps.entry_date}, ${shortcutsStatus.steps.steps ?? '—'} steps)`
                : '—'}
            </div>
            <div className="mt-1 text-xs text-slate-300">
              Cardio last import:{' '}
              {shortcutsStatus.cardio?.updated_at
                ? `${new Date(shortcutsStatus.cardio.updated_at).toLocaleString()} (${shortcutsStatus.cardio.kind}${shortcutsStatus.cardio.started_at ? `, ${new Date(shortcutsStatus.cardio.started_at).toLocaleString()}` : ''})`
                : '—'}
            </div>
            <div className="mt-2 text-xs text-slate-400">
              If these stay blank, your Shortcut isn’t hitting the endpoint (token/URL mismatch).
            </div>
          </div>

          <button
            type="button"
            className="w-fit rounded-lg border border-slate-700 bg-slate-950/30 px-3 py-2 text-sm text-slate-100 hover:bg-slate-900/50"
            onClick={async () => {
              try {
                setError(null)
                setOk(null)
                const res = await fetch('/api/shortcuts/token', { method: 'POST' })
                const json = await res.json().catch(() => null)
                if (!res.ok || !json?.ok) throw new Error(json?.error ?? 'Failed to generate token')
                // simplest: reload so server picks up the new token
                window.location.reload()
              } catch (e) {
                setError(e instanceof Error ? e.message : String(e))
              }
            }}
          >
            {shortcutsToken ? 'Rotate token' : 'Generate token'}
          </button>

          <div className="rounded-lg border border-slate-800 bg-slate-950/20 p-3">
            <div className="text-xs font-semibold text-slate-200">Steps (daily) payload</div>
            <pre className="mt-2 overflow-auto rounded bg-slate-950/40 p-2 text-xs text-slate-200">{JSON.stringify(
              {
                token: 'YOUR_TOKEN',
                entry_date: '2026-02-14',
                steps: 12345,
                distance_m: 8046,
                active_kcal: 520,
                avg_hr: 112,
              },
              null,
              2
            )}</pre>
            <div className="mt-2 text-xs text-slate-400">
              POST to <span className="font-mono">/api/shortcuts/steps</span>
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/20 p-3">
            <div className="text-xs font-semibold text-slate-200">Cardio payload</div>
            <pre className="mt-2 overflow-auto rounded bg-slate-950/40 p-2 text-xs text-slate-200">{JSON.stringify(
              {
                token: 'YOUR_TOKEN',
                kind: 'walk',
                started_at: '2026-02-14T12:00:00-05:00',
                ended_at: '2026-02-14T12:35:00-05:00',
                duration_min: 35,
                distance_m: 3200,
                avg_hr: 118,
                max_hr: 142,
                calories_kcal: 220,
                note: 'easy pace',
              },
              null,
              2
            )}</pre>
            <div className="mt-2 text-xs text-slate-400">
              POST to <span className="font-mono">/api/shortcuts/cardio</span>
            </div>
          </div>

          <p className="text-xs text-slate-400">
            Note: for this to work, the server needs <span className="font-mono">SUPABASE_SERVICE_ROLE_KEY</span> set.
          </p>
        </div>
      </div>

      <div className="h-px bg-slate-800" />

      <div className="space-y-3 max-w-md">
        <h3 className="text-base font-semibold">Time zone</h3>
        <p className="text-sm text-slate-300">
          Used for “today”, day-of-week schedules, and reminders.
        </p>

        <div className="grid gap-3">
          <label className="grid gap-1 text-sm text-slate-200">
            IANA time zone
            <input
              className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              placeholder="e.g. America/New_York"
            />
            <div className="text-xs text-slate-400">
              Examples: <span className="font-mono">America/New_York</span>, <span className="font-mono">America/Los_Angeles</span>, <span className="font-mono">Europe/London</span>
            </div>
          </label>

          <button
            type="button"
            disabled={tzBusy}
            className="w-fit rounded-lg border border-slate-700 bg-slate-950/30 px-3 py-2 text-sm text-slate-100 hover:bg-slate-900/50 disabled:opacity-50"
            onClick={async () => {
              try {
                setTzBusy(true)
                setTzError(null)
                setTzOk(null)
                const res = await fetch('/api/user-settings', {
                  method: 'POST',
                  headers: { 'content-type': 'application/json' },
                  body: JSON.stringify({ timezone: timezone.trim() || null }),
                })
                const json = await res.json().catch(() => null)
                if (!res.ok || !json?.ok) throw new Error(json?.error ?? 'Failed to save timezone')
                setTzOk('Saved')
                window.location.reload()
              } catch (e) {
                setTzError(e instanceof Error ? e.message : String(e))
              } finally {
                setTzBusy(false)
              }
            }}
          >
            {tzBusy ? 'Saving…' : 'Save time zone'}
          </button>

          {tzOk ? <p className="text-sm text-emerald-400">{tzOk}</p> : null}
          {tzError ? <p className="text-sm text-red-400">{tzError}</p> : null}
        </div>
      </div>

      <div className="h-px bg-slate-800" />

      <div className="space-y-3 max-w-md">
        <h3 className="text-base font-semibold">Hydration</h3>
        <p className="text-sm text-slate-300">
          Targets are per day. Water is stored in ml; display can be oz or ml.
        </p>

        <div className="grid gap-3">
          <label className="grid gap-1 text-sm text-slate-200">
            Water units
            <select
              className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={unitPref}
              onChange={(e) => setUnitPref(e.target.value as 'oz' | 'ml')}
            >
              <option value="oz">oz</option>
              <option value="ml">ml</option>
            </select>
          </label>

          <label className="grid gap-1 text-sm text-slate-200">
            Water target ({unitPref})
            <input
              className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={waterTarget}
              onChange={(e) => setWaterTarget(e.target.value)}
              placeholder="e.g. 2500"
            />
          </label>

          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="grid gap-1 text-sm text-slate-200">
              Sodium (mg)
              <input
                className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={sodiumTarget}
                onChange={(e) => setSodiumTarget(e.target.value)}
                placeholder="e.g. 3000"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-200">
              Potassium (mg)
              <input
                className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={potassiumTarget}
                onChange={(e) => setPotassiumTarget(e.target.value)}
                placeholder="e.g. 1500"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-200">
              Magnesium (mg)
              <input
                className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={magnesiumTarget}
                onChange={(e) => setMagnesiumTarget(e.target.value)}
                placeholder="e.g. 300"
              />
            </label>
          </div>
        </div>

        <button
          type="button"
          disabled={hydrationBusy}
          className="w-fit rounded-lg border border-slate-700 bg-slate-950/30 px-3 py-2 text-sm text-slate-100 hover:bg-slate-900/50 disabled:opacity-50"
          onClick={async () => {
            try {
              setHydrationBusy(true)
              setHydrationError(null)
              setHydrationOk(null)
              const res = await fetch('/api/hydration/targets', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                  unit_pref: unitPref,
                  water_ml: (() => {
                    const v = Number(String(waterTarget).trim())
                    if (!Number.isFinite(v) || v <= 0) return null
                    return unitPref === 'oz' ? ozToMl(v) : v
                  })(),
                  sodium_mg: sodiumTarget || null,
                  potassium_mg: potassiumTarget || null,
                  magnesium_mg: magnesiumTarget || null,
                }),
              })
              const json = await res.json().catch(() => null)
              if (!res.ok || !json?.ok) throw new Error(json?.error ?? 'Failed to save hydration settings')
              setHydrationOk('Saved')
              // Ensure dashboard picks up the new targets immediately
              window.location.reload()
            } catch (e) {
              setHydrationError(e instanceof Error ? e.message : String(e))
            } finally {
              setHydrationBusy(false)
            }
          }}
        >
          {hydrationBusy ? 'Saving…' : 'Save hydration settings'}
        </button>

        {hydrationOk ? <p className="text-sm text-emerald-400">{hydrationOk}</p> : null}
        {hydrationError ? <p className="text-sm text-red-400">{hydrationError}</p> : null}
      </div>
    </div>
  )
}
