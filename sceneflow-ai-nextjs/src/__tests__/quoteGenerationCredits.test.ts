import { describe, expect, it } from 'vitest'
import {
  creditsForProviderUsd,
  klingQuotesFromParsed,
  omniQuotesFromParsed,
  parseKlingOmniRatesFromMarkdown,
  parseOmniRatesFromText,
  quoteGenerationCredits,
} from '@/lib/credits/quoteGenerationCredits'

const KLING_FIXTURE = `
| Kling 3.0 Omni | Per second | No Video Input x No Native Audio | 0.6 Units ($0.084) /s | 0.8 Units ($0.112) /s | 3.0 Units ($0.42) /s |
| Kling 3.0 Omni | Per second | No Video Input x With Native Audio | 0.8 Units ($0.112) /s | 1.0 Unit ($0.14) /s | 3.0 Units ($0.42) /s |
| Kling 3.0 Omni | Per second | With Video Input x No Native Audio | 0.9 Units ($0.126) /s | 1.2 Units ($0.168) /s | 3.0 Units ($0.42) /s |
`

const OMNI_FIXTURE = `
Video output $17.50 per 1M tokens
| 360p | 1,931 tokens per second | ~$0.034 |
| 720p | 5,792 tokens per second | ~$0.101 |
| 1080p | 8,688 tokens per second | ~$0.152 |
| 4K | 17,376 tokens per second | ~$0.304 |
`

describe('quoteGenerationCredits', () => {
  it('prices a 10s Omni 1080p clip above provider cost at the Studio cash rate', () => {
    const quote = quoteGenerationCredits({
      kind: 'clip',
      provider: 'google_vertex',
      resolution: '1080p',
      durationSeconds: 10,
    })
    expect(quote.operation).toBe('omni_1080p')
    expect(quote.providerUsd).toBeCloseTo(1.52, 2)
    expect(quote.credits).toBe(274)
    expect(quote.credits * 0.008).toBeGreaterThan(quote.providerUsd)
  })

  it('prices Kling 4K above list cost and 1080p audio under the old 280-credit flat rate', () => {
    const hd = quoteGenerationCredits({
      kind: 'clip',
      provider: 'kling',
      resolution: '1080p',
      audio: true,
      durationSeconds: 10,
    })
    const uhd = quoteGenerationCredits({
      kind: 'clip',
      provider: 'kling',
      resolution: '4k',
      durationSeconds: 10,
    })
    expect(hd.credits).toBe(252)
    expect(uhd.credits).toBe(756)
    expect(uhd.credits * 0.008).toBeGreaterThan(uhd.providerUsd)
  })

  it('adds a flat ingredient surcharge and applies BYOK only for media kinds', () => {
    const hosted = quoteGenerationCredits({
      kind: 'clip',
      resolution: '720p',
      durationSeconds: 10,
      referenceImageCount: 2,
    })
    const byok = quoteGenerationCredits({
      kind: 'clip',
      resolution: '720p',
      durationSeconds: 10,
      referenceImageCount: 2,
      userKeyUsed: true,
    })
    expect(hosted.credits).toBe(byok.standardCredits)
    expect(byok.byok).toBe(true)
    expect(byok.cogsUsd).toBe(0)
    expect(byok.credits).toBe(Math.max(1, Math.ceil(hosted.credits * 0.2)))

    const script = quoteGenerationCredits({
      kind: 'other',
      userKeyUsed: true,
      floorCredits: 20,
    })
    expect(script.byok).toBe(false)
    expect(script.credits).toBeGreaterThanOrEqual(20)
  })

  it('keeps a still at the catalog floor when the formula is lower', () => {
    const quote = quoteGenerationCredits({
      kind: 'still',
      imageCount: 1,
      floorCredits: 12,
    })
    expect(quote.credits).toBe(12)
    expect(quote.cogsUsd).toBeCloseTo(0.04, 5)
  })

  it('enforces the Studio floor when an override would underbill', () => {
    const credits = creditsForProviderUsd(1.52, 1.8, 1, 10)
    expect(credits).toBe(Math.ceil(1.52 / 0.008))
  })
})

describe('public price parsers', () => {
  it('reads Omni per-second rates from a pricing excerpt', () => {
    const parsed = parseOmniRatesFromText(OMNI_FIXTURE)
    expect(parsed['720p']).toBeCloseTo(0.101, 3)
    expect(parsed['1080p']).toBeCloseTo(0.152, 3)
    expect(omniQuotesFromParsed(parsed).map((row) => row.operation)).toEqual([
      'omni_360p',
      'omni_720p',
      'omni_1080p',
      'omni_4k',
    ])
  })

  it('derives Omni rates from token counts when dollar-per-second cells are missing', () => {
    const text = `
      Video output $17.50 per 1M tokens
      720p 5,792 tokens per second
    `
    const parsed = parseOmniRatesFromText(text)
    expect(parsed['720p']).toBeCloseTo(0.101, 3)
  })

  it('reads Kling 3.0 Omni list rates and ignores video-input rows', () => {
    const parsed = parseKlingOmniRatesFromMarkdown(KLING_FIXTURE)
    expect(parsed.p720Silent).toBeCloseTo(0.084, 3)
    expect(parsed.p1080Audio).toBeCloseTo(0.14, 3)
    expect(parsed.p4k).toBeCloseTo(0.42, 3)
    expect(klingQuotesFromParsed(parsed)).toHaveLength(5)
  })
})
