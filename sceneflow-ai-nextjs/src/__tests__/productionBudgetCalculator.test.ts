import { describe, it, expect } from 'vitest'
import {
  calculateDetailedProjectCost,
  DEFAULT_PROJECT_PARAMS,
  mergeProjectParameters,
} from '@/lib/credits/projectCalculator'
import { IMAGE_CREDITS, TEXT_CREDITS, BLUEPRINT_CREDITS } from '@/lib/credits/creditCosts'
import { estimateVideoClipCredits, normalizeVideoParameters } from '@/lib/credits/videoEnginePricing'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('Production Budget Management calculator', () => {
  it('includes intelligence charges from TEXT/BLUEPRINT tables', () => {
    const breakdown = calculateDetailedProjectCost({
      ...DEFAULT_PROJECT_PARAMS,
      scenes: { count: 10, segmentsPerScene: 2, takesPerSegment: 1 },
      intelligence: {
        audienceResonanceAnalyses: 1,
        blueprintOptimizations: 1,
        blueprintRefines: 1,
      },
    })

    expect(breakdown.intelligence.credits).toBe(
      BLUEPRINT_CREDITS.AUDIENCE_RESONANCE_ANALYSIS +
        10 * TEXT_CREDITS.SCRIPT_PER_SCENE +
        BLUEPRINT_CREDITS.BLUEPRINT_OPTIMIZE +
        BLUEPRINT_CREDITS.BLUEPRINT_REFINE
    )
    expect(breakdown.intelligence.items.some((i) => i.name.includes('Audience Resonance'))).toBe(
      true
    )
  })

  it('prices images by draft / final / headshot production rates', () => {
    const breakdown = calculateDetailedProjectCost({
      ...DEFAULT_PROJECT_PARAMS,
      images: {
        keyFrames: 10,
        retakesPerFrame: 1,
        finalImages: 5,
        characterHeadshots: 3,
      },
    })

    const draftQty = 10 * (1 + 1)
    const expected =
      draftQty * IMAGE_CREDITS.FRAME_GENERATION +
      5 * IMAGE_CREDITS.FAL_KLING_IMAGE +
      3 * IMAGE_CREDITS.SCENE_CHARACTER_HEADSHOT

    expect(breakdown.images.credits).toBe(expected)
    expect(breakdown.images.items.map((i) => i.creditsEach)).toEqual([
      IMAGE_CREDITS.FRAME_GENERATION,
      IMAGE_CREDITS.FAL_KLING_IMAGE,
      IMAGE_CREDITS.SCENE_CHARACTER_HEADSHOT,
    ])
  })

  it('prices video clips with estimateVideoClipCredits', () => {
    const params = mergeProjectParameters({
      scenes: { count: 2, segmentsPerScene: 2, takesPerSegment: 2 },
      video: {
        engine: 'sceneflow',
        qualityTier: 'cinematic',
        segmentDuration: 8,
        totalMinutes: 2,
      },
    })
    const clip = estimateVideoClipCredits(normalizeVideoParameters(params.video))
    const breakdown = calculateDetailedProjectCost(params)
    const takes = 2 * 2 * 2
    expect(breakdown.video.credits).toBe(takes * clip.creditsEach)
    expect(breakdown.video.items[0]?.creditsEach).toBe(clip.creditsEach)
  })

  it('BYOK exclude-media zeros image and video but keeps intelligence and audio', () => {
    const full = calculateDetailedProjectCost(DEFAULT_PROJECT_PARAMS)
    const byok = calculateDetailedProjectCost(DEFAULT_PROJECT_PARAMS, {
      byokExcludeMedia: true,
    })

    expect(byok.images.credits).toBe(0)
    expect(byok.video.credits).toBe(0)
    expect(byok.images.excluded).toBe(true)
    expect(byok.video.excluded).toBe(true)
    expect(byok.images.preExclusionCredits).toBe(full.images.credits)
    expect(byok.video.preExclusionCredits).toBe(full.video.credits)
    expect(byok.intelligence.credits).toBe(full.intelligence.credits)
    expect(byok.audio.credits).toBe(full.audio.credits)
    expect(byok.total.credits).toBeLessThan(full.total.credits)
    expect(byok.total.credits).toBe(
      full.total.credits - full.images.credits - full.video.credits
    )
  })

  it('UI strings use Production Budget Management on calculator; Studio uses Manager', () => {
    const calc = readFileSync(
      join(process.cwd(), 'src/components/credits/ProjectCostCalculator.tsx'),
      'utf8'
    )
    const panel = readFileSync(
      join(process.cwd(), 'src/components/vision/ScriptPanel.tsx'),
      'utf8'
    )
    const manager = readFileSync(
      join(process.cwd(), 'src/components/credits/ProductionBudgetManager.tsx'),
      'utf8'
    )
    expect(calc).toContain("useTranslations('production.budget')")
    expect(calc).toContain("t('byokTitle')")
    expect(panel).toContain('ProductionBudgetManager')
    expect(manager).toContain("useTranslations('production.budgetManager')")
  })
})
