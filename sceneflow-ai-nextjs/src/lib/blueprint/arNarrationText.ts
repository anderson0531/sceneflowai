import {
  READY_FOR_PRODUCTION_THRESHOLD_V3,
  type BlueprintAudienceResonanceAnalysis,
} from '@/lib/types/audienceResonance'

function scoreStatusLabel(score: number): string {
  if (score >= READY_FOR_PRODUCTION_THRESHOLD_V3) return 'Production ready'
  if (score >= 60) return 'Needs improvement'
  return 'Major gaps'
}

function treatmentFallbackText(treatment?: Record<string, unknown> | null): string {
  if (!treatment) return ''
  const log = treatment.logline ? `${treatment.logline}. ` : ''
  const synopsis = String(treatment.synopsis || treatment.content || '')
  return `${log}${synopsis}`.trim()
}

/**
 * Spoken script for Audience Resonance TTS: summary, category scores, deduction breakdown, and recommendations.
 */
export function buildBlueprintARNarrationText(opts: {
  analysis: BlueprintAudienceResonanceAnalysis | null | undefined
  treatment?: Record<string, unknown> | null
  appliedRecommendationIds?: string[]
}): string {
  const { analysis, treatment, appliedRecommendationIds = [] } = opts
  if (!analysis) {
    return treatmentFallbackText(treatment)
  }

  const parts: string[] = []

  parts.push('Audience Resonance Analysis.')
  parts.push(
    `Overall score: ${analysis.overallScore} out of 100. ${scoreStatusLabel(analysis.overallScore)}.`
  )

  if (analysis.summary?.trim()) {
    parts.push(`Summary. ${analysis.summary.trim()}`)
  }

  if (!analysis.isReadyForProduction) {
    const gap = Math.max(0, READY_FOR_PRODUCTION_THRESHOLD_V3 - analysis.overallScore)
    if (gap > 0) {
      parts.push(
        `${gap} points needed to reach production ready at ${READY_FOR_PRODUCTION_THRESHOLD_V3} plus.`
      )
    }
  }

  if (analysis.categories.length > 0) {
    const categoryLines = analysis.categories.map(
      (c) => `${c.name}, score ${c.score} out of 100`
    )
    parts.push(`Category scores. ${categoryLines.join('. ')}.`)
  }

  if (analysis.deductions.length > 0) {
    const deductionLines = analysis.deductions.map((d) => {
      const cat = d.category ? `${d.category}. ` : ''
      return `${cat}${d.reason}. Minus ${d.points} points.`
    })
    parts.push(`Score breakdown from 100. ${deductionLines.join(' ')}`)
  }

  const recommendations = (analysis.recommendations ?? [])
    .filter((r) => !appliedRecommendationIds.includes(r.id))
    .sort((a, b) => b.pointsDeducted - a.pointsDeducted)

  if (recommendations.length > 0) {
    const recLines = recommendations.map((rec, i) => {
      const title = rec.title?.trim() || `Recommendation ${i + 1}`
      const section = rec.fixSection ? ` Focus area: ${rec.fixSection}.` : ''
      const priority = rec.priority ? ` Priority: ${rec.priority}.` : ''
      const points = `Estimated impact: minus ${rec.pointsDeducted} points.`
      return `${title}. ${rec.text.trim()}${section}${priority} ${points}`
    })
    parts.push(`Recommendations. ${recLines.join(' ')}`)
  }

  if (analysis.strengths.length > 0) {
    parts.push(`Strengths. ${analysis.strengths.join('. ')}.`)
  }

  return parts.join('\n\n').trim()
}
