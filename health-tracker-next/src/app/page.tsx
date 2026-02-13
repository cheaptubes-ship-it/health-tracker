import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-semibold">Health Tracker</h1>
        <p className="text-sm text-neutral-600">
          Minimal Next.js + Supabase app.
        </p>

        <div className="rounded-lg border p-4">
          <h2 className="font-medium">Get started</h2>
          <div className="mt-2 flex gap-3">
            <Link className="rounded bg-black px-3 py-2 text-sm text-white" href="/login">
              Sign in
            </Link>
            <Link className="rounded border px-3 py-2 text-sm" href="/dashboard">
              Dashboard
            </Link>
            <Link className="rounded border px-3 py-2 text-sm" href="/api/health">
              API health
            </Link>
          </div>
        </div>

        <p className="text-xs text-neutral-500">
          Tip: your data is protected with Row Level Security (RLS) so users only see their own
          entries.
        </p>
      </div>
    </main>
  )
}
