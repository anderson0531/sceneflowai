import { describe, it, expect } from 'vitest'
import { buildBlueprintARNarrationText } from '@/lib/blueprint/arNarrationText'
import type { BlueprintAudienceResonanceAnalysis } from '@/lib/types/audienceResonance'
import { createAudienceDefinition } from '@/lib/types/audienceResonance'
import { AUDIENCE_PRESETS } from '@/lib/constants/audience-presets'

const baseAnalysis: BlueprintAudienceResonanceAnalysis = {
  version: 3,
  treatmentId: 'v1',
  overallScore: 72,
  baseScore: 100,
  deductions: [
    { reason: 'Weak midpoint', points: 8, category: 'Clarity & Structure' },
  ],
  recommendations: [
    {
      id: 'rec-1',
      text: 'Strengthen the antagonist motivation in act two.',
      title: 'Antagonist clarity',
      priority: 'high',
      pointsDeducted: 10,
      fixSection: 'story',
    },
  ],
  categories: [
    { name: 'Audience Appeal', score: 78, weight: 25 },
    { name: 'Genre & Tone Fit', score: 65, weight: 20 },
  ],
  strengths: ['Strong opening hook'],
  improvements: [],
  summary: 'Solid concept with pacing gaps.',
  audienceDefinition: createAudienceDefinition({ profile: AUDIENCE_PRESETS[0].profile }),
  isReadyForProduction: false,
  generatedAt: new Date().toISOString(),
  creditsUsed: 20,
}

describe('buildBlueprintARNarrationText', () => {
  it('includes score, breakdown, and recommendations when analysis exists', () => {
    const text = buildBlueprintARNarrationText({ analysis: baseAnalysis })
    expect(text).toContain('Overall score: 72')
    expect(text).toContain('Category scores')
    expect(text).toContain('Audience Appeal, score 78')
    expect(text).toContain('Score breakdown from 100')
    expect(text).toContain('Weak midpoint')
    expect(text).toContain('Recommendations')
    expect(text).toContain('Antagonist clarity')
    expect(text).toContain('Solid concept with pacing gaps')
  })

  it('omits applied recommendations', () => {
    const text = buildBlueprintARNarrationText({
      analysis: baseAnalysis,
      appliedRecommendationIds: ['rec-1'],
    })
    expect(text).not.toContain('Antagonist clarity')
  })

  it('falls back to treatment when no analysis', () => {
    const text = buildBlueprintARNarrationText({
      analysis: null,
      treatment: { logline: 'A hero rises', synopsis: 'Epic journey.' },
    })
    expect(text).toContain('A hero rises')
    expect(text).toContain('Epic journey')
  })
})
