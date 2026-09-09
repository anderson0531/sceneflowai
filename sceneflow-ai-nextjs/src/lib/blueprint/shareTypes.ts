import type { AudienceDefinition } from '@/lib/types/audienceResonance'
import type { BlueprintFixSection } from '@/lib/types/audienceResonance'
import type { SharedBlueprintARSnapshot } from './sanitizeShareAR'

export type BlueprintSectionAudioEntry = {
  url: string
  durationMs?: number
  textHash: string
}

export type BlueprintSectionAudioMap = Partial<
  Record<BlueprintFixSection, BlueprintSectionAudioEntry>
>

export type BlueprintSectionAudioStatus =
  | 'idle'
  | 'pending'
  | 'ready'
  | 'partial'
  | 'failed'
  | 'skipped'

/** Per-language reviewer-readable section copy (plain text, no TTS tags). */
export type BlueprintSectionTranslationsMap = Partial<
  Record<BlueprintFixSection, string>
>

export type BlueprintSectionAudioByLanguage = Record<string, BlueprintSectionAudioMap>

export type BlueprintSectionTranslationsByLanguage = Record<
  string,
  BlueprintSectionTranslationsMap
>

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
  /** Default true. When false, hide and reject review/chat/register. */
  allowFeedback?: boolean
  /** When true, CollabSession.expires_at stays null. */
  neverExpires?: boolean
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
  /** Legacy flat map; migrated to sectionAudioByLanguage.en on read. */
  sectionAudio?: BlueprintSectionAudioMap
  sectionAudioByLanguage?: BlueprintSectionAudioByLanguage
  sectionTranslations?: BlueprintSectionTranslationsByLanguage
  /** Last language used for generation (reviewer default). */
  sectionAudioLanguage?: string
  sectionAudioStatus?: BlueprintSectionAudioStatus
  sectionAudioVoiceId?: string
  sectionAudioDirectorNotes?: string
  sectionAudioGeneratedAt?: string
  /** Set when generation enters pending; used for stale-job recovery. */
  sectionAudioStartedAt?: string
  /** Snapshot of Blueprint AR at share-create time (listen-only and review). */
  blueprintAudienceResonance?: SharedBlueprintARSnapshot | null
  resonanceAudioByLanguage?: Record<string, BlueprintSectionAudioEntry>
  resonanceTranslations?: Record<string, string>
}

export type BlueprintShareCreateBody = {
  projectId: string
  variantId: string
  treatment: Record<string, unknown>
  heroImageUrl?: string
  audienceDefinition?: AudienceDefinition | null
  expiresInDays?: number
  /** When false (default), reuse active share link for this project if one exists. */
  forceNew?: boolean
  /** Pre-login localStorage authUserId when project ownership was not synced yet */
  legacyOwnerId?: string
  allowFeedback?: boolean
  neverExpires?: boolean
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
