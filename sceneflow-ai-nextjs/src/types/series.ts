/**
 * Series Types for Client-Side Usage
 * 
 * This file provides TypeScript interfaces for the Series feature,
 * designed to work with the API responses and UI components.
 * 
 * IMPORTANT: This file must NOT import from server-side modules (models, database, etc.)
 * to ensure it can be used in client-side code without bundling Node.js dependencies.
 */

// Episode limits - soft limit allows flexibility, hard limit enforces UI constraints
export const DEFAULT_MAX_EPISODES = 40
export const ABSOLUTE_MAX_EPISODES = 40

// Series status type
export type SeriesStatus = 'draft' | 'active' | 'completed' | 'archived'

/**
 * Series Episode Beat
 */
export interface SeriesEpisodeBeat {
  beatNumber: number
  title: string
  description: string
  act: number  // 1, 2, or 3
}

/**
 * Series Episode Character Reference
 */
export interface SeriesEpisodeCharacter {
  characterId: string
  role: 'protagonist' | 'antagonist' | 'supporting' | 'guest'
  episodeArc?: string
}

/**
 * Story Arc/Thread for tracking narrative continuity
 */
export interface StoryThread {
  id: string
  name: string
  type: 'main' | 'subplot' | 'character' | 'mystery' | 'romance'
  status: 'introduced' | 'developing' | 'climax' | 'resolved'
  description?: string
}

/**
 * Series Episode Blueprint
 */
export interface SeriesEpisodeBlueprint {
  id: string
  episodeNumber: number
  title: string
  logline: string
  synopsis: string
  beats: SeriesEpisodeBeat[]
  characters: SeriesEpisodeCharacter[]
  /** Story threads/arcs active in this episode for continuity tracking */
  storyThreads?: StoryThread[]
  /** Key plot developments that affect future episodes */
  plotDevelopments?: string[]
  /** Cliffhanger or setup for next episode */
  episodeHook?: string
  projectId?: string
  status: 'blueprint' | 'in_progress' | 'completed'
}

/**
 * Series Character
 */
export interface SeriesCharacter {
  id: string
  name: string
  role: 'protagonist' | 'antagonist' | 'supporting' | 'recurring'
  description: string
  appearance: string
  backstory?: string
  personality?: string
  voiceId?: string
  referenceImageUrl?: string
  lockedPromptTokens?: string[]
  createdAt: string
  updatedAt: string
}

/**
 * Series Location
 */
export interface SeriesLocation {
  id: string
  name: string
  description: string
  visualDescription?: string
  referenceImageUrl?: string
  lockedPromptTokens?: string[]
  createdAt: string
  updatedAt: string
}

/**
 * Series Aesthetic Settings
 */
export interface SeriesAesthetic {
  cinematography?: string
  colorPalette?: Record<string, string[]>
  aspectRatio?: string
  visualStyle?: string
  lightingStyle?: string
  lockedPromptTokens?: {
    global?: string[]
    characters?: Record<string, string[]>
    locations?: Record<string, string[]>
  }
}

/**
 * Series Production Bible
 */
export interface SeriesProductionBible {
  version: string
  lastUpdated: string
  lastUpdatedBy?: string
  logline: string
  synopsis: string
  setting: string
  timeframe?: string
  protagonist: {
    characterId: string
    name: string
    goal: string
    flaw?: string
  }
  antagonistConflict: {
    type: 'character' | 'nature' | 'society' | 'self' | 'technology'
    description: string
    characterId?: string
  }
  aesthetic: SeriesAesthetic
  characters: SeriesCharacter[]
  locations: SeriesLocation[]
  toneGuidelines?: string
  visualGuidelines?: string
  audioGuidelines?: string
  consistencyRules?: string[]
  worldBuildingNotes?: string[]
}

/**
 * Series API Response shape
 */
export interface SeriesResponse {
  id: string
  userId: string
  title: string
  logline?: string
  genre?: string
  targetAudience?: string
  status: 'draft' | 'active' | 'completed' | 'archived'
  maxEpisodes: number
  episodeCount: number
  startedCount: number
  completedCount: number
  productionBible: SeriesProductionBible
  episodeBlueprints: SeriesEpisodeBlueprint[]
  metadata: Record<string, any>
  createdAt: string
  updatedAt: string
}

// Type aliases for API responses (same structure, different naming convention)
export type SeriesProductionBibleResponse = SeriesProductionBible
export type SeriesCharacterResponse = SeriesCharacter
export type SeriesLocationResponse = SeriesLocation
export type EpisodeBlueprintResponse = SeriesEpisodeBlueprint

/**
 * Extended episode blueprint with linked project data (returned when includeEpisodes=true)
 */
export interface EpisodeBlueprintWithProject extends SeriesEpisodeBlueprint {
  project?: {
    id: string
    title: string
    status: string
    currentStep: string
    stepProgress: Record<string, number>
    updatedAt: string
  }
}

/**
 * Series Creation Request
 */
export interface CreateSeriesRequest {
  userId: string
  title: string
  logline?: string
  genre?: string
  targetAudience?: string
  maxEpisodes?: number
  productionBible?: Partial<SeriesProductionBibleResponse>
  episodeBlueprints?: Partial<EpisodeBlueprintResponse>[]
}

/**
 * Series Update Request
 */
export interface UpdateSeriesRequest {
  title?: string
  logline?: string
  genre?: string
  targetAudience?: string
  status?: 'draft' | 'active' | 'completed' | 'archived'
  maxEpisodes?: number
  productionBible?: Partial<SeriesProductionBibleResponse>
  episodeBlueprints?: EpisodeBlueprintResponse[]
  metadata?: Record<string, any>
}

/**
 * Series Generation Request
 */
export interface GenerateSeriesRequest {
  topic: string
  episodeCount?: number
  regenerateField?: 'title' | 'logline' | 'synopsis' | 'protagonist' | 'antagonist' | 'setting' | 'episodes' | 'characters'
  preserveExisting?: boolean
  genre?: string
  tone?: string
}

/**
 * Bible Sync Request
 */
export interface BibleSyncRequest {
  projectId: string
  syncFields: Array<'characters' | 'locations' | 'aesthetic' | 'all'>
  preview?: boolean
  mergeStrategy?: 'replace' | 'merge' | 'add_new_only'
}

/**
 * Bible Sync Diff Response
 */
export interface BibleSyncDiff {
  characters: {
    added: SeriesCharacterResponse[]
    updated: Array<{ id: string; fields: string[] }>
    removed: string[]
  }
  locations: {
    added: SeriesLocationResponse[]
    updated: Array<{ id: string; fields: string[] }>
    removed: string[]
  }
  aesthetic: {
    before: any
    after: any
  }
}

/**
 * Episode Start Response
 */
export interface StartEpisodeResponse {
  success: boolean
  project: {
    id: string
    title: string
    seriesId: string
    episodeNumber: number
    status: string
    currentStep: string
  }
  episode: {
    id: string
    episodeNumber: number
    title: string
    status: 'in_progress'
  }
}

/**
 * UI State for Series Studio
 */
export interface SeriesStudioState {
  series: SeriesResponse | null
  isLoading: boolean
  isGenerating: boolean
  selectedEpisodeId: string | null
  editMode: 'view' | 'edit' | 'generate'
  unsavedChanges: boolean
  bibleSyncStatus: {
    lastSynced?: string
    hasChanges: boolean
    pendingDiff?: BibleSyncDiff
  }
}

/**
 * Series Card Props for dashboard display
 */
export interface SeriesCardProps {
  series: SeriesResponse
  onOpen?: (seriesId: string) => void
  onStartEpisode?: (seriesId: string, episodeId: string) => void
  onDelete?: (seriesId: string) => void
  showEpisodeList?: boolean
}

/**
 * Episode Card Props
 */
export interface EpisodeCardProps {
  episode: EpisodeBlueprintResponse
  seriesId: string
  seriesTitle: string
  onStart?: () => void
  onEdit?: () => void
  onView?: () => void
  isStarting?: boolean
}

/**
 * Production Bible Panel Props
 */
export interface ProductionBiblePanelProps {
  bible: SeriesProductionBibleResponse
  seriesId: string
  currentProjectId?: string
  onSaveToBible?: (request: BibleSyncRequest) => Promise<void>
  onPullFromBible?: () => Promise<void>
  readOnly?: boolean
}

// =============================================================================
// Series Resonance Analysis Types
// =============================================================================

/**
 * Resonance scoring axis for radar chart
 */
export interface SeriesResonanceAxis {
  id: 'concept-originality' | 'character-depth' | 'episode-engagement' | 'story-arc-coherence' | 'commercial-viability'
  label: string
  score: number // 0-100
  weight: number // Weight for overall score calculation
  description: string
}

/**
 * Per-episode engagement metrics
 */
export interface EpisodeEngagementScore {
  episodeId: string
  episodeNumber: number
  title: string
  /** Hook strength - how compelling is the episode's premise (1-10) */
  hookStrength: number
  /** Cliffhanger effectiveness - does it make you want more? (1-10) */
  cliffhangerScore: number
  /** Story thread continuity - how well it connects to overall arc (1-10) */
  continuityScore: number
  /** Character development moments in this episode (1-10) */
  characterMoments: number
  /** Tension level throughout episode: low/medium/high */
  tensionLevel: 'low' | 'medium' | 'high'
  /** Pacing assessment */
  pacing: 'slow' | 'moderate' | 'fast'
  /** Overall episode score (weighted average) */
  overallScore: number
  /** Specific notes about this episode */
  notes: string
  /** Recommended improvements */
  improvements: string[]
}

/**
 * Greenlight score tier (matching Blueprint pattern)
 */
export type SeriesGreenlightTier = 'market-ready' | 'strong-potential' | 'needs-refinement'

/**
 * Greenlight score for series
 */
export interface SeriesGreenlightScore {
  score: number // 0-100
  tier: SeriesGreenlightTier
  label: string // "Market Ready", "Strong Potential", "Needs Refinement"
  color: string // Hex color for UI
  confidence: number // 0-1 confidence in analysis
}

/**
 * Insight category for series analysis
 */
export type SeriesInsightCategory = 
  | 'concept' 
  | 'characters' 
  | 'episodes' 
  | 'story-arc' 
  | 'pacing' 
  | 'engagement' 
  | 'commercial'

/**
 * Individual insight with fix suggestion
 */
export interface SeriesResonanceInsight {
  id: string
  category: SeriesInsightCategory
  status: 'strength' | 'weakness' | 'neutral'
  title: string
  insight: string
  /** Target section for fix: which part of series to update */
  targetSection?: 'bible' | 'episode' | 'character' | 'location' | 'visual-style'
  /** Specific target ID (episode ID, character ID, etc.) */
  targetId?: string
  /** Can this be auto-fixed? */
  actionable: boolean
  /** AI-generated fix suggestion */
  fixSuggestion?: string
  /** Which axis this affects */
  axisId?: SeriesResonanceAxis['id']
  /** Estimated score improvement if fixed */
  estimatedImpact?: number
}

/**
 * Character analysis for resonance
 */
export interface CharacterAnalysis {
  characterId: string
  name: string
  role: string
  /** Character arc clarity (1-10) */
  arcClarity: number
  /** Character distinctiveness (1-10) */
  distinctiveness: number
  /** Audience connection potential (1-10) */
  relatability: number
  /** Visual description quality (1-10) */
  visualClarity: number
  strengths: string[]
  weaknesses: string[]
}

/**
 * Location analysis for resonance
 */
export interface LocationAnalysis {
  locationId: string
  name: string
  /** Visual distinctiveness (1-10) */
  visualImpact: number
  /** Narrative importance (1-10) */
  narrativeRole: number
  /** World-building contribution (1-10) */
  worldBuilding: number
  notes: string
}

/**
 * Audience Engagement Driver - key factor that drives viewer engagement
 */
export interface AudienceEngagementDriver {
  driver: string
  description: string
  episodeExamples: number[]
  impactLevel: 'high' | 'medium' | 'low'
}

/**
 * Full Series Resonance Analysis result
 */
export interface SeriesResonanceAnalysis {
  seriesId: string
  /** Overall greenlight score */
  greenlightScore: SeriesGreenlightScore
  /** 5-axis radar chart scores */
  axes: SeriesResonanceAxis[]
  /** Per-episode engagement analysis */
  episodeEngagement: EpisodeEngagementScore[]
  /** Character-level analysis */
  characterAnalysis: CharacterAnalysis[]
  /** Location-level analysis */
  locationAnalysis: LocationAnalysis[]
  /** Strengths and weaknesses with fixes */
  insights: SeriesResonanceInsight[]
  /** Summary narrative */
  summary: {
    overallAssessment: string
    bingeWorthiness: string // "High", "Medium", "Low" with explanation
    targetAudience: string
    comparableSeries: string[] // Similar successful series
    keyStrengths: string[]
    criticalWeaknesses: string[]
    /** Key factors driving audience engagement */
    audienceEngagementDrivers?: AudienceEngagementDriver[]
    /** Market positioning analysis */
    marketPositioning?: string
    /** Potential for renewal/additional seasons */
    renewalPotential?: string
  }
  /** Analysis metadata */
  analysisVersion: string
  generatedAt: string
  /** Credits used for this analysis */
  creditsUsed: number
}

/**
 * Persisted resonance state for caching
 */
export interface PersistedSeriesResonance {
  seriesId: string
  analysis: SeriesResonanceAnalysis | null
  iterationCount: number
  appliedFixes: string[]
  appliedFixDetails: Array<{
    insightId: string
    fixSuggestion: string
    targetSection: string
    targetId?: string
    appliedAt: string
  }>
  isReadyForProduction: boolean
  lastAnalyzedAt: string | null
  lastSavedAt: string
}

/**
 * Apply fix request
 */
export interface ApplySeriesFixRequest {
  insightId: string
  fixSuggestion: string
  targetSection: 'bible' | 'episode' | 'character' | 'location' | 'visual-style'
  targetId?: string
}

/**
 * Apply fix response
 */
export interface ApplySeriesFixResponse {
  success: boolean
  updatedSeries: SeriesResponse
  fixApplied: {
    insightId: string
    targetSection: string
    targetId?: string
    changesSummary: string
  }
  /** Estimated new score (before re-analysis) */
  estimatedScore?: number
}

/**
 * Helper to get greenlight tier from score
 */
export function getSeriesGreenlightTier(score: number): SeriesGreenlightScore {
  if (score >= 90) {
    return {
      score,
      tier: 'market-ready',
      label: 'Market Ready',
      color: '#22c55e',
      confidence: 0.85
    }
  } else if (score >= 70) {
    return {
      score,
      tier: 'strong-potential',
      label: 'Strong Potential',
      color: '#f59e0b',
      confidence: 0.80
    }
  } else {
    return {
      score,
      tier: 'needs-refinement',
      label: 'Needs Refinement',
      color: '#ef4444',
      confidence: 0.75
    }
  }
}

/**
 * Default scoring weights for series resonance
 */
export const SERIES_RESONANCE_WEIGHTS = {
  'concept-originality': 20,
  'character-depth': 25,
  'episode-engagement': 25,
  'story-arc-coherence': 15,
  'commercial-viability': 15
} as const
