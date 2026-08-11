import { describe, it, expect } from 'vitest'
import {
  BLUEPRINT_CREDITS,
  IMAGE_CREDITS,
  TEXT_CREDITS,
  VIDEO_CREDITS,
  getKlingCreditsForGeneration,
} from '@/lib/credits/creditCosts'
import {
  applyMethodDefaults,
  buildProductionBudgetParams,
  DEFAULT_FRAME_ITERATIONS,
  DEFAULT_VIDEO_ITERATIONS,
  estimateProductionBudget,
  getFrameUnitCost,
  getVideoUnitCost,
  intelligencePackageCredits,
  PRODUCTION_METHODS,
  readProjectBudgetScope,
} from '@/lib/credits/productionBudgetManager'

describe('Production Budget Manager engine', () => {
  it('uses Draft/Final frame rates from IMAGE_CREDITS', () => {
    expect(getFrameUnitCost('draft')).toBe(IMAGE_CREDITS.FRAME_GENERATION)
    expect(getFrameUnitCost('final')).toBe(IMAGE_CREDITS.FAL_KLING_IMAGE)
  })

  it('prices video Draft/Final with Kling std/pro proxy by duration', () => {
    expect(getVideoUnitCost('none', 10)).toBe(0)
    expect(getVideoUnitCost('draft', 10)).toBe(
      getKlingCreditsForGeneration({ quality: 'std', durationSeconds: 10 })
    )
    expect(getVideoUnitCost('final', 10)).toBe(
      getKlingCreditsForGeneration({ quality: 'pro', durationSeconds: 10 })
    )
  })

  it('applies Animatic First defaults with zero video', () => {
    const defaults = applyMethodDefaults('animatic_first')
    expect(defaults.videoQuality).toBe('none')
    expect(defaults.frameIterations).toBe(DEFAULT_FRAME_ITERATIONS)
    expect(defaults.videoIterations).toBe(0)

    const estimate = estimateProductionBudget({
      scenes: 4,
      beats: 20,
      segmentDurationSec: 10,
      method: 'animatic_first',
      ...defaults,
    })

    expect(estimate.videos.credits).toBe(0)
    expect(estimate.frames.credits).toBe(
      Math.round(20 * DEFAULT_FRAME_ITERATIONS * IMAGE_CREDITS.FRAME_GENERATION)
    )
    expect(estimate.intelligence.credits).toBe(intelligencePackageCredits(4))
    expect(estimate.plannedTotal).toBe(
      estimate.frames.credits + estimate.intelligence.credits
    )
  })

  it('matches first-take iteration defaults', () => {
    expect(DEFAULT_FRAME_ITERATIONS).toBeCloseTo(1.25, 5)
    expect(DEFAULT_VIDEO_ITERATIONS).toBeCloseTo(1 / 0.9, 5)
    expect(PRODUCTION_METHODS.express_sprint.frameIterations).toBe(1.35)
    expect(PRODUCTION_METHODS.express_sprint.videoIterations).toBe(1.2)
  })

  it('BYOK zeros frames/video/topaz but keeps intelligence', () => {
    const full = estimateProductionBudget({
      scenes: 5,
      beats: 10,
      segmentDurationSec: 8,
      method: 'final_delivery',
      ...applyMethodDefaults('final_delivery'),
    })
    const byok = estimateProductionBudget({
      scenes: 5,
      beats: 10,
      segmentDurationSec: 8,
      method: 'final_delivery',
      ...applyMethodDefaults('final_delivery'),
      byokExcludeMedia: true,
    })

    expect(byok.frames.credits).toBe(0)
    expect(byok.videos.credits).toBe(0)
    expect(byok.topaz.credits).toBe(0)
    expect(byok.intelligence.credits).toBe(full.intelligence.credits)
    expect(byok.plannedTotal).toBe(full.intelligence.credits)
  })

  it('intelligence package matches AR + script + optimize + refine', () => {
    expect(intelligencePackageCredits(10)).toBe(
      BLUEPRINT_CREDITS.AUDIENCE_RESONANCE_ANALYSIS +
        10 * TEXT_CREDITS.SCRIPT_PER_SCENE +
        BLUEPRINT_CREDITS.BLUEPRINT_OPTIMIZE +
        BLUEPRINT_CREDITS.BLUEPRINT_REFINE
    )
  })

  it('forecasts cost to complete from actuals and blends video takes', () => {
    const estimate = estimateProductionBudget({
      scenes: 2,
      beats: 10,
      segmentDurationSec: 10,
      method: 'draft_production',
      ...applyMethodDefaults('draft_production'),
      videoIterations: 2,
      creditsUsed: 500,
      framesDone: 4,
      videosDone: 3,
      observedVideoTakesAvg: 2,
      creditsBudget: 8000,
    })

    expect(estimate.remainingFrames).toBe(6)
    expect(estimate.remainingVideos).toBe(7)
    expect(estimate.effectiveVideoIterations).toBe(2)
    expect(estimate.costToComplete).toBeGreaterThan(0)
    expect(estimate.forecastTotal).toBe(500 + estimate.costToComplete)
    expect(estimate.suggestions).toContain('lower_video_iterations')
  })

  it('suggests Animatic First when video not started on a video plan', () => {
    const estimate = estimateProductionBudget({
      scenes: 2,
      beats: 8,
      segmentDurationSec: 10,
      method: 'draft_production',
      ...applyMethodDefaults('draft_production'),
      videosDone: 0,
    })
    expect(estimate.suggestions).toContain('use_animatic_first')
  })

  it('builds v2 budget params with SceneFlow engine mapping', () => {
    const params = buildProductionBudgetParams({
      method: 'final_delivery',
      frameQuality: 'final',
      videoQuality: 'final',
      frameIterations: 1.25,
      videoIterations: 1.11,
      topazEnabled: true,
      intelligenceEnabled: true,
      byokExcludeMedia: false,
      segmentDurationSec: 10,
    })
    expect(params.version).toBe(2)
    expect(params.engine).toBe('sceneflow')
    expect(params.qualityTier).toBe('cinematic')
    expect(params.frameQuality).toBe('final')
    expect(VIDEO_CREDITS.TOPAZ_UPSCALE_PER_MIN).toBe(50)
  })

  it('reads fixed scene/beat counts from script beats', () => {
    const scope = readProjectBudgetScope({
      script: {
        scenes: [
          {
            id: 's1',
            beats: [
              { beatId: 'b1', sequenceIndex: 0, kind: 'action', storyboardImageUrl: 'x' },
              { beatId: 'b2', sequenceIndex: 1, kind: 'action', excluded: true },
              { beatId: 'b3', sequenceIndex: 2, kind: 'dialogue' },
            ],
          },
          {
            id: 's2',
            beats: [{ beatId: 'b4', sequenceIndex: 0, kind: 'action' }],
          },
        ],
      },
      metadata: {
        creditsUsed: 120,
        visionPhase: {
          production: {
            scenes: {
              s1: {
                targetSegmentDuration: 7,
                segments: [
                  {
                    takes: [{ assetUrl: 'v1' }, { assetUrl: 'v2' }],
                    activeAssetUrl: 'v2',
                    assetType: 'video',
                  },
                ],
              },
            },
          },
        },
      },
    })

    expect(scope.scenes).toBe(2)
    expect(scope.beats).toBe(3)
    expect(scope.framesDone).toBe(1)
    expect(scope.videosDone).toBe(1)
    expect(scope.observedVideoTakesAvg).toBe(2)
    expect(scope.creditsUsed).toBe(120)
    expect(scope.segmentDurationSec).toBe(7)
  })
})
