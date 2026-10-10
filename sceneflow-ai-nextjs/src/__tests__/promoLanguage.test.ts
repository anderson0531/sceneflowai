import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import { resolvePromoPlayback } from '@/lib/publish/promoBeatMedia'
import {
  promoAgentShotNeedsGeneration,
  promoAssetForLanguage,
  promoNarrationWordBudget,
  promoOnScreenEnglish,
  promoShotLocalizes,
  readPromoShotLocalization,
  upsertPromoLanguageTrailer,
} from '@/lib/publish/promoLanguage'
import type { PromoTrailerAsset } from '@/types/publishingAssets'

const asset = (language: string, url: string): PromoTrailerAsset => ({
  mp4Url: url,
  aspect: '16:9',
  language,
  durationSec: 60,
  targetDurationSec: 60,
  beatPlan: [],
  renderedAt: '2026-01-01T00:00:00.000Z',
  status: 'ready',
})

describe('promoAgentShotNeedsGeneration', () => {
  it('generates missing source clips and leaves finished ones', () => {
    expect(
      promoAgentShotNeedsGeneration({
        beatKind: 'action',
        language: 'en',
        hasMasterClip: false,
        hasLanguageClip: false,
      })
    ).toEqual({ generate: true, dialogue: false, localized: false })
    expect(
      promoAgentShotNeedsGeneration({
        beatKind: 'dialogue',
        language: 'en',
        hasMasterClip: true,
        hasLanguageClip: false,
      })
    ).toEqual({ generate: false, dialogue: false, localized: false })
  })

  it('regenerates dialogue, titles, and credits, and shares plain action', () => {
    expect(
      promoAgentShotNeedsGeneration({
        beatKind: 'dialogue',
        language: 'es',
        hasMasterClip: true,
        hasLanguageClip: false,
      })
    ).toEqual({ generate: true, dialogue: true, localized: true })
    expect(
      promoAgentShotNeedsGeneration({
        beatKind: 'action',
        beatRole: 'title_reveal',
        cinematicType: 'title',
        language: 'es',
        hasMasterClip: true,
        hasLanguageClip: false,
      })
    ).toEqual({ generate: true, dialogue: false, localized: true })
    expect(
      promoAgentShotNeedsGeneration({
        beatKind: 'action',
        beatRole: 'credit',
        language: 'es',
        hasMasterClip: true,
        hasLanguageClip: true,
      })
    ).toEqual({ generate: false, dialogue: false, localized: true })
    expect(
      promoAgentShotNeedsGeneration({
        beatKind: 'action',
        language: 'es',
        hasMasterClip: true,
        hasLanguageClip: false,
      })
    ).toEqual({ generate: false, dialogue: false, localized: false })
    expect(
      promoAgentShotNeedsGeneration({
        beatKind: 'action',
        overlayText: 'THE CURRENT',
        language: 'es',
        hasMasterClip: true,
        hasLanguageClip: false,
      })
    ).toEqual({ generate: true, dialogue: false, localized: true })
    expect(
      promoAgentShotNeedsGeneration({
        beatKind: 'action',
        language: 'es',
        hasMasterClip: false,
        hasLanguageClip: false,
      })
    ).toEqual({ generate: true, dialogue: false, localized: false })
  })
})

describe('promo shot localization', () => {
  it('reads title copy from the source scene when the plan omitted it', () => {
    const fields = readPromoShotLocalization(
      [
        {
          cinematicType: 'title',
          beats: [{ beatId: 'title', kind: 'action', beatRole: 'title_reveal', overlayText: 'The Current' }],
        },
      ],
      { sceneIndex: 0, beatId: 'title', beatKind: 'action' }
    )
    expect(promoShotLocalizes(fields)).toBe('title')
    expect(promoOnScreenEnglish({ overlayText: 'The Current', line: 'ignored' })).toBe('The Current')
    expect(promoShotLocalizes({ beatKind: 'action' })).toBeNull()
  })

  it('plays a language title clip and keeps a shared action clip', () => {
    const production = {
      title: {
        segments: [
          {
            beatId: 'card',
            segmentId: 'seg-title',
            activeAssetUrl: 'https://cdn.example/master.mp4',
            takes: [
              {
                id: 'master',
                assetUrl: 'https://cdn.example/master.mp4',
                status: 'COMPLETE',
                createdAt: '2026-01-01T00:00:00.000Z',
              },
            ],
            currentTakeId: 'master',
            languageVersions: {
              es: {
                currentTakeId: 'es',
                takes: [
                  {
                    id: 'es',
                    assetUrl: 'https://cdn.example/es.mp4',
                    status: 'COMPLETE',
                    createdAt: '2026-01-02T00:00:00.000Z',
                  },
                ],
              },
            },
          },
        ],
      },
    }
    const title = resolvePromoPlayback(
      {
        sceneId: 'title',
        beatId: 'card',
        sceneIndex: 0,
        startSec: 0,
        endSec: 5,
        score: 1,
        beatKind: 'action',
        beatRole: 'title_reveal',
        cinematicType: 'title',
      },
      production,
      'es'
    )
    expect(title.videoUrl).toBe('https://cdn.example/es.mp4')
    expect(title.hasLanguageClip).toBe(true)

    const action = resolvePromoPlayback(
      {
        sceneId: 'title',
        beatId: 'card',
        sceneIndex: 0,
        startSec: 0,
        endSec: 5,
        score: 1,
        beatKind: 'action',
      },
      production,
      'es'
    )
    expect(action.videoUrl).toBe('https://cdn.example/master.mp4')
    expect(action.hasLanguageClip).toBe(false)
  })
})

describe('promo narration and language renders', () => {
  it('scales the narration word budget with the trailer length', () => {
    const short = promoNarrationWordBudget(30)
    const long = promoNarrationWordBudget(120)
    expect(long.maxWords).toBeGreaterThan(short.maxWords)
    expect(short.minWords).toBeGreaterThan(0)
    expect(long.maxWords).toBeGreaterThan(70)
  })

  it('keeps a render per language and leaves the source trailer in place', () => {
    const english = asset('en', 'https://example.com/en.mp4')
    const withEnglish = upsertPromoLanguageTrailer(undefined, english)
    expect(withEnglish.trailer?.mp4Url).toBe('https://example.com/en.mp4')
    const withSpanish = upsertPromoLanguageTrailer(withEnglish, asset('es', 'https://example.com/es.mp4'))
    expect(withSpanish.trailer?.mp4Url).toBe('https://example.com/en.mp4')
    expect(promoAssetForLanguage(withSpanish, 'es')?.mp4Url).toBe('https://example.com/es.mp4')
    expect(promoAssetForLanguage(withSpanish, 'fr')).toBeUndefined()
  })

  it('stores narration on the requested language instead of a fixed English voice', () => {
    const route = readFileSync(
      path.join(process.cwd(), 'src/app/api/publish/promo/scene/route.ts'),
      'utf8'
    )
    expect(route).toContain('resolveGeminiTtsLanguageCode')
    expect(route).not.toContain('en-US-Chirp3-HD-Charon')
    expect(route).toContain('[language]')
  })
})
