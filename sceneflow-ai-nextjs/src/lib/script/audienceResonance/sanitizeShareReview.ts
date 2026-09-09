import type { AudienceResonanceReview } from './types'

export type SharedScriptARReview = {
  overallScore: number
  categories: { name: string; score: number; weight?: number }[]
  analysis: string
  strengths: string[]
  improvements: string[]
  recommendations: { text: string; priority?: string; category?: string }[]
  sceneAnalysis: {
    sceneNumber: number
    sceneHeading: string
    score: number
    pacing?: string
    notes: string
    recommendations?: { text: string; priority?: string }[]
  }[]
  targetDemographic?: string
  emotionalImpact?: string
  showVsTellRatio?: number
  generatedAt?: string
}

export function sanitizeScriptARReview(review: unknown): SharedScriptARReview | null {
  if (!review || typeof review !== 'object') return null
  const r = review as Partial<AudienceResonanceReview>
  if (typeof r.overallScore !== 'number') return null

  return {
    overallScore: r.overallScore,
    categories: Array.isArray(r.categories)
      ? r.categories.map((c) => ({
          name: String(c.name || ''),
          score: typeof c.score === 'number' ? c.score : 0,
          weight: typeof c.weight === 'number' ? c.weight : undefined,
        }))
      : [],
    analysis: typeof r.analysis === 'string' ? r.analysis : '',
    strengths: Array.isArray(r.strengths) ? r.strengths.map(String) : [],
    improvements: Array.isArray(r.improvements) ? r.improvements.map(String) : [],
    recommendations: Array.isArray(r.recommendations)
      ? r.recommendations.map((rec) => ({
          text: String(rec.text || ''),
          priority: rec.priority,
          category: rec.category,
        }))
      : [],
    sceneAnalysis: Array.isArray(r.sceneAnalysis)
      ? r.sceneAnalysis.map((scene) => ({
          sceneNumber: scene.sceneNumber,
          sceneHeading: String(scene.sceneHeading || ''),
          score: typeof scene.score === 'number' ? scene.score : 0,
          pacing: scene.pacing,
          notes: String(scene.notes || ''),
          recommendations: Array.isArray(scene.recommendations)
            ? scene.recommendations.map((rec) => ({
                text: String(rec.text || ''),
                priority: rec.priority,
              }))
            : undefined,
        }))
      : [],
    targetDemographic: typeof r.targetDemographic === 'string' ? r.targetDemographic : undefined,
    emotionalImpact: typeof r.emotionalImpact === 'string' ? r.emotionalImpact : undefined,
    showVsTellRatio: typeof r.showVsTellRatio === 'number' ? r.showVsTellRatio : undefined,
    generatedAt: typeof r.generatedAt === 'string' ? r.generatedAt : undefined,
  }
}
