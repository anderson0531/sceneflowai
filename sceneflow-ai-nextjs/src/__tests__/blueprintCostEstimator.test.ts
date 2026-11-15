import { describe, it, expect } from 'vitest'
import {
  deriveHybridVideoShareFromBeats,
  estimateBlueprintMarginSummary,
  estimateBlueprintProjectCost,
} from '@/lib/credits/blueprintCostEstimator'

describe('Blueprint Room Cost & Margin Estimator (1 Beat = 1 Production Chapter)', () => {
  const sampleTreatment = {
    title: 'Harbor Books: 50 Years',
    synopsis: 'Arthur and Clara founded Harbor Books in Seattle in 1974.',
    estimatedDurationMinutes: 3,
    character_descriptions: [
      { name: 'Arthur Vance (Age 28)', role: 'Co-founder' },
      { name: 'Clara Vance (Age 26)', role: 'Co-founder' },
    ],
    scene_descriptions: [{ name: 'Harbor Books Storefront', description: 'Brick shop' }],
    prop_descriptions: [{ name: 'Brass Cash Register', description: '1974 register' }],
    beats: [
      {
        title: 'Opening Morning (1974)',
        minutes: 1,
        synopsis: 'Unlocking the doors on a rainy Seattle morning.',
        deliveryFormat: 'archival_photo',
      },
      {
        title: 'Surviving the Storm (1989)',
        minutes: 1,
        synopsis: 'Neighbors rally to save the shop after a winter flood.',
        deliveryFormat: 'ai_reenactment',
      },
      {
        title: 'Passing the Keys (2024)',
        minutes: 1,
        synopsis: 'Elena steps behind the counter for the 50th anniversary.',
        deliveryFormat: 'ai_reenactment',
        imageUrl: 'https://blob.vercel-storage.com/beat-3.png',
      },
    ],
  }

  it('maps 1 Blueprint Beat to 1 Production Chapter with 8s shot decomposition', () => {
    const estimate = estimateBlueprintProjectCost({
      treatment: sampleTreatment,
      options: {
        productionMode: 'full_ai_video',
        retakeMultiplier: 1.0,
      },
    })

    expect(estimate.summary.chapterCount).toBe(3)
    expect(estimate.chapters).toHaveLength(3)
    expect(estimate.summary.totalMinutes).toBe(3)
    // 180s / 8s AVG_BEAT_SECONDS = 24 shots (3 chapters * round(60/8)=8 => 24 shots)
    expect(estimate.summary.totalShots).toBe(24)
    expect(estimate.summary.ungeneratedReferences).toEqual({
      cast: 2,
      locations: 1,
      props: 1,
      total: 4,
    })
    // Beat 3 already has imageUrl, so only 2 unillustrated chapters remain
    expect(estimate.chapters.filter((c) => !c.hasStoryboardStill)).toHaveLength(2)
  })

  it('excludes already-generated Continuity references when visionPhase has portraits', () => {
    const withoutRefs = estimateBlueprintProjectCost({
      treatment: sampleTreatment,
      options: { retakeMultiplier: 1.0 },
    })

    const withRefs = estimateBlueprintProjectCost({
      treatment: sampleTreatment,
      visionPhase: {
        characters: [
          { name: 'Arthur Vance (Age 28)', referenceImage: 'https://example.com/arthur.png' },
          { name: 'Clara Vance (Age 26)', referenceImage: 'https://example.com/clara.png' },
        ],
        references: {
          locationReferences: [
            { name: 'Harbor Books Storefront', imageUrl: 'https://example.com/shop.png' },
          ],
          objectReferences: [
            { name: 'Brass Cash Register', imageUrl: 'https://example.com/register.png' },
          ],
        },
      },
      options: { retakeMultiplier: 1.0 },
    })

    expect(withRefs.summary.ungeneratedReferences).toEqual({
      cast: 0,
      locations: 0,
      props: 0,
      total: 0,
    })
    expect(withRefs.categories.continuityReferenceCredits).toBe(0)
    expect(withRefs.totalEstimatedCredits).toBeLessThan(withoutRefs.totalEstimatedCredits)
  })

  it('derives hybridVideoShare from beat deliveryFormat tags and lowers cost vs full AI video', () => {
    const derived = deriveHybridVideoShareFromBeats(sampleTreatment)
    // 2 of 3 beats are ai_reenactment, 1 is archival_photo -> 0.67
    expect(derived.hasArchivalBeats).toBe(true)
    expect(derived.share).toBeCloseTo(0.67, 2)

    const fullAi = estimateBlueprintProjectCost({
      treatment: sampleTreatment,
      options: { productionMode: 'full_ai_video', retakeMultiplier: 1.0 },
    })
    const hybrid = estimateBlueprintProjectCost({
      treatment: sampleTreatment,
      options: { productionMode: 'hybrid', retakeMultiplier: 1.0 },
    })
    const animatic = estimateBlueprintProjectCost({
      treatment: sampleTreatment,
      options: { productionMode: 'animatic_only', retakeMultiplier: 1.0 },
    })

    expect(animatic.categories.videoGenerationCredits).toBe(0)
    expect(hybrid.categories.videoGenerationCredits).toBeGreaterThan(0)
    expect(hybrid.categories.videoGenerationCredits).toBeLessThan(
      fullAi.categories.videoGenerationCredits
    )
    expect(animatic.totalEstimatedCredits).toBeLessThan(hybrid.totalEstimatedCredits)
    expect(hybrid.totalEstimatedCredits).toBeLessThan(fullAi.totalEstimatedCredits)
  })

  it('applies 20% BYOK platform fee to media categories and tracks Creator target budget variance', () => {
    const probeStandard = estimateBlueprintProjectCost({
      treatment: sampleTreatment,
      options: { productionMode: 'full_ai_video', byokExcludeMedia: false },
    })
    const probeByok = estimateBlueprintProjectCost({
      treatment: sampleTreatment,
      options: { productionMode: 'full_ai_video', byokExcludeMedia: true },
    })
    const midpointTarget = Math.round(
      (probeStandard.totalEstimatedCredits + probeByok.totalEstimatedCredits) / 2
    )

    const standard = estimateBlueprintProjectCost({
      treatment: sampleTreatment,
      options: {
        productionMode: 'full_ai_video',
        byokExcludeMedia: false,
        targetBudgetCredits: midpointTarget,
      },
    })
    const byok = estimateBlueprintProjectCost({
      treatment: sampleTreatment,
      options: {
        productionMode: 'full_ai_video',
        byokExcludeMedia: true,
        targetBudgetCredits: midpointTarget,
      },
    })

    expect(byok.totalEstimatedCredits).toBeLessThan(standard.totalEstimatedCredits)
    expect(standard.budgetVariance?.withinBudget).toBe(false)
    expect(standard.budgetVariance?.deltaCredits).toBeLessThan(0)
    expect(byok.budgetVariance?.withinBudget).toBe(true)
    expect(byok.budgetVariance?.deltaCredits).toBeGreaterThan(0)
  })

  it('calculates Service Provider COGS, revision buffer, and gross margin against client quote', () => {
    const estimate = estimateBlueprintProjectCost({
      treatment: sampleTreatment,
      sunkCreditsUsed: 15,
      options: { productionMode: 'hybrid', retakeMultiplier: 1.2 },
    })

    expect(estimate.categories.sunkBlueprintCredits).toBe(15)

    const margin = estimateBlueprintMarginSummary({
      estimate,
      clientPriceUsd: 350,
      includedRevisionRounds: 2,
    })

    expect(margin.recommendedCreditCeiling).toBeGreaterThan(estimate.totalEstimatedCredits)
    expect(margin.sceneFlowCogsUsd).toBeCloseTo(margin.recommendedCreditCeiling / 100, 2)
    expect(margin.providerGrossProfitUsd).toBeGreaterThan(200)
    expect(margin.providerGrossMarginPercent).toBeGreaterThanOrEqual(55)
    expect(margin.healthyMargin).toBe(true)
  })
})
