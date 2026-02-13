import { createSupabaseServerClient } from '@/lib/supabase/server'
import { addEntry, deleteEntry } from './server-actions'

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // middleware should enforce, but keep defensive
  if (!user) {
    return (
      <main className="min-h-screen p-8">
        <p>Not signed in.</p>
      </main>
    )
  }

  const { data: entries, error } = await supabase
    .from('entries')
    .select('id, entry_date, weight_kg, mood, sleep_hours, notes, created_at')
    .order('entry_date', { ascending: false })
    .limit(50)

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <form action="/logout" method="post">
            <button className="rounded border px-3 py-2 text-sm">Sign out</button>
          </form>
        </div>

        <div className="rounded-lg border p-4">
          <h2 className="font-medium">Add entry</h2>
          <form className="mt-3 grid gap-3" action={addEntry}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm">
                Date
                <input
                  name="entry_date"
                  type="date"
                  className="rounded border px-3 py-2"
                />
              </label>
              <label className="grid gap-1 text-sm">
                Weight (kg)
                <input
                  name="weight_kg"
                  type="number"
                  step="0.1"
                  className="rounded border px-3 py-2"
                  placeholder="e.g. 80.5"
                />
              </label>
              <label className="grid gap-1 text-sm">
                Mood (1-5)
                <input
                  name="mood"
                  type="number"
                  min={1}
                  max={5}
                  className="rounded border px-3 py-2"
                  placeholder="3"
                />
              </label>
              <label className="grid gap-1 text-sm">
                Sleep (hours)
                <input
                  name="sleep_hours"
                  type="number"
                  step="0.5"
                  min={0}
                  max={24}
                  className="rounded border px-3 py-2"
                  placeholder="7.5"
                />
              </label>
            </div>
            <label className="grid gap-1 text-sm">
              Notes
              <textarea
                name="notes"
                className="min-h-20 rounded border px-3 py-2"
                placeholder="Anything notable…"
              />
            </label>
            <button className="w-fit rounded bg-black px-3 py-2 text-sm text-white">
              Save
            </button>
          </form>
        </div>

        <div className="rounded-lg border p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="font-medium">Recent entries</h2>
            <p className="text-xs text-neutral-500">RLS is enabled: only you can see yours.</p>
          </div>

          {error ? (
            <p className="mt-3 text-sm text-red-600">Error: {error.message}</p>
          ) : entries && entries.length ? (
            <ul className="mt-3 divide-y">
              {entries.map((e) => (
                <li key={e.id} className="py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-sm font-medium">
                        {e.entry_date}{' '}
                        <span className="text-xs font-normal text-neutral-500">
                          (created {new Date(e.created_at).toLocaleString()})
                        </span>
                      </div>
                      <div className="text-sm text-neutral-700">
                        {e.weight_kg != null && <span>Weight: {e.weight_kg}kg. </span>}
                        {e.mood != null && <span>Mood: {e.mood}/5. </span>}
                        {e.sleep_hours != null && <span>Sleep: {e.sleep_hours}h. </span>}
                      </div>
                      {e.notes ? (
                        <p className="text-sm text-neutral-600">{e.notes}</p>
                      ) : null}
                    </div>

                    <form action={deleteEntry}>
                      <input type="hidden" name="id" value={e.id} />
                      <button className="rounded border px-2 py-1 text-xs">Delete</button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-neutral-600">No entries yet.</p>
          )}
        </div>
      </div>
    </main>
  )
}
