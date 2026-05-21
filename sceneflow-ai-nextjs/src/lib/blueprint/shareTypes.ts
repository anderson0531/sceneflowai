import type { AudienceDefinition } from '@/lib/types/audienceResonance'
import type { BlueprintFixSection } from '@/lib/types/audienceResonance'

export type BlueprintFeedbackSection = {
  score?: number
  strengths?: string
  concerns?: string
  suggestions?: string
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
}

export type BlueprintShareCreateBody = {
  projectId: string
  variantId: string
  treatment: Record<string, unknown>
  heroImageUrl?: string
  audienceDefinition?: AudienceDefinition | null
  expiresInDays?: number
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
