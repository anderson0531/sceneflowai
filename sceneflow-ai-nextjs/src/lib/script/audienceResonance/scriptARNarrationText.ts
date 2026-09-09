import type { ScriptARShareSection } from './shareTypes'
import type { SharedScriptARReview } from './sanitizeShareReview'

export const SCRIPT_AR_SECTION_ORDER: ScriptARShareSection[] = [
  'overview',
  'analysis',
  'recommendations',
]

export function buildScriptARNarrationText(
  review: SharedScriptARReview,
  section: ScriptARShareSection
): string {
  switch (section) {
    case 'overview': {
      const parts = [
        'Script Audience Resonance Analysis.',
        `Overall score: ${review.overallScore} out of 100.`,
        review.targetDemographic ? `Target audience: ${review.targetDemographic}.` : '',
        review.emotionalImpact ? `Emotional impact: ${review.emotionalImpact}.` : '',
        review.categories.length
          ? `Category scores. ${review.categories
              .map((c) => `${c.name}, score ${c.score}`)
              .join('. ')}.`
          : '',
      ]
      return parts.filter(Boolean).join(' ')
    }
    case 'analysis': {
      const parts = [
        review.analysis ? `Analysis. ${review.analysis}` : '',
        review.strengths.length ? `Strengths. ${review.strengths.join('. ')}.` : '',
        review.improvements.length ? `Improvements. ${review.improvements.join('. ')}.` : '',
      ]
      return parts.filter(Boolean).join(' ')
    }
    case 'recommendations': {
      const recs = review.recommendations.map((r, i) => `${i + 1}. ${r.text}`).join(' ')
      const scenes = review.sceneAnalysis
        .slice(0, 12)
        .map((s) => `Scene ${s.sceneNumber}, ${s.sceneHeading}. Score ${s.score}. ${s.notes}`)
        .join(' ')
      return [recs && `Recommendations. ${recs}`, scenes && `Scene notes. ${scenes}`]
        .filter(Boolean)
        .join(' ')
    }
  }
}
