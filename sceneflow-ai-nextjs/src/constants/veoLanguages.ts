/**
 * Languages supported for Veo 3.1 native dialogue in video generation prompts.
 * Uses Google Cloud Translation API codes (see toGoogleTranslateCode for edge cases).
 */
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/constants/languages'

export const VEO_VIDEO_DIALOGUE_LANGUAGE_CODES = [
  'en',
  'es',
  'fr',
  'de',
  'pt',
  'it',
  'nl',
  'ru',
  'pl',
  'uk',
  'cs',
  'ro',
  'hu',
  'el',
  'tr',
  'ar',
  'he',
  'fa',
  'ur',
  'hi',
  'bn',
  'ta',
  'te',
  'mr',
  'pa',
  'gu',
  'th',
  'vi',
  'id',
  'ms',
  'fil',
  'jv',
  'zh',
  'ja',
  'ko',
  'sv',
  'da',
  'no',
  'fi',
] as const

export type VeoDialogueLanguageCode = (typeof VEO_VIDEO_DIALOGUE_LANGUAGE_CODES)[number]

const codeSet = new Set<string>(VEO_VIDEO_DIALOGUE_LANGUAGE_CODES)

export const VEO_VIDEO_DIALOGUE_LANGUAGES: SupportedLanguage[] = SUPPORTED_LANGUAGES.filter(
  (l) => codeSet.has(l.code)
)

export function getVeoLanguageName(code: string): string {
  if (code === 'en') return 'English'
  return VEO_VIDEO_DIALOGUE_LANGUAGES.find((l) => l.code === code)?.name ?? code
}

/** Map app language codes to Google Translate API target codes */
export function toGoogleTranslateCode(code: string): string {
  if (code === 'fil') return 'tl'
  if (code === 'zh') return 'zh-CN'
  if (code === 'jv') return 'jv'
  return code
}

export const VEO_DIALOGUE_LANGUAGE_STORAGE_KEY = 'sceneflow-veo-dialogue-language'
