import { createSupabaseServerClient } from '@/lib/supabase/server'
import { deleteVitals } from './server-actions'

export async function VitalsList({ selectedDate }: { selectedDate: string }) {
  const supabase = await createSupabaseServerClient()
  const { data: rows, error } = await supabase
    .from('vitals_entries')
    .select('id, systolic, diastolic, pulse, created_at')
    .eq('entry_date', selectedDate)
    .order('created_at', { ascending: false })

  if (error) {
    return <p className="text-sm text-red-600">Error: {error.message}</p>
  }

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="font-medium">Entries ({rows?.length ?? 0})</h3>
        <p className="text-xs text-neutral-500">{selectedDate}</p>
      </div>

      {rows && rows.length ? (
        <ul className="mt-3 divide-y">
          {rows.map((e) => (
            <li key={e.id} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">
                    {e.systolic}/{e.diastolic}
                    <span className="ml-2 text-xs text-neutral-500">
                      {new Date(e.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-sm text-neutral-700">Pulse: {e.pulse ?? '—'}</div>
                </div>

                <form action={deleteVitals}>
                  <input type="hidden" name="id" value={e.id} />
                  <button className="rounded border px-2 py-1 text-xs hover:bg-neutral-50">
                    Delete
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-neutral-600">No vitals yet.</p>
      )}
    </div>
  )
}
