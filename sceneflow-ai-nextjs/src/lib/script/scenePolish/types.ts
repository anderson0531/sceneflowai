export const POLISH_CATEGORIES = [
  'prop_state',
  'action_order',
  'spatial',
  'dialogue_mismatch',
  'redundancy',
  'missing_link',
  'direction_conflict',
] as const

export type PolishCategory = (typeof POLISH_CATEGORIES)[number]

export type PolishPriority = 'high' | 'medium' | 'low'

export type PolishRecommendation = {
  id: string
  /** Co-Director-ready instruction. Must name beat numbers. */
  text: string
  /** Short gap shown on the rec card. */
  reason?: string
  priority: PolishPriority
  category: PolishCategory
  /** 1-based beat numbers from the numbered polish timeline. */
  beatIndices: number[]
  beatIds?: string[]
}

export type ScenePolishAnalysis = {
  notes: string
  issueCount: number
  recommendations: PolishRecommendation[]
  beatFingerprint: string
  analyzedAt: string
  appliedRecommendationIds?: string[]
  optimizedAt?: string
  modelId?: string
  requestedModelId?: string
}

export type PolishSceneInput = {
  heading?: unknown
  visualDescription?: unknown
  action?: unknown
  summary?: unknown
  sceneDirection?: {
    sceneDescription?: string
    scene?: { keyProps?: string[] }
  } | null
  beats?: unknown
  [key: string]: unknown
}

export type AnalyzeScenePolishInput = {
  scene: PolishSceneInput
  previousScene?: PolishSceneInput | null
  nextScene?: PolishSceneInput | null
  languageBlock?: string
}
