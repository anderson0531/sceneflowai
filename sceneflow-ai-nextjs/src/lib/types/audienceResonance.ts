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
  // Fiction/Narrative
  | 'action'
  | 'comedy'
  | 'drama'
  | 'horror'
  | 'thriller'
  | 'sci-fi'
  | 'fantasy'
  | 'romance'
  | 'animation'
  | 'mystery'
  | 'western'
  | 'musical'
  | 'war'
  | 'crime'
  | 'family'
  | 'adventure'
  | 'biographical'
  // Non-Fiction/Documentary
  | 'documentary'
  | 'education'
  | 'training'
  | 'news'
  // Conversational
  | 'podcast'
  | 'interview'

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

/** Geographic / market region for audience calibration */
export type TargetRegion =
  | 'global'
  | 'north-america'
  | 'europe'
  | 'asia-pacific'
  | 'latin-america'
  | 'middle-east-africa'
  | 'southeast-asia'
  | 'oceania'

/** Age band (explicit; syncs to legacy targetDemographic for scoring) */
export type TargetAgeRange =
  | 'general-all-ages'
  | 'teens-13-17'
  | 'young-adult-18-24'
  | 'millennials-25-34'
  | 'gen-x-35-54'
  | 'boomers-55+'
  | 'family-all-ages'
  | 'mature-21+'

export type TargetGender =
  | 'all-genders'
  | 'women-primary'
  | 'men-primary'
  | 'women-leaning'
  | 'men-leaning'
  | 'non-binary-inclusive'

export type TargetEducationLevel =
  | 'general'
  | 'secondary'
  | 'some-college'
  | 'college-educated'
  | 'graduate-professional'
  | 'vocational-trade'

/** Community / lifestyle context (urban, academic, family, etc.) */
export type TargetCommunity =
  | 'general'
  | 'urban-metropolitan'
  | 'suburban'
  | 'rural'
  | 'academic-university'
  | 'family-parenting'
  | 'professional-workplace'
  | 'faith-community'
  | 'fandom-niche'
  | 'diaspora-cultural'

export interface AudienceIntent {
  primaryGenre: PrimaryGenre
  /** Legacy cohort id — kept in sync with ageRange for checklist scoring */
  targetDemographic: TargetDemographic
  toneProfile: ToneProfile
  region: TargetRegion
  ageRange: TargetAgeRange
  gender: TargetGender
  educationLevel: TargetEducationLevel
  community: TargetCommunity
}

export type AudienceTargetProfile = Pick<
  AudienceIntent,
  'region' | 'ageRange' | 'gender' | 'educationLevel' | 'community'
>

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
  checkpointId?: string // Links to specific checkpoint for local score recalculation (e.g., 'hook-or-twist')
  axisId?: 'concept-originality' | 'character-depth' | 'pacing-structure' | 'genre-fidelity' | 'commercial-viability' // Which scoring axis this insight relates to
  /** Relative score impact (higher = more important weakness) */
  impactScore?: number
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

/** Actionable step toward production-ready score (80+) */
export interface ScoreImprovementStep {
  id: string
  title: string
  insight: string
  axisLabel: string
  section: string
  estimatedGain: number
  impact: 'High' | 'Medium' | 'Low'
  fixSuggestion?: string
}

export interface ScoreImprovementPath {
  pointsToReady: number
  steps: ScoreImprovementStep[]
  projectedScoreIfTopSteps: number
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
// CHECKPOINT RESULTS (for local score recalculation)
// =============================================================================

export interface CheckpointResult {
  // Gradient scoring (0-10 scale) - primary scoring method
  score: number           // 0-10 scale (7+ = passed)
  feedback?: string       // AI's explanation for the score
  
  // Backward compatibility fields (derived from score)
  passed: boolean         // Derived: score >= 7
  penalty: number         // Derived: (10 - score) / 10 * maxPenalty
}

// Applied fix tracking for prompt injection
export interface AppliedFix {
  id: string
  checkpointId: string
  axisId: string
  fixText: string         // The fix suggestion text that was applied
  appliedAt: string       // ISO timestamp
}

export type AxisCheckpointResults = Record<string, CheckpointResult>

export interface CheckpointResults {
  'concept-originality': AxisCheckpointResults
  'character-depth': AxisCheckpointResults
  'pacing-structure': AxisCheckpointResults
  'genre-fidelity': AxisCheckpointResults
  'commercial-viability': AxisCheckpointResults
}

// =============================================================================
// SCENE-LEVEL ANALYSIS (Persisted to project scenes)
// =============================================================================

/**
 * Scene-level analysis result from Audience Resonance
 * This is persisted to each scene in the project for tracking improvements
 */
export interface SceneAnalysisResult {
  /** Scene score (0-100) - threshold is 80 for "good" */
  score: number
  /** Pacing assessment */
  pacing: 'slow' | 'moderate' | 'fast'
  /** Tension level */
  tension: 'low' | 'medium' | 'high'
  /** Character development quality */
  characterDevelopment: 'minimal' | 'moderate' | 'strong'
  /** Visual storytelling potential */
  visualPotential: 'low' | 'medium' | 'high'
  /** One-sentence analysis note */
  notes: string
  /** 2-4 targeted fix suggestions for this scene */
  recommendations: string[]
  /** IDs of recommendations that have been applied */
  appliedRecommendationIds?: string[]
  /** When this analysis was generated */
  analyzedAt: string
  /** Previous score before optimization (for delta display) */
  previousScore?: number
}

/** 
 * Scene analysis status for UI display
 * Used to determine CTA text and styling
 */
export type SceneAnalysisStatus = 
  | 'good'           // score >= 80, no action needed
  | 'needs-review'   // score < 80, has recommendations
  | 'optimizing'     // currently being optimized
  | 'pending'        // not yet analyzed

/**
 * Get the analysis status for a scene based on its score
 */
export function getSceneAnalysisStatus(
  analysis: SceneAnalysisResult | undefined,
  isOptimizing: boolean
): SceneAnalysisStatus {
  if (isOptimizing) return 'optimizing'
  if (!analysis) return 'pending'
  return analysis.score >= 80 ? 'good' : 'needs-review'
}

/**
 * Scene analysis CTA configuration
 */
export interface SceneAnalysisCTA {
  status: SceneAnalysisStatus
  label: string
  description: string
  actionLabel: string
  color: 'green' | 'amber' | 'purple' | 'gray'
}

/**
 * Get CTA configuration for a scene analysis status
 */
export function getSceneAnalysisCTA(status: SceneAnalysisStatus): SceneAnalysisCTA {
  switch (status) {
    case 'good':
      return {
        status: 'good',
        label: 'Good',
        description: 'No action required',
        actionLabel: 'View Details',
        color: 'green'
      }
    case 'needs-review':
      return {
        status: 'needs-review',
        label: 'Review',
        description: 'Recommendations available',
        actionLabel: 'Optimize Scene',
        color: 'amber'
      }
    case 'optimizing':
      return {
        status: 'optimizing',
        label: 'Optimizing',
        description: 'Applying improvements...',
        actionLabel: 'In Progress',
        color: 'purple'
      }
    case 'pending':
      return {
        status: 'pending',
        label: 'Pending',
        description: 'Run analysis to get score',
        actionLabel: 'Analyze',
        color: 'gray'
      }
  }
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
  
  // Checkpoint Results (for local scoring)
  checkpointResults?: CheckpointResults
  
  // Detailed Insights
  insights: ResonanceInsight[]
  recommendations: OptimizationRecommendation[]
  /** How to reach production-ready score from current analysis */
  scorePath?: ScoreImprovementPath
  
  // Tone Analysis
  toneHeatMap?: ToneHeatMapSegment[]
  
  // Metadata
  analysisVersion: string
  generatedAt: string
  creditsUsed: number
}

// =============================================================================
// PERSISTED AR STATE (for database storage)
// =============================================================================

/**
 * Minimal AR state to persist to project metadata database
 * This is a subset of ResonanceCacheEntry optimized for database storage
 */
export interface PersistedAudienceResonance {
  // Core analysis data
  analysis: AudienceResonanceAnalysis | null
  intent: AudienceIntent
  
  // Progress tracking
  iterationCount: number
  isReadyForProduction: boolean
  greenlightScore: number | null
  
  // Applied fixes for context
  appliedFixes: string[]           // Insight IDs that were applied
  appliedFixDetails: AppliedFix[]  // Full fix objects for prompt injection
  
  // Scoring state
  checkpointResults?: CheckpointResults | null
  targetProfile?: TargetScoreProfile | null
  
  // Metadata
  lastAnalyzedAt: string | null    // ISO timestamp
  lastSavedAt: string             // ISO timestamp
}

/**
 * Create a minimal persisted AR object from cache entry
 */
export function createPersistedAR(
  analysis: AudienceResonanceAnalysis | null,
  intent: AudienceIntent,
  iterationCount: number,
  isReadyForProduction: boolean,
  appliedFixes: string[],
  appliedFixDetails: AppliedFix[],
  checkpointResults?: CheckpointResults | null,
  targetProfile?: TargetScoreProfile | null
): PersistedAudienceResonance {
  return {
    analysis,
    intent,
    iterationCount,
    isReadyForProduction,
    greenlightScore: analysis?.greenlightScore?.score ?? null,
    appliedFixes,
    appliedFixDetails,
    checkpointResults: checkpointResults ?? null,
    targetProfile: targetProfile ?? null,
    lastAnalyzedAt: analysis?.generatedAt ?? null,
    lastSavedAt: new Date().toISOString()
  }
}

// =============================================================================
// API REQUEST/RESPONSE
// =============================================================================

// Previous analysis context for re-analysis (maintains scoring baseline)
export interface PreviousAnalysisContext {
  score: number // Previous greenlight score
  axisScores: {
    originality: number
    genreFidelity: number
    characterDepth: number
    pacing: number
    commercialViability: number
  }
  // Gradient checkpoint scores (0-10 scale)
  checkpointScores: Record<string, number> // checkpoint ID → 0-10 score
  // Full applied fix objects for prompt injection
  appliedFixes: AppliedFix[]
  // Legacy: passedCheckpoints derived from checkpointScores >= 7
  passedCheckpoints: string[]
}

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
  previousAnalysis?: PreviousAnalysisContext // For re-analysis: maintains baseline
  targetProfile?: TargetScoreProfile // Locked target for stable scoring path
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

// Genre category for grouping in UI
export type GenreCategory = 'fiction' | 'non-fiction' | 'conversational'

export interface GenreOption {
  value: PrimaryGenre
  label: string
  category: GenreCategory
}

export const GENRE_OPTIONS: GenreOption[] = [
  // Fiction/Narrative (story-based)
  { value: 'drama', label: 'Drama', category: 'fiction' },
  { value: 'comedy', label: 'Comedy', category: 'fiction' },
  { value: 'thriller', label: 'Thriller', category: 'fiction' },
  { value: 'horror', label: 'Horror', category: 'fiction' },
  { value: 'sci-fi', label: 'Sci-Fi', category: 'fiction' },
  { value: 'fantasy', label: 'Fantasy', category: 'fiction' },
  { value: 'action', label: 'Action', category: 'fiction' },
  { value: 'romance', label: 'Romance', category: 'fiction' },
  { value: 'mystery', label: 'Mystery', category: 'fiction' },
  { value: 'adventure', label: 'Adventure', category: 'fiction' },
  { value: 'animation', label: 'Animation', category: 'fiction' },
  { value: 'western', label: 'Western', category: 'fiction' },
  { value: 'musical', label: 'Musical', category: 'fiction' },
  { value: 'war', label: 'War', category: 'fiction' },
  { value: 'crime', label: 'Crime', category: 'fiction' },
  { value: 'family', label: 'Family', category: 'fiction' },
  { value: 'biographical', label: 'Biographical', category: 'fiction' },
  // Non-Fiction/Informational
  { value: 'documentary', label: 'Documentary', category: 'non-fiction' },
  { value: 'education', label: 'Education', category: 'non-fiction' },
  { value: 'training', label: 'Training', category: 'non-fiction' },
  { value: 'news', label: 'News', category: 'non-fiction' },
  // Conversational
  { value: 'podcast', label: 'Podcast', category: 'conversational' },
  { value: 'interview', label: 'Interview', category: 'conversational' },
]

// Helper to get genres by category
export const getGenresByCategory = (category: GenreCategory): GenreOption[] => 
  GENRE_OPTIONS.filter(g => g.category === category)

// Legacy flat options for backward compatibility
export const GENRE_OPTIONS_FLAT: { value: PrimaryGenre; label: string }[] = 
  GENRE_OPTIONS.map(({ value, label }) => ({ value, label }))

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

export const REGION_OPTIONS: { value: TargetRegion; label: string }[] = [
  { value: 'global', label: 'Global' },
  { value: 'north-america', label: 'North America' },
  { value: 'europe', label: 'Europe' },
  { value: 'asia-pacific', label: 'Asia-Pacific' },
  { value: 'southeast-asia', label: 'Southeast Asia' },
  { value: 'latin-america', label: 'Latin America' },
  { value: 'middle-east-africa', label: 'Middle East & Africa' },
  { value: 'oceania', label: 'Oceania' },
]

export const AGE_RANGE_OPTIONS: { value: TargetAgeRange; label: string }[] = [
  { value: 'general-all-ages', label: 'All ages' },
  { value: 'teens-13-17', label: 'Teens (13–17)' },
  { value: 'young-adult-18-24', label: 'Young adult (18–24)' },
  { value: 'millennials-25-34', label: '25–34' },
  { value: 'gen-x-35-54', label: '35–54' },
  { value: 'boomers-55+', label: '55+' },
  { value: 'family-all-ages', label: 'Family' },
  { value: 'mature-21+', label: 'Mature (21+)' },
]

export const GENDER_OPTIONS: { value: TargetGender; label: string }[] = [
  { value: 'all-genders', label: 'All genders' },
  { value: 'women-primary', label: 'Women (primary)' },
  { value: 'men-primary', label: 'Men (primary)' },
  { value: 'women-leaning', label: 'Women-leaning' },
  { value: 'men-leaning', label: 'Men-leaning' },
  { value: 'non-binary-inclusive', label: 'Inclusive / non-binary' },
]

export const EDUCATION_OPTIONS: { value: TargetEducationLevel; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'secondary', label: 'Secondary school' },
  { value: 'some-college', label: 'Some college' },
  { value: 'college-educated', label: 'College educated' },
  { value: 'graduate-professional', label: 'Graduate / professional' },
  { value: 'vocational-trade', label: 'Vocational / trade' },
]

export const COMMUNITY_OPTIONS: { value: TargetCommunity; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'urban-metropolitan', label: 'Urban' },
  { value: 'suburban', label: 'Suburban' },
  { value: 'rural', label: 'Rural' },
  { value: 'academic-university', label: 'Academic' },
  { value: 'family-parenting', label: 'Family' },
  { value: 'professional-workplace', label: 'Professional' },
  { value: 'faith-community', label: 'Faith-based' },
  { value: 'fandom-niche', label: 'Fandom / niche' },
  { value: 'diaspora-cultural', label: 'Diaspora / cultural' },
]

const AGE_RANGE_TO_DEMOGRAPHIC: Record<TargetAgeRange, TargetDemographic> = {
  'general-all-ages': 'general-audience',
  'teens-13-17': 'teens-13-17',
  'young-adult-18-24': 'gen-z-18-24',
  'millennials-25-34': 'millennials-25-34',
  'gen-x-35-54': 'gen-x-35-54',
  'boomers-55+': 'boomers-55+',
  'family-all-ages': 'family-all-ages',
  'mature-21+': 'mature-21+',
}

const DEMOGRAPHIC_TO_AGE_RANGE: Partial<Record<TargetDemographic, TargetAgeRange>> = {
  'general-audience': 'general-all-ages',
  'teens-13-17': 'teens-13-17',
  'gen-z-18-24': 'young-adult-18-24',
  'millennials-25-34': 'millennials-25-34',
  'gen-x-35-54': 'gen-x-35-54',
  'boomers-55+': 'boomers-55+',
  'family-all-ages': 'family-all-ages',
  'mature-21+': 'mature-21+',
}

/** Map age range to legacy demographic for scoring checklist */
export function ageRangeToDemographic(ageRange: TargetAgeRange): TargetDemographic {
  return AGE_RANGE_TO_DEMOGRAPHIC[ageRange] ?? 'millennials-25-34'
}

export function demographicToAgeRange(demo: TargetDemographic): TargetAgeRange {
  return DEMOGRAPHIC_TO_AGE_RANGE[demo] ?? 'millennials-25-34'
}

/** Merge partial / legacy intent with defaults */
export function normalizeAudienceIntent(
  partial?: Partial<AudienceIntent> | null
): AudienceIntent {
  const base = { ...DEFAULT_INTENT, ...partial }
  const ageRange =
    partial?.ageRange ??
    (partial?.targetDemographic
      ? demographicToAgeRange(partial.targetDemographic)
      : base.ageRange)
  return {
    ...base,
    ageRange,
    targetDemographic: ageRangeToDemographic(ageRange),
    region: partial?.region ?? base.region ?? DEFAULT_INTENT.region,
    gender: partial?.gender ?? base.gender ?? DEFAULT_INTENT.gender,
    educationLevel:
      partial?.educationLevel ?? base.educationLevel ?? DEFAULT_INTENT.educationLevel,
    community: partial?.community ?? base.community ?? DEFAULT_INTENT.community,
  }
}

function labelFor<T extends string>(
  value: T,
  options: { value: T; label: string }[]
): string {
  return options.find((o) => o.value === value)?.label ?? value.replace(/-/g, ' ')
}

/** Human-readable target audience block for LLM prompts */
export function formatTargetAudienceForPrompt(intent: AudienceIntent): string {
  return [
    `Region: ${labelFor(intent.region, REGION_OPTIONS)}`,
    `Age: ${labelFor(intent.ageRange, AGE_RANGE_OPTIONS)}`,
    `Gender: ${labelFor(intent.gender, GENDER_OPTIONS)}`,
    `Education: ${labelFor(intent.educationLevel, EDUCATION_OPTIONS)}`,
    `Community: ${labelFor(intent.community, COMMUNITY_OPTIONS)}`,
  ].join(' | ')
}

export const DEFAULT_TARGET_AUDIENCE: AudienceTargetProfile = {
  region: 'global',
  ageRange: 'millennials-25-34',
  gender: 'all-genders',
  educationLevel: 'general',
  community: 'general',
}

export function normalizeTargetAudience(
  partial?: Partial<AudienceTargetProfile> | null
): AudienceTargetProfile {
  return { ...DEFAULT_TARGET_AUDIENCE, ...partial }
}

export function targetAudienceToPromptString(profile: AudienceTargetProfile): string {
  return formatTargetAudienceForPrompt(normalizeAudienceIntent(profile))
}

// =============================================================================
// AUDIENCE DEFINITION (project-level, Blueprint + Script)
// =============================================================================

export type AudienceDefinitionSource = 'blueprint' | 'script' | 'manual' | 'series'

/**
 * Structured cultural / specificity signals extracted from the free-text
 * audience description. Captures the nuance a coarse region bucket loses so
 * resonance analysis can validate concrete cultural fit (e.g. Thai names,
 * language, customs, faith) instead of generic appeal.
 */
export interface AudienceCulturalSignals {
  /** Named cultures / ethnicities, e.g. ["Thai"] */
  cultures?: string[]
  /** Countries / regions / cities, e.g. ["Thailand"] */
  locales?: string[]
  /** Languages / dialects, e.g. ["Thai"] */
  languages?: string[]
  /** Religions / faith traditions, e.g. ["Theravada Buddhism"] */
  faith?: string[]
  /** Subcultures / fandoms / professions, e.g. ["Muay Thai fighters"] */
  subcultures?: string[]
  /** Core values the audience holds */
  values?: string[]
  /** Cultural taboos / sensitivities to avoid */
  sensitivities?: string[]
}

export interface AudienceDefinition {
  /**
   * Canonical, free-text audience description (speech or typing). Preferred
   * over the structured profile for all resonance prompts.
   */
  description: string
  profile: AudienceTargetProfile
  presetId?: string
  customDirection?: string
  /** True when the description was clarified / enhanced by the AI refine step */
  aiEnhanced?: boolean
  /** Structured cultural signals extracted from the description */
  culturalSignals?: AudienceCulturalSignals
  updatedAt: string
  source: AudienceDefinitionSource
}

/** Build a readable description from a structured profile (backward-compat) */
export function describeProfile(profile: AudienceTargetProfile): string {
  const intent = normalizeAudienceIntent(profile)
  return formatTargetAudienceForPrompt(intent)
}

function normalizeStringList(input: unknown): string[] | undefined {
  if (!Array.isArray(input)) return undefined
  const cleaned = input
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter((v) => v.length > 0)
  return cleaned.length > 0 ? Array.from(new Set(cleaned)) : undefined
}

export function normalizeCulturalSignals(
  raw?: Partial<AudienceCulturalSignals> | null
): AudienceCulturalSignals | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const signals: AudienceCulturalSignals = {
    cultures: normalizeStringList(raw.cultures),
    locales: normalizeStringList(raw.locales),
    languages: normalizeStringList(raw.languages),
    faith: normalizeStringList(raw.faith),
    subcultures: normalizeStringList(raw.subcultures),
    values: normalizeStringList(raw.values),
    sensitivities: normalizeStringList(raw.sensitivities),
  }
  const hasAny = Object.values(signals).some((v) => v && v.length > 0)
  if (!hasAny) return undefined
  // Strip empty keys for cleaner persistence
  return Object.fromEntries(
    Object.entries(signals).filter(([, v]) => v && v.length > 0)
  ) as AudienceCulturalSignals
}

export function hasCulturalSignals(
  signals?: AudienceCulturalSignals | null
): signals is AudienceCulturalSignals {
  if (!signals) return false
  return Object.values(signals).some((v) => Array.isArray(v) && v.length > 0)
}

export function createAudienceDefinition(
  partial: Partial<AudienceDefinition> & { profile?: Partial<AudienceTargetProfile> }
): AudienceDefinition {
  const profile = normalizeTargetAudience(partial.profile)
  const description =
    typeof partial.description === 'string' && partial.description.trim()
      ? partial.description.trim()
      : describeProfile(profile)
  return {
    description,
    profile,
    presetId: partial.presetId,
    customDirection: partial.customDirection?.trim() || undefined,
    aiEnhanced: partial.aiEnhanced ?? false,
    culturalSignals: normalizeCulturalSignals(partial.culturalSignals),
    updatedAt: partial.updatedAt || new Date().toISOString(),
    source: partial.source || 'blueprint',
  }
}

/** Render extracted cultural signals as prompt lines */
export function formatCulturalSignalsForPrompt(
  signals?: AudienceCulturalSignals | null
): string {
  if (!hasCulturalSignals(signals)) return ''
  const parts: string[] = []
  const add = (label: string, list?: string[]) => {
    if (list && list.length > 0) parts.push(`${label}: ${list.join(', ')}`)
  }
  add('Cultures', signals.cultures)
  add('Locales', signals.locales)
  add('Languages', signals.languages)
  add('Faith / traditions', signals.faith)
  add('Subcultures / communities', signals.subcultures)
  add('Core values', signals.values)
  add('Sensitivities to avoid', signals.sensitivities)
  return parts.join('\n')
}

/** Build prompt block from saved audience definition (description-first) */
export function formatAudienceDefinitionForPrompt(def: AudienceDefinition): string {
  const lines: string[] = []
  const description = def.description?.trim()
  if (description) {
    lines.push(`Audience description: ${description}`)
  } else {
    lines.push(formatTargetAudienceForPrompt(normalizeAudienceIntent(def.profile)))
  }
  const culturalBlock = formatCulturalSignalsForPrompt(def.culturalSignals)
  if (culturalBlock) {
    lines.push('Cultural specificity:')
    lines.push(culturalBlock)
  }
  if (def.customDirection?.trim()) {
    lines.push(`User analysis direction: ${def.customDirection.trim()}`)
  }
  return lines.join('\n')
}

/** Migrate legacy AudienceIntent target fields → AudienceDefinition */
export function audienceDefinitionFromIntent(
  intent?: Partial<AudienceIntent> | null,
  customDirection?: string
): AudienceDefinition {
  const normalized = normalizeAudienceIntent(intent)
  return createAudienceDefinition({
    profile: {
      region: normalized.region,
      ageRange: normalized.ageRange,
      gender: normalized.gender,
      educationLevel: normalized.educationLevel,
      community: normalized.community,
    },
    customDirection,
    source: 'blueprint',
  })
}

// =============================================================================
// BLUEPRINT AUDIENCE RESONANCE v3 (deduct-from-100)
// =============================================================================

export type BlueprintRecommendationPriority = 'critical' | 'high' | 'medium' | 'low' | 'optional'

export type BlueprintFixSection = 'core' | 'story' | 'tone' | 'beats' | 'characters'

export interface BlueprintAudienceDeduction {
  reason: string
  points: number
  category: string
  priority?: BlueprintRecommendationPriority
}

export interface BlueprintAudienceRecommendation {
  id: string
  text: string
  title?: string
  priority: BlueprintRecommendationPriority
  pointsDeducted: number
  fixSection: BlueprintFixSection
  category?: string
  /** Sections that must be reconciled when applying this fix */
  impactSections?: BlueprintFixSection[]
  /** Short label for guided revision UI chips */
  intentLabel?: string
}

export interface BlueprintAudienceCategory {
  name: string
  score: number
  weight: number
}

export interface BlueprintAudienceResonanceAnalysis {
  version: 3
  treatmentId: string
  overallScore: number
  baseScore: 100
  deductions: BlueprintAudienceDeduction[]
  recommendations: BlueprintAudienceRecommendation[]
  categories: BlueprintAudienceCategory[]
  strengths: string[]
  improvements: string[]
  summary: string
  audienceDefinition: AudienceDefinition
  isReadyForProduction: boolean
  generatedAt: string
  creditsUsed: number
}

export const BLUEPRINT_AR_CATEGORY_WEIGHTS: Record<string, number> = {
  'Audience Appeal': 25,
  'Genre & Tone Fit': 20,
  'Concept Hook': 20,
  'Character Connection': 20,
  'Clarity & Structure': 15,
}

export const READY_FOR_PRODUCTION_THRESHOLD_V3 = 80

export interface PersistedBlueprintAudienceResonance {
  analysis: BlueprintAudienceResonanceAnalysis | null
  audienceDefinition: AudienceDefinition
  appliedRecommendationIds: string[]
  iterationCount: number
  lastAnalyzedAt: string | null
  lastSavedAt: string
}

export function createPersistedBlueprintAR(
  analysis: BlueprintAudienceResonanceAnalysis | null,
  audienceDefinition: AudienceDefinition,
  appliedRecommendationIds: string[] = [],
  iterationCount = 0
): PersistedBlueprintAudienceResonance {
  return {
    analysis,
    audienceDefinition,
    appliedRecommendationIds,
    iterationCount,
    lastAnalyzedAt: analysis?.generatedAt ?? null,
    lastSavedAt: new Date().toISOString(),
  }
}

/** Load v3 state from project metadata with legacy v2 fallback */
/** Staged rollout: set NEXT_PUBLIC_BLUEPRINT_AR_V3=0 to use legacy Blueprint AR panel */
export function isBlueprintARV3Enabled(): boolean {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_BLUEPRINT_AR_V3 === '0') {
    return false
  }
  return true
}

export function loadBlueprintARFromMetadata(metadata: Record<string, unknown> | null | undefined): {
  audienceDefinition: AudienceDefinition | null
  persisted: PersistedBlueprintAudienceResonance | null
} {
  if (!metadata) return { audienceDefinition: null, persisted: null }

  const v3 = metadata.blueprintAudienceResonance as PersistedBlueprintAudienceResonance | undefined
  const v3Def = metadata.audienceDefinition as AudienceDefinition | undefined
  if (v3Def) {
    return {
      audienceDefinition: createAudienceDefinition(v3Def),
      persisted: v3
        ? {
            ...v3,
            audienceDefinition: createAudienceDefinition(v3Def),
          }
        : null,
    }
  }

  const legacy = metadata.audienceResonance as {
    intent?: AudienceIntent
    analysis?: { version?: number }
  } | undefined
  if (legacy?.intent) {
    const audienceDefinition = audienceDefinitionFromIntent(legacy.intent)
    return { audienceDefinition, persisted: null }
  }

  return { audienceDefinition: null, persisted: null }
}

export const DEFAULT_INTENT: AudienceIntent = {
  primaryGenre: 'drama',
  targetDemographic: 'millennials-25-34',
  toneProfile: 'dark-gritty',
  ...DEFAULT_TARGET_AUDIENCE,
}

// =============================================================================
// TARGET SCORE PROFILE
// Defines intent-specific scoring targets for a stable path to 90+
// =============================================================================

export interface TargetScoreProfile {
  intent: AudienceIntent
  
  // Per-axis target scores for this intent combination (what 90+ looks like)
  axisTargets: {
    originality: number
    genreFidelity: number
    characterDepth: number
    pacing: number
    commercialViability: number
  }
  
  // Weight modifiers for this genre (multipliers, 1.0 = default)
  axisWeightModifiers: {
    originality: number
    genreFidelity: number
    characterDepth: number
    pacing: number
    commercialViability: number
  }
  
  // Minimum passing scores per checkpoint (some checkpoints less critical for certain genres)
  checkpointMinimums: Record<string, number>
  
  // Overall target to consider "ready"
  readyThreshold: number
  
  // Created timestamp
  createdAt: string
}

/**
 * Generate a TargetScoreProfile for a given intent.
 * This defines what a 90+ score looks like for this genre/audience/tone combination.
 */
export function getTargetProfileForIntent(intent: AudienceIntent): TargetScoreProfile {
  // Genre-specific weight adjustments
  const genreWeights: Partial<Record<PrimaryGenre, Partial<TargetScoreProfile['axisWeightModifiers']>>> = {
    'horror': {
      genreFidelity: 1.3,  // Genre conventions critical for horror
      pacing: 1.2,         // Pacing crucial for suspense
      characterDepth: 0.9  // Slightly less critical
    },
    'drama': {
      characterDepth: 1.4, // Character is everything in drama
      genreFidelity: 0.9,  // Less rigid conventions
      originality: 1.1
    },
    'thriller': {
      pacing: 1.3,         // Pacing essential
      genreFidelity: 1.2,
      commercialViability: 1.1
    },
    'comedy': {
      originality: 1.2,    // Fresh jokes matter
      genreFidelity: 1.1,
      pacing: 1.2          // Timing is everything
    },
    'action': {
      pacing: 1.3,
      commercialViability: 1.2,
      genreFidelity: 1.1
    },
    'romance': {
      characterDepth: 1.3,
      genreFidelity: 1.2,
      originality: 1.0
    },
    'sci-fi': {
      originality: 1.4,    // World-building crucial
      genreFidelity: 1.0,
      commercialViability: 0.9
    },
    'fantasy': {
      originality: 1.3,
      characterDepth: 1.1,
      genreFidelity: 1.0
    }
  }

  // Tone-specific adjustments
  const toneAdjustments: Partial<Record<ToneProfile, Partial<TargetScoreProfile['axisWeightModifiers']>>> = {
    'inspirational': {
      characterDepth: 1.2,
      originality: 1.0
    },
    'dark-gritty': {
      genreFidelity: 1.1,
      pacing: 1.1
    },
    'light-comedic': {
      originality: 1.1,
      pacing: 1.2
    },
    'suspenseful': {
      pacing: 1.3,
      genreFidelity: 1.1
    }
  }

  // Default weights
  const baseWeights = {
    originality: 1.0,
    genreFidelity: 1.0,
    characterDepth: 1.0,
    pacing: 1.0,
    commercialViability: 1.0
  }

  // Apply genre weights
  const genreModifiers = genreWeights[intent.primaryGenre] || {}
  const afterGenre = { ...baseWeights, ...genreModifiers }

  // Apply tone adjustments (additive, not replacement)
  const toneModifiers = toneAdjustments[intent.toneProfile] || {}
  const finalWeights = {
    originality: afterGenre.originality * (toneModifiers.originality || 1.0),
    genreFidelity: afterGenre.genreFidelity * (toneModifiers.genreFidelity || 1.0),
    characterDepth: afterGenre.characterDepth * (toneModifiers.characterDepth || 1.0),
    pacing: afterGenre.pacing * (toneModifiers.pacing || 1.0),
    commercialViability: afterGenre.commercialViability * (toneModifiers.commercialViability || 1.0)
  }

  // Target scores for 90+ (what each axis should aim for)
  const axisTargets = {
    originality: 85,
    genreFidelity: 90,
    characterDepth: 85,
    pacing: 88,
    commercialViability: 85
  }

  return {
    intent,
    axisTargets,
    axisWeightModifiers: finalWeights,
    checkpointMinimums: {}, // Can be extended per-genre
    readyThreshold: 80,
    createdAt: new Date().toISOString()
  }
}
