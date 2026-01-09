/**
 * Audience Resonance Engine Types
 * 
 * Strategic advisor feature for analyzing film treatments against
 * target market, genre conventions, and commercial viability.
 */

// =============================================================================
// INTENT CONFIGURATION
// =============================================================================

export type PrimaryGenre =
  | 'action'
  | 'comedy'
  | 'drama'
  | 'horror'
  | 'thriller'
  | 'sci-fi'
  | 'fantasy'
  | 'romance'
  | 'documentary'
  | 'animation'
  | 'mystery'
  | 'western'
  | 'musical'
  | 'war'
  | 'crime'
  | 'family'
  | 'adventure'
  | 'biographical'

export type TargetDemographic =
  | 'gen-z-18-24'
  | 'millennials-25-34'
  | 'gen-x-35-54'
  | 'boomers-55+'
  | 'teens-13-17'
  | 'family-all-ages'
  | 'mature-21+'
  | 'general-audience'

export type ToneProfile =
  | 'dark-gritty'
  | 'light-comedic'
  | 'inspirational'
  | 'suspenseful'
  | 'heartwarming'
  | 'satirical'
  | 'melancholic'
  | 'whimsical'
  | 'intense'
  | 'nostalgic'

export interface AudienceIntent {
  primaryGenre: PrimaryGenre
  targetDemographic: TargetDemographic
  toneProfile: ToneProfile
}

// =============================================================================
// RESONANCE AXES (Radar Chart)
// =============================================================================

export type ResonanceAxisId =
  | 'originality'
  | 'genre-fidelity'
  | 'character-depth'
  | 'pacing'
  | 'commercial-viability'

export interface ResonanceAxis {
  id: ResonanceAxisId
  label: string
  description: string
  score: number // 0-100
  weight: number // Importance weight for overall score
}

export const RESONANCE_AXIS_LABELS: Record<ResonanceAxisId, { label: string; description: string }> = {
  'originality': {
    label: 'Concept Originality',
    description: 'How unique and fresh is the concept compared to existing works?'
  },
  'genre-fidelity': {
    label: 'Genre Fidelity',
    description: 'Does the treatment hit the necessary beats and conventions for the chosen genre?'
  },
  'character-depth': {
    label: 'Character Depth',
    description: 'Are character motivations clear and emotionally compelling?'
  },
  'pacing': {
    label: 'Pacing & Structure',
    description: 'Are act breaks detectable? Does the narrative flow naturally?'
  },
  'commercial-viability': {
    label: 'Commercial Viability',
    description: 'Budget vs. audience size potential. Is this marketable?'
  }
}

// =============================================================================
// INSIGHTS & RECOMMENDATIONS
// =============================================================================

export type InsightStatus = 'strength' | 'weakness' | 'neutral'

export type InsightCategory =
  | 'genre-alignment'
  | 'audience-demographics'
  | 'tone-consistency'
  | 'character-arc'
  | 'structural-beats'
  | 'market-positioning'

export interface ResonanceInsight {
  id: string
  category: InsightCategory
  status: InsightStatus
  title: string
  insight: string
  treatmentSection?: string // Which part of treatment this refers to
  actionable: boolean
  fixSuggestion?: string // AI-generated fix text
  fixSection?: 'core' | 'story' | 'tone' | 'beats' | 'characters' // Which refine section to target
}

export interface OptimizationRecommendation {
  id: string
  priority: 'high' | 'medium' | 'low'
  category: InsightCategory
  title: string
  description: string
  expectedImpact: number // How many points this could add to score
  effort: 'quick' | 'moderate' | 'significant'
}

// =============================================================================
// GREENLIGHT SCORE
// =============================================================================

export type GreenlightTier = 'market-ready' | 'strong-potential' | 'needs-refinement'

export interface GreenlightScore {
  score: number // 0-100
  tier: GreenlightTier
  label: string
  confidence: number // 0-1, how confident the AI is in this score
  analysisDate: string
}

export function getGreenlightTier(score: number): { tier: GreenlightTier; label: string; color: string } {
  if (score >= 90) {
    return { tier: 'market-ready', label: 'Market Ready', color: '#22c55e' } // Neon green
  } else if (score >= 70) {
    return { tier: 'strong-potential', label: 'Strong Potential', color: '#f59e0b' } // Amber
  } else {
    return { tier: 'needs-refinement', label: 'Needs Refinement', color: '#ef4444' } // Muted red
  }
}

// =============================================================================
// TONE HEAT MAP
// =============================================================================

export interface ToneHeatMapSegment {
  segmentIndex: number
  startPercent: number
  endPercent: number
  emotionalTone: 'calm' | 'building' | 'tense' | 'climax' | 'resolution'
  intensity: number // 0-100
  treatmentParagraphIndex?: number
  description?: string
}

// =============================================================================
// FULL ANALYSIS RESPONSE
// =============================================================================

export interface AudienceResonanceAnalysis {
  // Configuration
  intent: AudienceIntent
  treatmentId: string
  
  // Core Metrics
  greenlightScore: GreenlightScore
  axes: ResonanceAxis[]
  
  // Detailed Insights
  insights: ResonanceInsight[]
  recommendations: OptimizationRecommendation[]
  
  // Tone Analysis
  toneHeatMap?: ToneHeatMapSegment[]
  
  // Metadata
  analysisVersion: string
  generatedAt: string
  creditsUsed: number
}

// =============================================================================
// API REQUEST/RESPONSE
// =============================================================================

export interface AnalyzeResonanceRequest {
  treatmentId: string
  treatment: {
    title?: string
    logline?: string
    synopsis?: string
    genre?: string
    tone?: string
    protagonist?: string
    antagonist?: string
    setting?: string
    themes?: string[] | string
    beats?: Array<{ title: string; intent?: string; minutes?: number; synopsis?: string }>
    character_descriptions?: Array<{ name: string; description: string; role?: string }>
    act_breakdown?: { act1?: string; act2?: string; act3?: string }
  }
  intent: AudienceIntent
  includeHeatMap?: boolean
  quickAnalysis?: boolean // Heuristic-only, no AI (free tier)
  iteration?: number // Current refinement iteration (1-3, capped at 3)
}

export interface AnalyzeResonanceResponse {
  success: boolean
  analysis?: AudienceResonanceAnalysis
  error?: string
  cached?: boolean
  iteration?: number // Current iteration number
  maxIterations?: number // Maximum allowed iterations (3)
  readyForProduction?: boolean // Score >= 80
}

// =============================================================================
// UI STATE
// =============================================================================

export interface ResonancePanelState {
  isAnalyzing: boolean
  lastAnalysis: AudienceResonanceAnalysis | null
  intent: AudienceIntent
  expandedInsights: string[]
  pendingFix: {
    insightId: string
    fixText: string
    section: string
  } | null
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const GENRE_OPTIONS: { value: PrimaryGenre; label: string }[] = [
  { value: 'action', label: 'Action' },
  { value: 'comedy', label: 'Comedy' },
  { value: 'drama', label: 'Drama' },
  { value: 'horror', label: 'Horror' },
  { value: 'thriller', label: 'Thriller' },
  { value: 'sci-fi', label: 'Sci-Fi' },
  { value: 'fantasy', label: 'Fantasy' },
  { value: 'romance', label: 'Romance' },
  { value: 'documentary', label: 'Documentary' },
  { value: 'animation', label: 'Animation' },
  { value: 'mystery', label: 'Mystery' },
  { value: 'western', label: 'Western' },
  { value: 'musical', label: 'Musical' },
  { value: 'war', label: 'War' },
  { value: 'crime', label: 'Crime' },
  { value: 'family', label: 'Family' },
  { value: 'adventure', label: 'Adventure' },
  { value: 'biographical', label: 'Biographical' },
]

export const DEMOGRAPHIC_OPTIONS: { value: TargetDemographic; label: string }[] = [
  { value: 'general-audience', label: 'General Audience' },
  { value: 'gen-z-18-24', label: 'Gen Z (18-24)' },
  { value: 'millennials-25-34', label: 'Millennials (25-34)' },
  { value: 'gen-x-35-54', label: 'Gen X (35-54)' },
  { value: 'boomers-55+', label: 'Boomers (55+)' },
  { value: 'teens-13-17', label: 'Teens (13-17)' },
  { value: 'family-all-ages', label: 'Family (All Ages)' },
  { value: 'mature-21+', label: 'Mature (21+)' },
]

export const TONE_OPTIONS: { value: ToneProfile; label: string }[] = [
  { value: 'dark-gritty', label: 'Dark & Gritty' },
  { value: 'light-comedic', label: 'Light & Comedic' },
  { value: 'inspirational', label: 'Inspirational' },
  { value: 'suspenseful', label: 'Suspenseful' },
  { value: 'heartwarming', label: 'Heartwarming' },
  { value: 'satirical', label: 'Satirical' },
  { value: 'melancholic', label: 'Melancholic' },
  { value: 'whimsical', label: 'Whimsical' },
  { value: 'intense', label: 'Intense' },
  { value: 'nostalgic', label: 'Nostalgic' },
]

export const DEFAULT_INTENT: AudienceIntent = {
  primaryGenre: 'drama',
  targetDemographic: 'millennials-25-34',
  toneProfile: 'dark-gritty'
}
