import type {
  AudienceDefinition,
  BlueprintAudienceRecommendation,
  BlueprintAudienceResonanceAnalysis,
  BlueprintFixSection,
} from '@/lib/types/audienceResonance'

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
  revisedVariant?: Record<string, unknown>
  changePlan?: BlueprintChangePlan
  diff?: FieldDiff[]
  narrativeReasoning?: {
    user_adjustments?: string
    key_decisions?: Array<{ decision: string; why: string; impact: string }>
  }
  incompleteBalance?: boolean
  creditsUsed?: number
  message?: string
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
  themes: 'Themes',
  mood_references: 'Mood References',
  beats: 'Story Beats',
  character_descriptions: 'Characters',
  total_duration_seconds: 'Duration',
  estimatedDurationMinutes: 'Est. Runtime',
}

export const SECTION_FIELDS: Record<BlueprintFixSection, string[]> = {
  core: ['title', 'logline', 'genre', 'format_length', 'target_audience'],
  story: ['synopsis', 'setting', 'protagonist', 'antagonist', 'act_breakdown'],
  tone: ['tone', 'tone_description', 'style', 'visual_style', 'themes', 'mood_references'],
  beats: ['beats', 'total_duration_seconds', 'estimatedDurationMinutes'],
  characters: ['character_descriptions'],
}
