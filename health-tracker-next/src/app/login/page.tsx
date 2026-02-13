import { redirect } from 'next/navigation'

import { login, signup } from './actions'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-md space-y-6">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="text-sm text-neutral-600">
          Use email + password. After signing in, you’ll land in your dashboard.
        </p>

        <form
          className="space-y-3 rounded-lg border p-4"
          action={async (formData) => {
            'use server'
            const dest = next ?? '/dashboard'
            const ok = await login(formData)
            if (ok) redirect(dest)
          }}
        >
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded border px-3 py-2"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full rounded border px-3 py-2"
              autoComplete="current-password"
            />
          </div>
          <button className="w-full rounded bg-black px-3 py-2 text-white">
            Sign in
          </button>
        </form>

        <form
          className="space-y-3 rounded-lg border p-4"
          action={async (formData) => {
            'use server'
            const dest = next ?? '/dashboard'
            const ok = await signup(formData)
            if (ok) redirect(dest)
          }}
        >
          <h2 className="text-lg font-medium">New here?</h2>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="email2">
              Email
            </label>
            <input
              id="email2"
              name="email"
              type="email"
              required
              className="w-full rounded border px-3 py-2"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="password2">
              Password
            </label>
            <input
              id="password2"
              name="password"
              type="password"
              required
              className="w-full rounded border px-3 py-2"
              autoComplete="new-password"
            />
          </div>
          <button className="w-full rounded border px-3 py-2">Create account</button>
        </form>

        <p className="text-xs text-neutral-500">
          Note: if you enabled “Confirm email” in Supabase Auth settings, you’ll need to
          confirm before sign-in works.
        </p>
      </div>
    </main>
  )
}
