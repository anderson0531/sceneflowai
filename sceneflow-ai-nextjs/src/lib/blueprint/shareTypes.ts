import type { AudienceDefinition } from '@/lib/types/audienceResonance'
import type { BlueprintFixSection } from '@/lib/types/audienceResonance'
import type { SharedBlueprintARSnapshot } from './sanitizeShareAR'
import type { BrandProfileSnapshot } from '@/lib/producer/producerProfileService'

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

export type BlueprintBeatAudioMap = Record<string, BlueprintSectionAudioEntry>

export type BlueprintBeatAudioByLanguage = Record<string, BlueprintBeatAudioMap>

export type BlueprintBeatTranslationsByLanguage = Record<string, Record<string, string>>

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

export type BlueprintApprovalStatus =
  | 'pending_review'
  | 'changes_requested'
  | 'approved'

export type BlueprintShareAccessRole =
  | 'primary_customer'
  | 'guest_reviewer'
  | 'standard'

export type BlueprintGuestFeedbackStatus = 'pending' | 'applied' | 'dismissed'

export type BlueprintGuestFeedbackItem = {
  id: string
  reviewerName: string
  overallScore: number | null
  sections: BlueprintFeedbackSections | null
  freeformNotes: string | null
  createdAt: string
  status: BlueprintGuestFeedbackStatus
}

export type BlueprintClientClarificationDraft = {
  id: string
  rawFeedback: string
  clarifiedSummary: string
  proposedChanges: string[]
  targetSections: BlueprintFixSection[]
  selectedFeedbackIds?: string[]
  selectedRecommendationIds?: string[]
  createdAt: string
}

export type BlueprintShareSettings = {
  expiresAt?: string
  allowTts?: boolean
  collectEmail?: boolean
  /** Default true. When false, hide and reject review/chat/register. */
  allowFeedback?: boolean
  /** When true, CollabSession.expires_at stays null. */
  neverExpires?: boolean
  /** Service Provider client-mode review settings. */
  clientMode?: boolean
  /** Enables self-serve AI-filtered Blueprint Director revisions (up to maxFeedbackRounds, default 4) + automated Audience Resonance passes (up to maxArIterations, default 3). */
  clientAutoReviseMode?: boolean
  /** Strips Audience Resonance from client share view (Producer-only control). */
  hideAudienceResonance?: boolean
  /** Separate comment-only token for family/stakeholders so only the primary customer can revise or approve. */
  guestShareToken?: string
  /** Maximum customer revision rounds allowed on this link. */
  maxFeedbackRounds?: number
  /** Customer revision rounds consumed so far. */
  roundsUsed?: number
  /** Maximum automated Audience Resonance passes allowed on this link (default 3). */
  maxArIterations?: number
  /** Automated Audience Resonance passes consumed so far. */
  arIterationsUsed?: number
  /** Self-serve extra iteration pack tracking & pricing overrides. */
  extraIterationPacksPurchased?: number
  extraIterationRevenueUsd?: number
  iterationPackPriceUsd?: number
  iterationPackRevisions?: number
  iterationPackArPasses?: number
  iterationPackCheckoutUrl?: string
  customerEmail?: string
  customerName?: string
  blueprintDepositUsd?: number
  approvalStatus?: BlueprintApprovalStatus
  approvedByName?: string
  approvedAt?: string
  brandProfileSnapshot?: BrandProfileSnapshot | null
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
  /** Per-beat narrated storyboard audio indexed by language -> String(beatIndex). */
  beatAudioByLanguage?: BlueprintBeatAudioByLanguage
  beatTranslations?: BlueprintBeatTranslationsByLanguage
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
  /** Pending AI-filtered customer feedback awaiting client confirmation before routing to Blueprint Director. */
  pendingClientClarification?: BlueprintClientClarificationDraft | null
  /** Guest feedback IDs already merged into an applied Blueprint revision by the primary customer. */
  appliedFeedbackIds?: string[]
  /** Guest feedback IDs explicitly dismissed by the primary customer during triage. */
  dismissedFeedbackIds?: string[]
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
  clientMode?: boolean
  hideAudienceResonance?: boolean
  maxFeedbackRounds?: number
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
