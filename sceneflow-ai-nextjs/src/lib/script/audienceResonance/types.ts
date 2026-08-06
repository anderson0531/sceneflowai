import type { RecommendationPriority } from '@/types/story'
import type { NarrationPolicy } from '@/lib/script/narrationPolicy'

export type ReviewRecommendation = {
  text: string
  priority: RecommendationPriority
  category?: string
}

export type Deduction = {
  reason: string
  points: number
  category: string
}

export type SceneRecommendation = {
  text: string
  priority: 'high' | 'medium' | 'low'
  pointsDeducted?: number
}

export type SceneAnalysis = {
  sceneNumber: number
  sceneHeading: string
  score: number
  storyWeight?: number
  pacing: 'slow' | 'moderate' | 'fast'
  tension: 'low' | 'medium' | 'high'
  characterDevelopment: 'minimal' | 'moderate' | 'strong'
  visualPotential: 'low' | 'medium' | 'high'
  notes: string
  recommendations?: SceneRecommendation[]
}

export type ScoreCategory = {
  name: string
  score: number
  weight: number
}

export type AudienceResonanceReview = {
  overallScore: number
  baseScore: number
  deductions: Deduction[]
  categories: ScoreCategory[]
  showVsTellRatio: number
  analysis: string
  strengths: string[]
  improvements: string[]
  recommendations: ReviewRecommendation[]
  sceneAnalysis: SceneAnalysis[]
  targetDemographic: string
  emotionalImpact: string
  generatedAt: string
  /** Model that actually produced this review, after any fallback. */
  modelId?: string
  /** Model originally requested; differs from modelId when a fallback ran. */
  requestedModelId?: string
  /** Scenes covered by per-scene analysis, versus the script's total. */
  coverage?: { analyzedScenes: number; totalScenes: number }
  /** script.scriptUpdatedAt when analysis started, for staleness detection. */
  baseScriptUpdatedAt?: string | null
}

export type ShowVsTellMetrics = {
  ratio: number
  narrationWords: number
  actionWords: number
  dialogueWords: number
}

export type PreviousScores = {
  overallScore: number
  categories: ScoreCategory[]
}

export type AnalysisScript = {
  title?: string
  logline?: string
  scenes: any[]
  characters?: any[]
}

export type AnalysisContext = {
  script: AnalysisScript
  scenesForAnalysis: any[]
  showVsTellMetrics: ShowVsTellMetrics
  narrationPolicy: NarrationPolicy
  targetDemographic?: string
  contentSeed: number
  previousScores?: PreviousScores
  /**
   * `localeDirective` block for the language the script is written in. The
   * verdict, notes and recommendations are prose the creator reads, so both
   * passes carry it; empty for English.
   */
  languageBlock?: string
}
