import { translateCaptionText } from '@/lib/storyboard/beatCaptionTranslations'
import type {
  SceneMixerLanguageSettings,
  SceneProductionData,
  TextOverlayData,
  TextOverlayTranslationEntry,
  TextOverlayTranslationsByLanguage,
  WatermarkConfig,
} from '@/components/vision/scene-production/types'
import {
  DEFAULT_WATERMARK_CONFIG,
  getMixerSettingsForLanguage,
  migrateMixerSettingsByLanguage,
} from '@/lib/scene/mixerSettings'

export function resolveOverlayText(
  overlay: TextOverlayData,
  language: string,
  translations?: TextOverlayTranslationsByLanguage
): { text: string; subtext?: string } {
  const lang = language?.trim() || 'en'
  if (lang === 'en') {
    return { text: overlay.text, subtext: overlay.subtext }
  }
  const entry = translations?.[lang]?.[overlay.id]
  const text = entry?.text?.trim() || overlay.text
  const subtext = entry?.subtext?.trim() || overlay.subtext
  return { text, subtext }
}

export function isOverlayUsingEnglish(
  overlay: TextOverlayData,
  language: string,
  translations?: TextOverlayTranslationsByLanguage
): boolean {
  const lang = language?.trim() || 'en'
  if (lang === 'en') return false
  const entry = translations?.[lang]?.[overlay.id]
  if (entry?.edited) return false
  return !entry?.text?.trim()
}

export function isOverlayManuallyEdited(
  translations: TextOverlayTranslationsByLanguage | undefined,
  language: string,
  overlayId: string
): boolean {
  return !!translations?.[language]?.[overlayId]?.edited
}

export function getOverlayTranslationStatus(
  overlay: TextOverlayData,
  language: string,
  translations?: TextOverlayTranslationsByLanguage
): 'Caption set' | 'Auto-translated' | 'Edited' | 'Using English' | null {
  const lang = language?.trim() || 'en'
  if (lang === 'en') return overlay.text?.trim() ? 'Caption set' : null
  const entry = translations?.[lang]?.[overlay.id]
  if (entry?.edited && entry.text?.trim()) return 'Edited'
  if (entry?.text?.trim()) return 'Auto-translated'
  if (overlay.text?.trim()) return 'Using English'
  return null
}

export function resolveWatermarkText(
  watermarkConfig: WatermarkConfig,
  language: string,
  englishConfig?: WatermarkConfig
): string {
  const lang = language?.trim() || 'en'
  if (lang === 'en') return watermarkConfig.text?.trim() || ''
  const text = watermarkConfig.text?.trim()
  if (text && watermarkConfig.textEdited) return text
  if (text && !watermarkConfig.textEdited) return text
  return englishConfig?.text?.trim() || watermarkConfig.text?.trim() || ''
}

export function getWatermarkTranslationStatus(
  watermarkConfig: WatermarkConfig,
  language: string,
  englishConfig: WatermarkConfig
): 'Auto-translated' | 'Edited' | 'Using English' | null {
  const lang = language?.trim() || 'en'
  if (lang === 'en' || watermarkConfig.type !== 'text') return null
  const english = englishConfig.text?.trim()
  if (!english) return null
  if (watermarkConfig.textEdited && watermarkConfig.text?.trim()) return 'Edited'
  if (watermarkConfig.text?.trim() && watermarkConfig.text !== english) return 'Auto-translated'
  if (watermarkConfig.text?.trim()) return 'Auto-translated'
  return 'Using English'
}

export async function autoTranslateMixerTextOverlays(params: {
  overlays: TextOverlayData[]
  targetLanguages: string[]
  translations: TextOverlayTranslationsByLanguage
  previousOverlays?: TextOverlayData[]
  forceRetranslate?: boolean
  onSave: (translations: TextOverlayTranslationsByLanguage) => Promise<void>
}): Promise<void> {
  const next = { ...params.translations }

  for (const lang of params.targetLanguages.filter((l) => l && l !== 'en')) {
    const langMap = { ...(next[lang] || {}) }

    for (const overlay of params.overlays) {
      const englishText = overlay.text?.trim()
      if (!englishText) {
        delete langMap[overlay.id]
        continue
      }

      const prev = params.previousOverlays?.find((o) => o.id === overlay.id)
      const englishChanged = params.previousOverlays
        ? (prev?.text?.trim() || '') !== englishText
        : false
      const englishSubChanged = params.previousOverlays
        ? (prev?.subtext?.trim() || '') !== (overlay.subtext?.trim() || '')
        : false
      const existing = langMap[overlay.id]

      if (
        !params.forceRetranslate &&
        existing?.edited &&
        !englishChanged &&
        !englishSubChanged &&
        existing.text?.trim()
      ) {
        continue
      }

      const translatedText = await translateCaptionText(englishText, lang)
      if (!translatedText) continue

      let translatedSubtext: string | undefined
      const englishSub = overlay.subtext?.trim()
      if (englishSub) {
        translatedSubtext = (await translateCaptionText(englishSub, lang)) || undefined
      }

      langMap[overlay.id] = {
        text: translatedText,
        subtext: translatedSubtext,
        edited: false,
      }
    }

    next[lang] = langMap
    await params.onSave(next)
  }
}

export async function autoTranslateWatermarkText(params: {
  englishText: string
  targetLanguages: string[]
  mixerSettingsByLanguage: Record<string, SceneMixerLanguageSettings>
  previousEnglishText?: string
  forceRetranslate?: boolean
  onSaveLanguageSettings: (
    language: string,
    settings: SceneMixerLanguageSettings
  ) => Promise<void>
}): Promise<void> {
  const englishText = params.englishText.trim()
  const englishChanged = (params.previousEnglishText?.trim() || '') !== englishText

  for (const lang of params.targetLanguages.filter((l) => l && l !== 'en')) {
    const existing = params.mixerSettingsByLanguage[lang]
    const wm = existing?.watermarkConfig
    if (
      !params.forceRetranslate &&
      wm?.textEdited &&
      !englishChanged &&
      wm.text?.trim()
    ) {
      continue
    }
    if (!englishText) continue

    const translated = await translateCaptionText(englishText, lang)
    if (!translated) continue

    await params.onSaveLanguageSettings(lang, {
      ...existing,
      watermarkConfig: {
        ...wm,
        text: translated,
        textEdited: false,
      },
    })
  }
}

export function applyResolvedOverlaysForLanguage(
  overlays: TextOverlayData[] | undefined,
  language: string,
  translations?: TextOverlayTranslationsByLanguage
): TextOverlayData[] {
  if (!overlays?.length) return []
  const lang = language?.trim() || 'en'
  return overlays.map((overlay) => {
    const resolved = resolveOverlayText(overlay, lang, translations)
    return { ...overlay, text: resolved.text, subtext: resolved.subtext }
  })
}

export function applyResolvedWatermarkForLanguage(
  watermarkConfig: WatermarkConfig | undefined,
  language: string,
  productionData?: SceneProductionData | null
): WatermarkConfig {
  const base = {
    ...DEFAULT_WATERMARK_CONFIG,
    ...watermarkConfig,
    textStyle: {
      ...DEFAULT_WATERMARK_CONFIG.textStyle,
      ...watermarkConfig?.textStyle,
    },
    imageStyle: {
      ...DEFAULT_WATERMARK_CONFIG.imageStyle,
      ...watermarkConfig?.imageStyle,
    },
  }
  const lang = language?.trim() || 'en'
  if (lang === 'en' || base.type !== 'text') return base
  const englishWm = getMixerSettingsForLanguage(productionData ?? null, 'en')?.watermarkConfig
  const englishMerged = {
    ...DEFAULT_WATERMARK_CONFIG,
    ...englishWm,
    textStyle: { ...DEFAULT_WATERMARK_CONFIG.textStyle, ...englishWm?.textStyle },
  }
  const text = resolveWatermarkText(base, lang, englishMerged)
  return { ...base, text }
}

/**
 * Backfill mixer overlay + watermark text for one scene; returns updated production data.
 */
export async function backfillMixerTextForScene(
  language: string,
  productionData: SceneProductionData
): Promise<{ productionData: SceneProductionData; count: number }> {
  let nextData = { ...productionData }
  let count = 0

  const overlays = nextData.textOverlays || []
  if (overlays.length > 0) {
    let overlayCount = 0
    await autoTranslateMixerTextOverlays({
      overlays,
      targetLanguages: [language],
      translations: nextData.textOverlayTranslations || {},
      onSave: async (translations) => {
        overlayCount = overlays.filter((o) => o.text?.trim()).length
        nextData = { ...nextData, textOverlayTranslations: translations }
      },
    })
    count += overlayCount
  }

  const byLang = migrateMixerSettingsByLanguage(nextData)
  const englishWm = getMixerSettingsForLanguage(nextData, 'en')?.watermarkConfig
  const englishWatermarkText =
    englishWm?.text?.trim() || DEFAULT_WATERMARK_CONFIG.text?.trim() || ''

  if (englishWatermarkText) {
    const existing = byLang[language]
    const wm = existing?.watermarkConfig
    if (!(wm?.textEdited && wm.text?.trim())) {
      const translated = await translateCaptionText(englishWatermarkText, language)
      if (translated) {
        const updatedByLang = {
          ...byLang,
          [language]: {
            ...existing,
            watermarkConfig: {
              ...wm,
              text: translated,
              textEdited: false,
            },
          },
        }
        nextData = { ...nextData, mixerSettingsByLanguage: updatedByLang }
        count += 1
      }
    }
  }

  return { productionData: nextData, count }
}
