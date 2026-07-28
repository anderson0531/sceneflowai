import { NextResponse } from 'next/server'
import { PRODUCTION_SECTION_LABELS } from '@/constants/productionSections'

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

  // UI marker: Production section labels that must exist when this rename is live
  const uiMarker = {
    productionSections: [
      PRODUCTION_SECTION_LABELS.dialogueAction,
      PRODUCTION_SECTION_LABELS.callAction,
    ],
  }

  return NextResponse.json({ commit, model, uiMarker, ts: Date.now() })
}


