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
