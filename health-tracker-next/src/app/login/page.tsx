import { redirect } from 'next/navigation'

import { login, signup } from './actions'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams

  return (
    <main className="min-h-screen p-6 sm:p-10">
      <div className="mx-auto max-w-md space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Health Tracker</h1>
          <p className="text-sm text-slate-300">
            Sign in with email + password.
          </p>
        </div>

        <form
          className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm"
          action={async (formData) => {
            'use server'
            const dest = next ?? '/dashboard'
            const ok = await login(formData)
            if (ok) redirect(dest)
          }}
        >
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-200" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-200" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoComplete="current-password"
            />
          </div>
          <button className="w-full rounded-lg bg-indigo-500 px-3 py-2 font-medium text-white hover:bg-indigo-400">
            Sign in
          </button>
        </form>

        <form
          className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4"
          action={async (formData) => {
            'use server'
            const dest = next ?? '/dashboard'
            const ok = await signup(formData)
            if (ok) redirect(dest)
          }}
        >
          <h2 className="text-lg font-medium text-slate-100">New here?</h2>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-200" htmlFor="email2">
              Email
            </label>
            <input
              id="email2"
              name="email"
              type="email"
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-200" htmlFor="password2">
              Password
            </label>
            <input
              id="password2"
              name="password"
              type="password"
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoComplete="new-password"
            />
          </div>
          <button className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 font-medium text-slate-100 hover:bg-slate-900">
            Create account
          </button>
        </form>

        <p className="text-xs text-slate-400">
          Note: if you enabled “Confirm email” in Supabase Auth settings, you’ll need to
          confirm before sign-in works.
        </p>
      </div>
    </main>
  )
}
