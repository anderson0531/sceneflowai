import { describe, it, expect } from 'vitest'
import { calculateBlueprintProgress } from '@/lib/blueprint/blueprintProgress'

describe('calculateBlueprintProgress', () => {
  it('starts on generate when no blueprint exists', () => {
    const result = calculateBlueprintProgress({
      hasBlueprint: false,
      isGenerating: false,
      hasConceptInput: false,
      audienceDefinition: null,
      savedBlueprintAR: null,
      shareUrl: null,
    })
    expect(result.currentStep).toBe('generate')
    expect(result.guideStatus['generate-blueprint']).toBe('pending')
  })

  it('marks AR complete when analysis exists', () => {
    const result = calculateBlueprintProgress({
      hasBlueprint: true,
      isGenerating: false,
      hasConceptInput: true,
      audienceDefinition: {
        profile: { region: 'US', ageRange: '25-34', gender: 'all', educationLevel: 'college', community: 'general' },
        updatedAt: '2026-01-01T00:00:00.000Z',
        source: 'blueprint',
      },
      savedBlueprintAR: {
        analysis: {
          overallScore: 85,
          isReadyForProduction: true,
          deductions: [],
          recommendations: [],
          categories: [],
          strengths: [],
          improvements: [],
          summary: 'Strong',
          audienceDefinition: {
            profile: { region: 'US', ageRange: '25-34', gender: 'all', educationLevel: 'college', community: 'general' },
            updatedAt: '2026-01-01T00:00:00.000Z',
            source: 'blueprint',
          },
          generatedAt: '2026-01-01T00:00:00.000Z',
        },
        audienceDefinition: {
          profile: { region: 'US', ageRange: '25-34', gender: 'all', educationLevel: 'college', community: 'general' },
          updatedAt: '2026-01-01T00:00:00.000Z',
          source: 'blueprint',
        },
        appliedRecommendationIds: [],
        iterationCount: 1,
      },
      shareUrl: null,
    })
    expect(result.isAtTarget).toBe(true)
    expect(result.guideStatus['run-resonance']).toBe('complete')
  })
})
