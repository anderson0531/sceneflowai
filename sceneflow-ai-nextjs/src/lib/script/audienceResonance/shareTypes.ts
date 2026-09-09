import type { BlueprintSectionAudioEntry, BlueprintSectionAudioStatus } from '@/lib/blueprint/shareTypes'
import type { SharedScriptARReview } from './sanitizeShareReview'

export type ScriptARShareSection = 'overview' | 'analysis' | 'recommendations'

export type ScriptARSectionAudioMap = Partial<Record<ScriptARShareSection, BlueprintSectionAudioEntry>>
export type ScriptARSectionTranslationsMap = Partial<Record<ScriptARShareSection, string>>

export type ScriptARSessionPayload = {
  type: 'script-resonance'
  projectId: string
  projectTitle?: string
  review: SharedScriptARReview
  shareSettings: {
    allowFeedback: false
    neverExpires: true
    allowTts?: boolean
  }
  ownerDisplayName?: string
  sectionAudioByLanguage?: Record<string, ScriptARSectionAudioMap>
  sectionTranslations?: Record<string, ScriptARSectionTranslationsMap>
  sectionAudioLanguage?: string
  sectionAudioStatus?: BlueprintSectionAudioStatus
  sectionAudioVoiceId?: string
  sectionAudioStartedAt?: string
  sectionAudioGeneratedAt?: string
}

export type ScriptARShareCreateBody = {
  projectId: string
  forceNew?: boolean
  language?: string
  voiceId?: string
}
