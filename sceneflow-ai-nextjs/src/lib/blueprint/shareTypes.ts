import type { AudienceDefinition } from '@/lib/types/audienceResonance'
import type { BlueprintFixSection } from '@/lib/types/audienceResonance'

export type BlueprintSectionAudioEntry = {
  url: string
  durationMs?: number
  textHash: string
}

export type BlueprintSectionAudioMap = Partial<
  Record<BlueprintFixSection, BlueprintSectionAudioEntry>
>

export type BlueprintSectionAudioStatus =
  | 'pending'
  | 'ready'
  | 'partial'
  | 'failed'
  | 'skipped'

export type BlueprintFeedbackSection = {
  score?: number
  strengths?: string
  concerns?: string
  suggestions?: string
  tags?: string[]
}

export type BlueprintFeedbackSections = Partial<
  Record<BlueprintFixSection, BlueprintFeedbackSection>
>

export type BlueprintShareSettings = {
  expiresAt?: string
  allowTts?: boolean
  collectEmail?: boolean
}

export type BlueprintSessionPayload = {
  type: 'blueprint'
  projectId: string
  variantId: string
  treatment: Record<string, unknown>
  heroImageUrl?: string
  audienceDefinition?: AudienceDefinition | null
  shareSettings?: BlueprintShareSettings
  lastSynthesis?: {
    recommendations: unknown[]
    synthesizedAt: string
  }
  ownerDisplayName?: string
  sectionAudio?: BlueprintSectionAudioMap
  sectionAudioStatus?: BlueprintSectionAudioStatus
  sectionAudioVoiceId?: string
  sectionAudioGeneratedAt?: string
}

export type BlueprintShareCreateBody = {
  projectId: string
  variantId: string
  treatment: Record<string, unknown>
  heroImageUrl?: string
  audienceDefinition?: AudienceDefinition | null
  expiresInDays?: number
  /** Pre-login localStorage authUserId when project ownership was not synced yet */
  legacyOwnerId?: string
}

export type BlueprintStructuredFeedbackInput = {
  participantId?: string
  reviewerName: string
  reviewerEmail?: string
  overallScore?: number
  preferred?: boolean
  sections?: BlueprintFeedbackSections
  freeformNotes?: string
}
