import { describe, it, expect } from 'vitest'
import {
  getSeededRateCardMap,
  REFERENCE_IMAGE_ADDON_CREDITS,
  type RateCardMap,
} from '@/lib/credits/quoteGenerationCredits'
import {
  estimateVideoClipCredits,
  estimateVideoClipQuote,
  normalizeVideoParameters,
} from '@/lib/credits/videoEnginePricing'
import {
  applyMethodDefaults,
  estimateProductionBudget,
  getFrameUnitCost,
  getVideoUnitCost,
} from '@/lib/credits/productionBudgetManager'
import {
  calculateDetailedProjectCost,
  compareStrategies,
  DEFAULT_PROJECT_PARAMS,
  mergeProjectParameters,
  recommendPlan,
} from '@/lib/credits/projectCalculator'
import { estimateBlueprintProjectCost } from '@/lib/credits/blueprintCostEstimator'
import { getAggregatorCreditsForModel } from '@/lib/aggregator/modelRegistry'
import { getUpscaleQueueInfo, UPSCALE_QUEUE } from '@/lib/credits/guardrails'
import { IMAGE_CREDITS, VIDEO_CREDITS } from '@/lib/credits/creditCosts'

function buildCustomRateCard(overrides: RateCardMap): RateCardMap {
  return {
    ...getSeededRateCardMap(),
    ...overrides,
  }
}

describe('Live Rate Card & Core Budget Calculators', () => {
  describe('videoEnginePricing live rate card & quote COGS', () => {
    it('updates estimateVideoClipCredits dynamically for Kling, Vertex Omni, Veo, and Aggregator', () => {
      const customRateCard = buildCustomRateCard({
        kling_omni_1080p_audio: { usdPerUnit: 0.25, markup: 2.0, source: 'published' },
        omni_1080p: { usdPerUnit: 0.30, markup: 2.0, source: 'published' },
        veo_fast: { usdPerUnit: 0.25, markup: 2.0, source: 'published' },
        'aggregator_wan-2.6': { usdPerUnit: 0.10, markup: 2.0, source: 'published' },
      })

      // Kling (sceneflow) 10s: $0.25/s * 10s = $2.50 -> 500 cr
      const klingBase = estimateVideoClipQuote(
        normalizeVideoParameters({ engine: 'sceneflow', qualityTier: 'cinematic', segmentDuration: 10 })
      )
      const klingLive = estimateVideoClipQuote(
        normalizeVideoParameters({ engine: 'sceneflow', qualityTier: 'cinematic', segmentDuration: 10 }),
        { rateCard: customRateCard, referenceImageCount: 2 }
      )
      expect(klingLive.creditsEach).toBe(500 + 2 * REFERENCE_IMAGE_ADDON_CREDITS)
      expect(klingLive.providerUsd).toBeCloseTo(2.5, 4)
      expect(klingLive.creditsEach).toBeGreaterThan(klingBase.creditsEach)

      // Vertex Omni 10s: $0.30/s * 10s = $3.00 -> 600 cr
      const omniLive = estimateVideoClipCredits(
        { engine: 'vertex_omni', qualityTier: 'cinematic', segmentDuration: 10, totalMinutes: 1, veoQuality: 'fast' },
        { rateCard: customRateCard }
      )
      expect(omniLive.creditsEach).toBe(600)
      expect(omniLive.providerUsd).toBeCloseTo(3.0, 4)

      // Veo Fast 8s: $0.25/s * 8s = $2.00 -> 400 cr
      const veoLive = estimateVideoClipCredits(
        { engine: 'veo', qualityTier: 'cinematic', segmentDuration: 8, totalMinutes: 1, veoQuality: 'fast' },
        { rateCard: customRateCard }
      )
      expect(veoLive.creditsEach).toBe(400)
      expect(veoLive.providerUsd).toBeCloseTo(2.0, 4)

      // Aggregator lowest-cost (wan-2.6) 10s: $0.10/s * 10s = $1.00 -> 200 cr
      const aggLive = estimateVideoClipCredits(
        normalizeVideoParameters({ engine: 'lowest-cost', segmentDuration: 10 }),
        { rateCard: customRateCard }
      )
      expect(aggLive.creditsEach).toBe(200)
      expect(aggLive.providerUsd).toBeCloseTo(1.0, 4)
    })

    it('threads audio=false and voiceControl=true into Kling quotes', () => {
      const video = normalizeVideoParameters({
        engine: 'sceneflow',
        qualityTier: 'cinematic',
        segmentDuration: 10,
      })
      const silent = estimateVideoClipCredits(video, { audio: false })
      const withAudio = estimateVideoClipCredits(video, { audio: true })
      const voiceCtrl = estimateVideoClipCredits(video, { audio: true, voiceControl: true })

      expect(silent.operation).toBe('kling_omni_1080p_silent')
      expect(withAudio.operation).toBe('kling_omni_1080p_audio')
      expect(voiceCtrl.operation).toBe('kling_omni_1080p_voice')
      expect(silent.creditsEach).toBeLessThan(withAudio.creditsEach)
      expect(voiceCtrl.creditsEach).toBeGreaterThan(withAudio.creditsEach)
    })
  })

  describe('getAggregatorCreditsForModel 10x bug regression check', () => {
    it('calculates wan-2.6 10s = 100 cr and runway-gen4 10s = 200 cr', () => {
      expect(getAggregatorCreditsForModel('wan-2.6', 10)).toBe(100)
      expect(getAggregatorCreditsForModel('runway-gen4', 10)).toBe(200)
    })
  })

  describe('productionBudgetManager live rate card, engine selection & optional audio/render', () => {
    it('updates frame and video unit costs dynamically from custom rateCard', () => {
      const customRateCard = buildCustomRateCard({
        gemini_still: { usdPerUnit: 0.20, markup: 2.0, source: 'published' },
        gemini_pro_still_2k: { usdPerUnit: 0.30, markup: 2.0, source: 'published' },
        omni_1080p: { usdPerUnit: 0.25, markup: 2.0, source: 'published' },
        kling_omni_1080p_audio: { usdPerUnit: 0.20, markup: 2.0, source: 'published' },
      })

      expect(getFrameUnitCost('draft', customRateCard)).toBe(40)
      expect(getFrameUnitCost('final', customRateCard)).toBe(60)
      expect(getVideoUnitCost('final', 10, { engine: 'vertex_omni', rateCard: customRateCard })).toBe(500)
      expect(
        getVideoUnitCost('final', 10, {
          engine: 'sceneflow',
          referenceImageCount: 2,
          rateCard: customRateCard,
        })
      ).toBe(400 + 2 * REFERENCE_IMAGE_ADDON_CREDITS)

      const baseBudget = estimateProductionBudget({
        scenes: 3,
        beats: 10,
        segmentDurationSec: 10,
        method: 'final_delivery',
        ...applyMethodDefaults('final_delivery'),
      })
      const liveBudget = estimateProductionBudget({
        scenes: 3,
        beats: 10,
        segmentDurationSec: 10,
        method: 'final_delivery',
        ...applyMethodDefaults('final_delivery'),
        rateCard: customRateCard,
        avgReferenceImages: 2,
      })

      expect(liveBudget.frames.credits).toBeGreaterThan(baseBudget.frames.credits)
      expect(liveBudget.videos.credits).toBeGreaterThan(baseBudget.videos.credits)
      expect(liveBudget.plannedTotal).toBeGreaterThan(baseBudget.plannedTotal)
    })

    it('includes optional Audio (TTS + Lyria + Veo Lite SFX) and Render lines when provided', () => {
      const withoutAudio = estimateProductionBudget({
        scenes: 2,
        beats: 6,
        segmentDurationSec: 10,
        method: 'animatic_first',
        ...applyMethodDefaults('animatic_first'),
      })
      const withAudioAndRender = estimateProductionBudget({
        scenes: 2,
        beats: 6,
        segmentDurationSec: 10,
        method: 'animatic_first',
        ...applyMethodDefaults('animatic_first'),
        ttsMinutes: 3,
        musicTracks: 2,
        soundEffects: 4,
        renderMinutes: 3,
      })

      expect(withoutAudio.audio).toBeUndefined()
      expect(withoutAudio.render).toBeUndefined()
      expect(withAudioAndRender.audio?.credits).toBeGreaterThanOrEqual(
        3 * 10 + 2 * 25 + 4 * VIDEO_CREDITS.VEO_LITE
      )
      expect(withAudioAndRender.render?.credits).toBe(3 * 10 + 10)
      expect(withAudioAndRender.plannedTotal).toBe(
        withoutAudio.plannedTotal +
          (withAudioAndRender.audio?.credits ?? 0) +
          (withAudioAndRender.render?.credits ?? 0)
      )
    })
  })

  describe('projectCalculator fixes (TTS deduplication, Veo Lite SFX, Topaz, dynamic COGS, tiers)', () => {
    it('does not double-count TTS across audio.totalMinutes, voice.voiceMinutes, and dialogueLines', () => {
      const params = mergeProjectParameters({
        audio: {
          totalMinutes: 4,
          dialogueLines: 50,
          soundEffects: 0,
          musicTracks: 0,
        },
        voice: {
          voiceClones: 0,
          voiceMinutes: 4,
        },
      })

      const elevenLabs = calculateDetailedProjectCost(params, { ttsProvider: 'elevenlabs' })
      const gemini = calculateDetailedProjectCost(params, { ttsProvider: 'gemini' })

      // 4 minutes counted ONCE (not 4*320 + 4*320 + 50*5 = 2810!)
      expect(elevenLabs.audio.credits).toBe(4 * 80)
      expect(elevenLabs.voiceClones.credits).toBe(0)
      expect(gemini.audio.credits).toBe(4 * 10)
      expect(gemini.voiceClones.credits).toBe(0)

      // Falls back to dialogueLines estimate when minutes are both 0 (25 lines * 80 chars = 2k chars = 2 min)
      const fromLinesOnly = calculateDetailedProjectCost(
        mergeProjectParameters({
          audio: { totalMinutes: 0, dialogueLines: 25, soundEffects: 0, musicTracks: 0 },
          voice: { voiceClones: 0, voiceMinutes: 0 },
        }),
        { ttsProvider: 'gemini' }
      )
      expect(fromLinesOnly.audio.credits).toBe(2 * 10)
    })

    it('quotes SFX at live veo_lite_sfx rate (>= 75 cr floor)', () => {
      const params = mergeProjectParameters({
        audio: { totalMinutes: 0, dialogueLines: 0, soundEffects: 5, musicTracks: 0 },
        voice: { voiceClones: 0, voiceMinutes: 0 },
      })

      const seeded = calculateDetailedProjectCost(params)
      expect(seeded.audio.credits).toBeGreaterThanOrEqual(5 * VIDEO_CREDITS.VEO_LITE)
      // Seeded veo_lite_sfx is $0.40 * 2 / 0.01 = 80 cr
      expect(seeded.audio.credits).toBe(5 * 80)

      const customRateCard = buildCustomRateCard({
        veo_lite_sfx: { usdPerUnit: 0.60, markup: 2.0, source: 'published' },
      })
      const live = calculateDetailedProjectCost(params, { rateCard: customRateCard })
      expect(live.audio.credits).toBe(5 * 120)
    })

    it('quotes Topaz upscale at 50 cr/min standard and 100 cr/min (2x) instant, matching guardrails', () => {
      expect(UPSCALE_QUEUE.INSTANT_MULTIPLIER).toBe(2)
      expect(getUpscaleQueueInfo('pro', 5, 4).instantCreditCost).toBe(4 * 50 * 2)

      const standard = calculateDetailedProjectCost(
        mergeProjectParameters({ upscale: { upscaleMinutes: 4, useInstant: false } })
      )
      const instant = calculateDetailedProjectCost(
        mergeProjectParameters({ upscale: { upscaleMinutes: 4, useInstant: true } })
      )

      expect(standard.upscale.credits).toBe(200)
      expect(instant.upscale.credits).toBe(400)
    })

    it('computes dynamic provider COGS from live rateCard instead of hardcoded $0.75/take', () => {
      const lowRateCard = buildCustomRateCard({
        kling_omni_1080p_audio: { usdPerUnit: 0.10, markup: 2.0, source: 'published' },
        gemini_still: { usdPerUnit: 0.05, markup: 2.0, source: 'published' },
      })
      const highRateCard = buildCustomRateCard({
        kling_omni_1080p_audio: { usdPerUnit: 0.30, markup: 2.0, source: 'published' },
        gemini_still: { usdPerUnit: 0.20, markup: 2.0, source: 'published' },
      })

      const lowCost = calculateDetailedProjectCost(DEFAULT_PROJECT_PARAMS, {
        rateCard: lowRateCard,
      })
      const highCost = calculateDetailedProjectCost(DEFAULT_PROJECT_PARAMS, {
        rateCard: highRateCard,
      })

      expect(highCost.total.credits).toBeGreaterThan(lowCost.total.credits)
      expect(highCost.marginAnalysis!.providerCosts).toBeGreaterThan(
        lowCost.marginAnalysis!.providerCosts
      )
    })

    it('returns valid name and price for all canonical tiers in compareStrategies and recommendPlan', () => {
      const small = mergeProjectParameters({
        scenes: { count: 2, segmentsPerScene: 1, takesPerSegment: 1 },
        video: { engine: 'lowest-cost', segmentDuration: 5, totalMinutes: 1 },
        images: { keyFrames: 2, retakesPerFrame: 0, finalImages: 1, characterHeadshots: 1 },
        audio: { totalMinutes: 1, dialogueLines: 5, soundEffects: 0, musicTracks: 1 },
        voice: { voiceClones: 0, voiceMinutes: 1 },
        storage: { expectedStorageGB: 2, activeMonths: 1 },
      })
      const large = mergeProjectParameters({
        scenes: { count: 80, segmentsPerScene: 4, takesPerSegment: 2 },
        video: { engine: 'sceneflow', qualityTier: 'cinematic', segmentDuration: 10, totalMinutes: 30 },
        voice: { voiceClones: 10, voiceMinutes: 30 },
        storage: { expectedStorageGB: 200, activeMonths: 3 },
      })

      for (const sample of [small, DEFAULT_PROJECT_PARAMS, large]) {
        const comparison = compareStrategies(sample)
        expect(comparison.subscriptions.map((s) => s.tier)).toEqual([
          'explorer',
          'hobbyist',
          'starter',
          'pro',
          'studio',
        ])
        for (const sub of comparison.subscriptions) {
          expect(typeof sub.tierName).toBe('string')
          expect(sub.tierName.length).toBeGreaterThan(0)
          expect(typeof sub.monthlyPrice).toBe('number')
          expect(sub.monthlyPrice).toBeGreaterThan(0)
          expect(sub.warnings.some((w) => w.includes('undefined') || w.includes('NaN'))).toBe(false)
        }

        const rec = recommendPlan(sample)
        expect(typeof rec.name).toBe('string')
        expect(rec.name.length).toBeGreaterThan(0)
        expect(typeof rec.price).toBe('number')
        expect(rec.price).toBeGreaterThan(0)
        expect(rec.monthlyCost).toBeGreaterThan(0)
      }
    })
  })

  describe('blueprintCostEstimator live rate card, role-specific refs & realistic audio', () => {
    const sampleTreatment = {
      title: 'Coastal Chronicle',
      estimatedDurationMinutes: 2,
      character_descriptions: [{ name: 'Maya' }],
      scene_descriptions: [{ name: 'Lighthouse' }],
      prop_descriptions: [{ name: 'Brass Compass' }],
      beats: [
        { title: 'Arrival', minutes: 1, deliveryFormat: 'ai_reenactment' },
        { title: 'Storm', minutes: 1, deliveryFormat: 'ai_reenactment' },
      ],
    }

    it('prices cast/location/prop references by role and responds dynamically to custom rateCard', () => {
      const base = estimateBlueprintProjectCost({
        treatment: sampleTreatment,
        options: { productionMode: 'full_ai_video', retakeMultiplier: 1.0 },
      })

      // Cast (45) + Location (30) + Prop (14 seeded Flash Image) = 89 cr at 1.0x
      expect(base.categories.continuityReferenceCredits).toBe(
        IMAGE_CREDITS.CHARACTER_IDENTITY_WITH_ENHANCE + IMAGE_CREDITS.SCENE_REFERENCE + 14
      )
      // Realistic audio: 2 scenes with TTS (>=10) + Lyria music (25) + Veo Lite SFX (80) + render (15)
      expect(base.categories.audioAndRenderCredits).toBeGreaterThanOrEqual(2 * (10 + 25 + 75 + 15))

      const customRateCard = buildCustomRateCard({
        kling_omni_1080p_audio: { usdPerUnit: 0.30, markup: 2.0, source: 'published' },
        veo_lite_sfx: { usdPerUnit: 0.70, markup: 2.0, source: 'published' },
        gemini_still: { usdPerUnit: 0.15, markup: 2.0, source: 'published' },
      })
      const live = estimateBlueprintProjectCost({
        treatment: sampleTreatment,
        rateCard: customRateCard,
        options: { productionMode: 'full_ai_video', retakeMultiplier: 1.0 },
      })

      expect(live.categories.videoGenerationCredits).toBeGreaterThan(
        base.categories.videoGenerationCredits
      )
      expect(live.categories.audioAndRenderCredits).toBeGreaterThan(
        base.categories.audioAndRenderCredits
      )
      expect(live.categories.keyframeStillCredits).toBeGreaterThan(
        base.categories.keyframeStillCredits
      )
      expect(live.totalEstimatedCredits).toBeGreaterThan(base.totalEstimatedCredits)
    })
  })
})
