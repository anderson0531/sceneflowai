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

  // UI markers for deploy verification
  const uiMarker = {
    productionSections: [
      PRODUCTION_SECTION_LABELS.dialogueAction,
      PRODUCTION_SECTION_LABELS.callAction,
    ],
    publishingLibrary: {
      dialogTitle: 'Publishing Library',
      headerButton: 'Publish',
      tabs: ['Final Streams', 'Screening', 'Promo', 'YouTube'],
    },
    keyFeatures: {
      pillars: ['Create', 'Direct', 'Ship'],
      counts: { create: 4, direct: 7, ship: 4 },
      shipHeadline: 'YouTube Publishing',
    },
    landingPage: {
      pipelinePillarsRemoved: true,
      videoLanguageControl: 'overlay-dropdown',
      heroCopy: {
        headline: 'You Direct the Story. SceneFlow Automates the Studio.',
        audienceMicroLineRemoved: true,
      },
    },
    productionShowcase: {
      animation: {
        availableLocales: ['en', 'es'],
      },
    },
    heroVideo: {
      availableLocales: ['en', 'es', 'pt', 'hi', 'zh', 'ar', 'th'],
      englishBlob: 'Hero Video (English).mp4',
      spanishBlob: 'Hero Video (Spanish) .mp4',
      portugueseBlob: 'Hero Video (Portuguese).mp4',
      hindiBlob: 'Hero Video (Hindi).mp4',
      chineseBlob: 'Hero Video (Chinese).mp4',
      arabicBlob: 'Hero Video (Arabic) .mp4',
      thaiBlob: 'Hero Video (Thai) .mp4',
    },
  }

  return NextResponse.json({ commit, model, uiMarker, ts: Date.now() })
}
