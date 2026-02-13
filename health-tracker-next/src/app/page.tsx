import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-semibold">Health Tracker (Next + Supabase)</h1>
        <p className="text-sm text-neutral-600">
          Quick wiring check. This app is configured to use Supabase via environment variables.
        </p>

        <div className="rounded-lg border p-4">
          <h2 className="font-medium">Verify server connectivity</h2>
          <p className="text-sm text-neutral-600">
            Hit the health endpoint:
          </p>
          <p className="mt-2">
            <Link className="underline" href="/api/health">
              /api/health
            </Link>
          </p>
        </div>

        <div className="rounded-lg border p-4">
          <h2 className="font-medium">Next steps</h2>
          <ul className="list-disc pl-5 text-sm text-neutral-700">
            <li>Create tables in Supabase (Table Editor / SQL Editor)</li>
            <li>Enable Auth providers (Authentication)</li>
            <li>Add RLS + policies before exposing data to the browser</li>
          </ul>
        </div>
      </div>
    </main>
  )
}
