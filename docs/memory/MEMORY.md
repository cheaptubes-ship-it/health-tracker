# MEMORY.md

## Health Tracker app

- Primary repo in this workspace: `health-tracker-next` (Next.js App Router + Tailwind + Supabase).
- Local dev: `cd health-tracker-next && npm run dev` (default http://localhost:3000).
- Supabase project URL: https://dqwnbdfguqsmabmwekvk.supabase.co

## OpenClaw Control UI

- If the dashboard shows `unauthorized: gateway token missing`, run `openclaw dashboard` and open the tokenized URL (`http://127.0.0.1:18789/?token=...`) to restore the token in browser storage.

## Health Tracker URLs

- Vercel prod URL: https://health-tracker-next.vercel.app
- Shortcuts endpoints:
  - Steps (POST): https://health-tracker-next.vercel.app/api/shortcuts/steps
  - Cardio (POST): https://health-tracker-next.vercel.app/api/shortcuts/cardio
  - Peptide reminder AM (GET text): https://health-tracker-next.vercel.app/api/peptides/reminder?timing=am&format=text&token=YOUR_TOKEN
  - Peptide reminder PM (GET text): https://health-tracker-next.vercel.app/api/peptides/reminder?timing=pm&format=text&token=YOUR_TOKEN

## Key File Paths (IMPORTANT)

All app source files live under `health-tracker-next/src/`. 
NEVER edit files at the repo root or create duplicate component files.

- Dashboard page: `health-tracker-next/src/app/dashboard/page.tsx`
- Hydration component: `health-tracker-next/src/app/dashboard/hydration-client.tsx`
- Food component: `health-tracker-next/src/app/dashboard/food-client.tsx`
- Activity component: `health-tracker-next/src/app/dashboard/activity-client.tsx`
- Fasting component: `health-tracker-next/src/app/dashboard/fasting-client.tsx`
- API routes: `health-tracker-next/src/app/api/`
- Middleware: `health-tracker-next/middleware.ts`

## ⚠️ CRITICAL PATH RULES
- ALL source files are under: health-tracker-next/src/
- NEVER create or edit files at the repo root
- NEVER create duplicate component files
- Always verify the file path starts with health-tracker-next/src/ before editing

# .github/workflows/validate.yml
name: Build Check
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: cd health-tracker-next && npm ci && npm run build

