import type {
  AudienceDefinition,
  BlueprintAudienceRecommendation,
  BlueprintAudienceResonanceAnalysis,
  BlueprintFixSection,
} from '@/lib/types/audienceResonance'
import type { ContentIntent } from '@/lib/content/contentIntent'

export type { BlueprintFixSection }

export interface GuidedReviseRequest {
  variant: Record<string, unknown>
  userIntent: string
  selectedRecommendationIds?: string[]
  resonanceRecommendations?: BlueprintAudienceRecommendation[]
  resonanceAnalysis?: BlueprintAudienceResonanceAnalysis
  audienceDefinition?: AudienceDefinition
  focusScope?: BlueprintFixSection | 'all'
  projectId?: string
  contentIntent?: ContentIntent
}

export interface BlueprintChangePlan {
  primaryGoal: string
  sectionsToUpdate: BlueprintFixSection[]
  crossSectionDependencies: string[]
  preserveConstraints: string[]
  coherenceActions: string[]
}

export interface FieldDiff {
  field: string
  label: string
  section: BlueprintFixSection
  before: string
  after: string
}

export interface GuidedReviseResponse {
  success: boolean
  /** @deprecated Prefer patch — client merges locally to avoid large responses */
  revisedVariant?: Record<string, unknown>
  patch?: Record<string, unknown>
  changePlan?: BlueprintChangePlan
  diff?: FieldDiff[]
  narrativeReasoning?: {
    user_adjustments?: string
    key_decisions?: Array<{ decision: string; why: string; impact: string }>
  }
  incompleteBalance?: boolean
  creditsUsed?: number
  message?: string
  jobId?: string
  status?: string
}

export const BLUEPRINT_FIELD_LABELS: Record<string, string> = {
  title: 'Title',
  logline: 'Logline',
  genre: 'Genre',
  format_length: 'Format / Length',
  target_audience: 'Target Audience',
  synopsis: 'Synopsis',
  setting: 'Setting',
  protagonist: 'Protagonist',
  antagonist: 'Antagonist / Conflict',
  tone_description: 'Tone',
  visual_style: 'Visual Style',
  artStyle: 'Art Style',
  aspectRatio: 'Aspect Ratio',
  themes: 'Themes',
  mood_references: 'Mood References',
  beats: 'Story Beats',
  character_descriptions: 'Characters',
  total_duration_seconds: 'Duration',
  estimatedDurationMinutes: 'Est. Runtime',
}

/**
 * Ceiling on beats carried through a revision. A flat 8 could not express a
 * long runtime — at ~2.5 minutes per beat a 40 minute blueprint needs ~16 —
 * so the tail was silently sliced off.
 */
export const MAX_BEATS = 24

export const SECTION_FIELDS: Record<BlueprintFixSection, string[]> = {
  core: ['title', 'logline', 'genre', 'format_length', 'target_audience'],
  story: ['synopsis', 'setting', 'protagonist', 'antagonist', 'act_breakdown'],
  tone: ['tone', 'tone_description', 'style', 'artStyle', 'aspectRatio', 'visual_style', 'themes', 'mood_references'],
  beats: ['beats', 'total_duration_seconds', 'estimatedDurationMinutes'],
  characters: ['character_descriptions'],
}

/**
 * Which section a free-text direction is talking about. Shared by the planner
 * and by request validation so the two cannot drift apart.
 */
export const SECTION_INTENT_PATTERNS: Record<BlueprintFixSection, RegExp> = {
  characters: /character|protagonist|antagonist|arc\b|role\b|cast\b/,
  beats: /beat|pacing|act\b|structure|duration|runtime/,
  tone: /tone|mood|theme|visual|style|art\s*style/,
  core: /logline|genre|title|format|audience|length/,
  story: /synopsis|story|setting|plot|conflict|narrative/,
}

/** Sections a direction explicitly refers to, by keyword. */
export function inferTargetedSections(text: string): BlueprintFixSection[] {
  const lower = text.toLowerCase()
  return (Object.keys(SECTION_INTENT_PATTERNS) as BlueprintFixSection[]).filter((section) =>
    SECTION_INTENT_PATTERNS[section].test(lower)
  )
}
