import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json({
    ok: true,
    vercel: {
      env: process.env.VERCEL_ENV ?? null,
      url: process.env.VERCEL_URL ?? null,
      gitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      gitCommitMessage: process.env.VERCEL_GIT_COMMIT_MESSAGE ?? null,
      gitCommitRef: process.env.VERCEL_GIT_COMMIT_REF ?? null,
    },
    nodeEnv: process.env.NODE_ENV ?? null,
    now: new Date().toISOString(),
  })
}
