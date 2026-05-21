import type {
  BlueprintSectionAudioMap,
  BlueprintSessionPayload,
} from './shareTypes'
import { BLUEPRINT_SECTION_ORDER } from './sectionNarrationText'

export const DEFAULT_SHARE_AUDIO_LANGUAGE = 'en'

/** Pending without startedAt (create-only phantom) — recover sooner. */
export const PHANTOM_PENDING_MS = 5 * 60 * 1000

export function hashForLanguage(textHash: string, language: string): string {
  return `${language}:${textHash}`
}

export function normalizeShareAudioPayload(
  payload: BlueprintSessionPayload
): BlueprintSessionPayload {
  const lang = payload.sectionAudioLanguage || DEFAULT_SHARE_AUDIO_LANGUAGE
  let byLang = payload.sectionAudioByLanguage
  if (!byLang && payload.sectionAudio && Object.keys(payload.sectionAudio).length > 0) {
    byLang = { [DEFAULT_SHARE_AUDIO_LANGUAGE]: payload.sectionAudio }
  }
  if (!byLang) byLang = {}

  let status = payload.sectionAudioStatus
  if (status === 'pending' && !payload.sectionAudioStartedAt) {
    status = 'idle'
  }

  return {
    ...payload,
    sectionAudioLanguage: lang,
    sectionAudioByLanguage: byLang,
    sectionAudioStatus: status,
  }
}

export function getShareAudioLanguage(payload: BlueprintSessionPayload): string {
  return payload.sectionAudioLanguage || DEFAULT_SHARE_AUDIO_LANGUAGE
}

export function getSectionAudioForLanguage(
  payload: BlueprintSessionPayload,
  language: string
): BlueprintSectionAudioMap {
  const normalized = normalizeShareAudioPayload(payload)
  const byLang = normalized.sectionAudioByLanguage || {}
  if (byLang[language]) return byLang[language]!
  if (language === DEFAULT_SHARE_AUDIO_LANGUAGE && payload.sectionAudio) {
    return payload.sectionAudio
  }
  return {}
}

export function getSectionTranslationsForLanguage(
  payload: BlueprintSessionPayload,
  language: string
) {
  return payload.sectionTranslations?.[language]
}

export function countSectionsWithUrl(map?: BlueprintSectionAudioMap): number {
  if (!map) return 0
  return BLUEPRINT_SECTION_ORDER.filter((s) => Boolean(map[s]?.url)).length
}
