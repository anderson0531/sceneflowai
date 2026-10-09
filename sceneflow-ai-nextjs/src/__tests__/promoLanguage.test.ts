import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import {
  promoAgentShotNeedsGeneration,
  promoAssetForLanguage,
  promoNarrationWordBudget,
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
    ).toEqual({ generate: true, dialogue: false })
    expect(
      promoAgentShotNeedsGeneration({
        beatKind: 'dialogue',
        language: 'en',
        hasMasterClip: true,
        hasLanguageClip: false,
      })
    ).toEqual({ generate: false, dialogue: false })
  })

  it('regenerates only dialogue clips for another language', () => {
    expect(
      promoAgentShotNeedsGeneration({
        beatKind: 'dialogue',
        language: 'es',
        hasMasterClip: true,
        hasLanguageClip: false,
      })
    ).toEqual({ generate: true, dialogue: true })
    expect(
      promoAgentShotNeedsGeneration({
        beatKind: 'dialogue',
        language: 'es',
        hasMasterClip: true,
        hasLanguageClip: true,
      })
    ).toEqual({ generate: false, dialogue: true })
    expect(
      promoAgentShotNeedsGeneration({
        beatKind: 'action',
        language: 'es',
        hasMasterClip: true,
        hasLanguageClip: false,
      })
    ).toEqual({ generate: false, dialogue: false })
    expect(
      promoAgentShotNeedsGeneration({
        beatKind: 'action',
        language: 'es',
        hasMasterClip: false,
        hasLanguageClip: false,
      })
    ).toEqual({ generate: true, dialogue: false })
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
