import type { SceneTranslation } from '@/lib/storyboard/playerTranslations'

export type BeatCaptionTranslationsByLanguage = Record<
  string,
  Record<number, SceneTranslation>
>

async function translateCaptionText(
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
  onSaveTranslations: (
    langCode: string,
    translations: Record<number, SceneTranslation>
  ) => Promise<void>
}): Promise<void> {
  const englishText = params.englishText.trim()
  if (!englishText) return

  const englishChanged =
    (params.previousEnglishText?.trim() || '') !== englishText

  const saves = params.targetLanguages
    .filter((lang) => lang && lang !== 'en')
    .map(async (lang) => {
      const langMap = { ...(params.storedTranslations[lang] || {}) }
      const sceneTrans = { ...(langMap[params.sceneIdx] || {}) }
      const beatsByBeatId = { ...(sceneTrans.beatsByBeatId || {}) }
      const existing = beatsByBeatId[params.beatId]

      if (existing?.overlayEdited && !englishChanged && existing.overlayText?.trim()) {
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
