import { getSceneBeats } from '@/lib/script/beatMigration'
import type { SceneBeat } from '@/lib/script/segmentTypes'
import {
  getConfiguredStreamLanguages,
  type ProjectStream,
} from '@/lib/streams/projectStreams'
import type { SceneTranslation } from '@/lib/storyboard/playerTranslations'

export type BeatCaptionTranslationsByLanguage = Record<
  string,
  Record<number, SceneTranslation>
>

export async function translateCaptionText(
  text: string,
  targetLanguage: string
): Promise<string | null> {
  const response = await fetch('/api/translate/vertex', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      targetLanguage,
      sourceLanguage: 'en',
    }),
  })
  if (!response.ok) return null
  const data = (await response.json()) as { translatedText?: string }
  return data.translatedText?.trim() || null
}

/**
 * Languages that should receive auto-translated beat captions.
 * Prefers Production Streams; falls back to legacy audio/translation keys.
 */
export function collectCaptionTargetLanguages(
  scenes: unknown[],
  storedTranslations?: BeatCaptionTranslationsByLanguage,
  projectStreams?: ProjectStream[]
): string[] {
  const langs = new Set<string>()

  for (const lang of getConfiguredStreamLanguages(projectStreams || [])) {
    if (lang !== 'en') langs.add(lang)
  }

  Object.keys(storedTranslations || {}).forEach((lang) => {
    if (lang !== 'en') langs.add(lang)
  })

  scenes.forEach((scene) => {
    const s = scene as {
      dialogueAudio?: Record<string, unknown>
      narrationAudio?: Record<string, unknown>
    }
    if (s?.dialogueAudio && typeof s.dialogueAudio === 'object') {
      Object.keys(s.dialogueAudio).forEach((lang) => {
        if (lang !== 'en') langs.add(lang)
      })
    }
    if (s?.narrationAudio && typeof s.narrationAudio === 'object') {
      Object.keys(s.narrationAudio).forEach((lang) => {
        if (lang !== 'en') langs.add(lang)
      })
    }
  })

  return Array.from(langs).sort()
}

/**
 * Remove beat caption overrides from all language translation maps for a scene.
 */
export async function purgeBeatCaptionTranslations(params: {
  beatId: string
  sceneIdx: number
  storedTranslations: BeatCaptionTranslationsByLanguage
  onSaveTranslations: (
    langCode: string,
    translations: Record<number, SceneTranslation>
  ) => Promise<void>
}): Promise<void> {
  const saves = Object.keys(params.storedTranslations)
    .filter((lang) => lang && lang !== 'en')
    .map(async (lang) => {
      const langMap = { ...(params.storedTranslations[lang] || {}) }
      const sceneTrans = langMap[params.sceneIdx]
      if (!sceneTrans?.beatsByBeatId?.[params.beatId]) return

      const beatsByBeatId = { ...sceneTrans.beatsByBeatId }
      delete beatsByBeatId[params.beatId]

      langMap[params.sceneIdx] = {
        ...sceneTrans,
        beatsByBeatId: Object.keys(beatsByBeatId).length > 0 ? beatsByBeatId : undefined,
      }
      await params.onSaveTranslations(lang, langMap)
    })

  await Promise.all(saves)
}

/**
 * Auto-translate an English beat caption into active language streams.
 * Skips languages with manual overrides unless the English source changed.
 */
export async function autoTranslateBeatCaption(params: {
  englishText: string
  beatId: string
  sceneIdx: number
  targetLanguages: string[]
  storedTranslations: BeatCaptionTranslationsByLanguage
  previousEnglishText?: string
  /** When true, re-translate even if overlayEdited (e.g. user clicked Auto-translate). */
  forceRetranslate?: boolean
  onSaveTranslations: (
    langCode: string,
    translations: Record<number, SceneTranslation>
  ) => Promise<void>
}): Promise<void> {
  const englishText = params.englishText.trim()
  if (!englishText) {
    await purgeBeatCaptionTranslations({
      beatId: params.beatId,
      sceneIdx: params.sceneIdx,
      storedTranslations: params.storedTranslations,
      onSaveTranslations: params.onSaveTranslations,
    })
    return
  }

  const englishChanged =
    (params.previousEnglishText?.trim() || '') !== englishText

  const saves = params.targetLanguages
    .filter((lang) => lang && lang !== 'en')
    .map(async (lang) => {
      const langMap = { ...(params.storedTranslations[lang] || {}) }
      const sceneTrans = { ...(langMap[params.sceneIdx] || {}) }
      const beatsByBeatId = { ...(sceneTrans.beatsByBeatId || {}) }
      const existing = beatsByBeatId[params.beatId]

      if (
        !params.forceRetranslate &&
        existing?.overlayEdited &&
        !englishChanged &&
        existing.overlayText?.trim()
      ) {
        return
      }

      const translated = await translateCaptionText(englishText, lang)
      if (!translated) return

      beatsByBeatId[params.beatId] = {
        overlayText: translated,
        overlayEdited: false,
      }
      langMap[params.sceneIdx] = { ...sceneTrans, beatsByBeatId }
      await params.onSaveTranslations(lang, langMap)
    })

  await Promise.all(saves)
}

/**
 * Backfill beat caption translations for a newly added language stream.
 */
export async function backfillBeatCaptionsForLanguage(params: {
  language: string
  scenes: unknown[]
  storedTranslations: BeatCaptionTranslationsByLanguage
  onSaveTranslations: (
    langCode: string,
    translations: Record<number, SceneTranslation>
  ) => Promise<void>
}): Promise<number> {
  const language = params.language?.trim()
  if (!language || language === 'en') return 0

  const langMap = { ...(params.storedTranslations[language] || {}) }
  let translatedCount = 0

  for (let sceneIdx = 0; sceneIdx < params.scenes.length; sceneIdx++) {
    const scene = params.scenes[sceneIdx]
    const beats = getSceneBeats(scene as Record<string, unknown>)
    const sceneTrans = { ...(langMap[sceneIdx] || {}) }
    const beatsByBeatId = { ...(sceneTrans.beatsByBeatId || {}) }
    let sceneChanged = false

    for (const beat of beats) {
      const englishText = (beat as SceneBeat).overlayText?.trim()
      if (!englishText) continue

      const beatId = (beat as SceneBeat).beatId
      const existing = beatsByBeatId[beatId]
      if (existing?.overlayEdited && existing.overlayText?.trim()) {
        continue
      }

      const translated = await translateCaptionText(englishText, language)
      if (!translated) continue

      beatsByBeatId[beatId] = {
        overlayText: translated,
        overlayEdited: false,
      }
      sceneChanged = true
      translatedCount += 1
    }

    if (sceneChanged) {
      langMap[sceneIdx] = {
        ...sceneTrans,
        beatsByBeatId,
      }
    }
  }

  if (translatedCount > 0) {
    await params.onSaveTranslations(language, langMap)
  }

  return translatedCount
}
