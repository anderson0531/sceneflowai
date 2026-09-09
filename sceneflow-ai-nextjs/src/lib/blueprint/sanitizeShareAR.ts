import type {
  BlueprintAudienceResonanceAnalysis,
  PersistedBlueprintAudienceResonance,
} from '@/lib/types/audienceResonance'

export type SharedBlueprintARSnapshot = {
  analysis: Pick<
    BlueprintAudienceResonanceAnalysis,
    | 'version'
    | 'overallScore'
    | 'summary'
    | 'categories'
    | 'strengths'
    | 'improvements'
    | 'recommendations'
    | 'isReadyForProduction'
    | 'generatedAt'
    | 'audienceDefinition'
  > | null
  appliedRecommendationIds: string[]
}

export function sanitizeBlueprintARForShare(
  persisted: PersistedBlueprintAudienceResonance | null | undefined
): SharedBlueprintARSnapshot | null {
  if (!persisted) return null
  const analysis = persisted.analysis
  if (!analysis) {
    return {
      analysis: null,
      appliedRecommendationIds: persisted.appliedRecommendationIds || [],
    }
  }
  return {
    analysis: {
      version: analysis.version,
      overallScore: analysis.overallScore,
      summary: analysis.summary,
      categories: analysis.categories,
      strengths: analysis.strengths,
      improvements: analysis.improvements,
      recommendations: analysis.recommendations,
      isReadyForProduction: analysis.isReadyForProduction,
      generatedAt: analysis.generatedAt,
      audienceDefinition: analysis.audienceDefinition,
    },
    appliedRecommendationIds: persisted.appliedRecommendationIds || [],
  }
}
