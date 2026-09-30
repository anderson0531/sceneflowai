import { describe, it, expect } from 'vitest'
import {
  calculateDetailedProjectCost,
  mergeProjectParameters,
  DEFAULT_PROJECT_PARAMS,
} from '@/lib/credits/projectCalculator'
import {
  estimateVideoClipCredits,
  legacyModelToEngineSelection,
  normalizeVideoParameters,
} from '@/lib/credits/videoEnginePricing'
import { getVeoCostEstimate } from '@/lib/config/modelConfig'
import { getKlingCreditsForGeneration } from '@/lib/credits/creditCosts'
import { quoteGenerationCredits } from '@/lib/credits/quoteGenerationCredits'

describe('videoEnginePricing', () => {
  it('charges Kling tiers per-second with cinematic > standard and ultra-4k > cinematic', () => {
    const duration = 10
    const standard = estimateVideoClipCredits(
      normalizeVideoParameters({
        engine: 'sceneflow',
        qualityTier: 'standard',
        segmentDuration: duration,
        totalMinutes: 1,
      })
    )
    const cinematic = estimateVideoClipCredits(
      normalizeVideoParameters({
        engine: 'sceneflow',
        qualityTier: 'cinematic',
        segmentDuration: duration,
        totalMinutes: 1,
      })
    )
    const ultra4k = estimateVideoClipCredits(
      normalizeVideoParameters({
        engine: 'sceneflow',
        qualityTier: 'ultra-4k',
        segmentDuration: duration,
        totalMinutes: 1,
      })
    )

    expect(standard.creditsEach).toBe(
      getKlingCreditsForGeneration({ quality: 'std', durationSeconds: duration })
    )
    expect(cinematic.creditsEach).toBe(
      getKlingCreditsForGeneration({ quality: 'pro', durationSeconds: duration })
    )
    expect(ultra4k.creditsEach).toBe(
      getKlingCreditsForGeneration({ quality: '4k', durationSeconds: duration })
    )
    expect(cinematic.creditsEach).toBeGreaterThan(standard.creditsEach)
    expect(ultra4k.creditsEach).toBeGreaterThan(cinematic.creditsEach)
  })

  it('charges Omni natural-dialogue by duration and resolution', () => {
    const fast = estimateVideoClipCredits(
      normalizeVideoParameters({
        engine: 'natural-dialogue',
        segmentDuration: 8,
        totalMinutes: 1,
        veoQuality: 'fast',
      } as any)
    )
    const max = estimateVideoClipCredits(
      normalizeVideoParameters({
        model: 'veo_quality_4k',
        segmentDuration: 8,
        totalMinutes: 1,
      })
    )

    expect(fast.creditsEach).toBe(
      quoteGenerationCredits({
        kind: 'clip',
        provider: 'google_vertex',
        resolution: '1080p',
        durationSeconds: 8,
      }).credits
    )
    expect(max.creditsEach).toBe(
      quoteGenerationCredits({
        kind: 'clip',
        provider: 'google_vertex',
        resolution: '4k',
        durationSeconds: 8,
      }).credits
    )
  })

  it('maps legacy veo_fast and veo_quality_4k params', () => {
    const fastLegacy = legacyModelToEngineSelection('veo_fast')
    const maxLegacy = legacyModelToEngineSelection('veo_quality_4k')

    expect(fastLegacy.selection.engineId).toBe('natural-dialogue')
    expect(fastLegacy.veoQuality).toBe('fast')
    expect(maxLegacy.veoQuality).toBe('max')

    const normalizedFast = normalizeVideoParameters({ model: 'veo_fast', segmentDuration: 8 })
    const normalizedMax = normalizeVideoParameters({ model: 'veo_quality_4k', segmentDuration: 8 })

    expect(normalizedFast.engine).toBe('natural-dialogue')
    expect(estimateVideoClipCredits(normalizedFast).creditsEach).toBe(
      quoteGenerationCredits({
        kind: 'clip',
        provider: 'google_vertex',
        resolution: '1080p',
        durationSeconds: 8,
      }).credits
    )
    expect(estimateVideoClipCredits(normalizedMax).creditsEach).toBe(
      quoteGenerationCredits({
        kind: 'clip',
        provider: 'google_vertex',
        resolution: '4k',
        durationSeconds: 8,
      }).credits
    )
  })
})

describe('calculateDetailedProjectCost engine-aware video', () => {
  const baseScenes = {
    count: 2,
    segmentsPerScene: 2,
    takesPerSegment: 2,
  }

  it('uses engine-aware clip pricing in project totals', () => {
    const duration = 10
    const cinematic = calculateDetailedProjectCost(
      mergeProjectParameters({
        scenes: baseScenes,
        video: {
          engine: 'sceneflow',
          qualityTier: 'cinematic',
          segmentDuration: duration,
          totalMinutes: 2,
        },
      })
    )
    const standard = calculateDetailedProjectCost(
      mergeProjectParameters({
        scenes: baseScenes,
        video: {
          engine: 'sceneflow',
          qualityTier: 'standard',
          segmentDuration: duration,
          totalMinutes: 2,
        },
      })
    )

    const clipCount = 2 * 2 * 2
    const cinematicPerClip = getKlingCreditsForGeneration({ quality: 'pro', durationSeconds: duration })
    const standardPerClip = getKlingCreditsForGeneration({ quality: 'std', durationSeconds: duration })

    expect(cinematic.video.credits).toBe(clipCount * cinematicPerClip)
    expect(standard.video.credits).toBe(clipCount * standardPerClip)
    expect(cinematic.video.credits).toBeGreaterThan(standard.video.credits)
  })
})

describe('quick default budget from script-derived params', () => {
  it('returns a positive credit total for a sample script', () => {
    const scriptDerived = mergeProjectParameters({
      scenes: {
        count: 5,
        segmentsPerScene: 2,
        takesPerSegment: 2,
      },
      video: {
        engine: 'sceneflow',
        qualityTier: 'cinematic',
        segmentDuration: 8,
        totalMinutes: 3,
      },
      images: { keyFrames: 20 },
      audio: {
        totalMinutes: 3,
        dialogueLines: 12,
        soundEffects: 8,
        musicTracks: 2,
      },
    })

    const breakdown = calculateDetailedProjectCost(scriptDerived)
    expect(breakdown.total.credits).toBeGreaterThan(0)
    expect(breakdown.video.credits).toBeGreaterThan(0)
  })

  it('defaults to SceneFlow cinematic when using DEFAULT_PROJECT_PARAMS', () => {
    const breakdown = calculateDetailedProjectCost(DEFAULT_PROJECT_PARAMS)
    const snappedDuration = 7
    const perClip = getKlingCreditsForGeneration({ quality: 'pro', durationSeconds: snappedDuration })
    const clipCount =
      DEFAULT_PROJECT_PARAMS.scenes.count *
      DEFAULT_PROJECT_PARAMS.scenes.segmentsPerScene *
      DEFAULT_PROJECT_PARAMS.scenes.takesPerSegment

    expect(breakdown.video.credits).toBe(clipCount * perClip)
  })
})

describe('getVeoCostEstimate', () => {
  it('includes premium tier pricing', () => {
    expect(getVeoCostEstimate('premium', 10)).toBeCloseTo(4.0, 5)
    expect(getVeoCostEstimate('fast', 10)).toBeCloseTo(1.0, 5)
  })
})
