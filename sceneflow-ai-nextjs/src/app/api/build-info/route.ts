import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 10

export async function GET() {
  // Gate behind env so we can disable in production if desired
  if (process.env.ENABLE_BUILD_INFO !== 'true') {
    return NextResponse.json({ error: 'Disabled' }, { status: 404 })
  }

  const commit = process.env.VERCEL_GIT_COMMIT_SHA || process.env.COMMIT_SHA || 'unknown'
  // Mirror the model logic used in /api/version
  const model = process.env.GEMINI_MODEL || 'gemini-3.0-flash'

  // UI marker: strings that must exist in the built UI if our changes are present
  const uiMarker = {
    tabs: ['Your Direction', 'Flow Direction'],
  }

  return NextResponse.json({ commit, model, uiMarker, ts: Date.now() })
}


