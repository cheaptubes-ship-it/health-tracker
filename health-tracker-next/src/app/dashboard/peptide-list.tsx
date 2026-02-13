import { createSupabaseServerClient } from '@/lib/supabase/server'
import { deletePeptide, setPeptideStatus } from './server-actions'

export async function PeptideList({ selectedDate }: { selectedDate: string }) {
  const supabase = await createSupabaseServerClient()
  const { data: rows, error } = await supabase
    .from('peptide_entries')
    .select(
      'id, name, desired_dose, desired_dose_unit, syringe_units, status, created_at, taken_at'
    )
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
                  <div className="text-sm font-medium">{e.name}</div>
                  <div className="text-sm text-neutral-700">
                    Dose: {e.desired_dose} {e.desired_dose_unit} • Syringe units:{' '}
                    {e.syringe_units ? Number(e.syringe_units).toFixed(1) : '—'}
                    <span className="ml-2 text-xs text-neutral-500">({e.status})</span>
                  </div>
                  {e.taken_at ? (
                    <div className="text-xs text-neutral-500">
                      Taken: {new Date(e.taken_at).toLocaleString()}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  <form action={setPeptideStatus}>
                    <input type="hidden" name="id" value={e.id} />
                    <input type="hidden" name="status" value="taken" />
                    <button className="rounded border px-2 py-1 text-xs hover:bg-neutral-50">
                      Mark taken
                    </button>
                  </form>
                  <form action={setPeptideStatus}>
                    <input type="hidden" name="id" value={e.id} />
                    <input type="hidden" name="status" value="skipped" />
                    <button className="rounded border px-2 py-1 text-xs hover:bg-neutral-50">
                      Skip
                    </button>
                  </form>
                  <form action={setPeptideStatus}>
                    <input type="hidden" name="id" value={e.id} />
                    <input type="hidden" name="status" value="pending" />
                    <button className="rounded border px-2 py-1 text-xs hover:bg-neutral-50">
                      Pending
                    </button>
                  </form>
                  <form action={deletePeptide}>
                    <input type="hidden" name="id" value={e.id} />
                    <button className="rounded border px-2 py-1 text-xs hover:bg-neutral-50">
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-neutral-600">No peptides yet.</p>
      )}
    </div>
  )
}
