import { describe, it, expect } from 'vitest'
import {
  calculateDetailedProjectCost,
  calculateClientQuoteMargin,
  DEFAULT_PROJECT_PARAMS,
  SERVICE_PROVIDER_PRESETS,
} from '@/lib/credits/projectCalculator'

describe('Hybrid Memoir & Service Provider Margin Calculator', () => {
  it('preserves 100% backward compatibility when hybridVideoShare is omitted', () => {
    const legacy = calculateDetailedProjectCost(DEFAULT_PROJECT_PARAMS)
    const explicitFull = calculateDetailedProjectCost({
      ...DEFAULT_PROJECT_PARAMS,
      video: {
        ...DEFAULT_PROJECT_PARAMS.video,
        hybridVideoShare: 1,
      },
    })
    expect(explicitFull.video.credits).toBe(legacy.video.credits)
    expect(explicitFull.total.credits).toBe(legacy.total.credits)
  })

  it('scales video clip credits accurately for hybrid animatic + AI video share (0%, 25%, 100%)', () => {
    const full = calculateDetailedProjectCost({
      ...DEFAULT_PROJECT_PARAMS,
      scenes: { count: 10, segmentsPerScene: 4, takesPerSegment: 1 },
      video: { ...DEFAULT_PROJECT_PARAMS.video, hybridVideoShare: 1 },
    })
    const quarter = calculateDetailedProjectCost({
      ...DEFAULT_PROJECT_PARAMS,
      scenes: { count: 10, segmentsPerScene: 4, takesPerSegment: 1 },
      video: { ...DEFAULT_PROJECT_PARAMS.video, hybridVideoShare: 0.25 },
    })
    const animaticOnly = calculateDetailedProjectCost({
      ...DEFAULT_PROJECT_PARAMS,
      scenes: { count: 10, segmentsPerScene: 4, takesPerSegment: 1 },
      video: { ...DEFAULT_PROJECT_PARAMS.video, hybridVideoShare: 0 },
    })

    // 40 segments * 0.25 = 10 AI video clips; 0 share = 0 AI video clips
    expect(quarter.video.credits).toBe(Math.round(full.video.credits * 0.25))
    expect(animaticOnly.video.credits).toBe(0)
    // Intelligence & audio remain intact in hybrid mode
    expect(quarter.intelligence.credits).toBe(full.intelligence.credits)
    expect(quarter.audio.credits).toBe(full.audio.credits)
  })

  it('prices the 15-Minute Hybrid Video Memoir preset profitably at a $300 retail price', () => {
    const memoirPreset = SERVICE_PROVIDER_PRESETS.hybrid_memoir_15m
    expect(memoirPreset).toBeDefined()
    expect(memoirPreset.suggestedRetailUsd).toBe(300)
    expect(memoirPreset.hybridVideoShare).toBe(0.25)

    const breakdown = calculateDetailedProjectCost(memoirPreset.params)
    const quote = calculateClientQuoteMargin({
      baseProjectCredits: breakdown.total.credits,
      clientPriceUsd: memoirPreset.suggestedRetailUsd,
      includedRevisionRounds: memoirPreset.defaultRevisionRounds,
    })

    // SceneFlow COGS must keep the $300 Memoir firmly profitable (>60% provider gross margin)
    expect(quote.sceneFlowCogsUsd).toBeGreaterThan(25)
    expect(quote.sceneFlowCogsUsd).toBeLessThan(110)
    expect(quote.providerGrossProfitUsd).toBeGreaterThan(190)
    expect(quote.providerGrossMarginPercent).toBeGreaterThan(60)
    expect(quote.healthyMargin).toBe(true)
  })

  it('flags unhealthy margin when client retail price is below SceneFlow COGS', () => {
    const quote = calculateClientQuoteMargin({
      baseProjectCredits: 10000, // $100 base
      clientPriceUsd: 90,
      includedRevisionRounds: 3,
    })
    expect(quote.providerGrossProfitUsd).toBeLessThan(0)
    expect(quote.healthyMargin).toBe(false)
    expect(quote.suggestedRetailFloorUsd).toBeGreaterThan(quote.sceneFlowCogsUsd)
  })
})
