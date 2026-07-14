import { SUPPORTED_LANGUAGES } from '@/constants/languages'

/** Fallback map for short codes without a Google voice in SUPPORTED_LANGUAGES. */
const GOOGLE_TTS_PRECISE_MAP: Record<string, string> = {
  th: 'th-TH',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  it: 'it-IT',
  ja: 'ja-JP',
  ko: 'ko-KR',
  zh: 'cmn-CN',
  pt: 'pt-BR',
  ru: 'ru-RU',
  nl: 'nl-NL',
  pl: 'pl-PL',
  sv: 'sv-SE',
  tr: 'tr-TR',
  da: 'da-DK',
  fi: 'fi-FI',
  no: 'nb-NO',
  hi: 'hi-IN',
  id: 'id-ID',
  vi: 'vi-VN',
  cy: 'cy-GB',
  et: 'et-EE',
  hr: 'hr-HR',
  bs: 'bs-BA',
  sl: 'sl-SI',
  mk: 'mk-MK',
  ka: 'ka-GE',
  az: 'az-AZ',
  kk: 'kk-KZ',
  fa: 'fa-IR',
  ur: 'ur-PK',
  sw: 'sw-KE',
}

/**
 * SceneFlow short code -> Cloud Gemini-TTS BCP-47 locale.
 * @see https://cloud.google.com/text-to-speech/docs/gemini-tts
 */
const GEMINI_TTS_LOCALE_MAP: Record<string, string> = {
  ar: 'ar-EG',
  bn: 'bn-BD',
  ca: 'ca-ES',
  cs: 'cs-CZ',
  da: 'da-DK',
  de: 'de-DE',
  el: 'el-GR',
  en: 'en-US',
  es: 'es-ES',
  et: 'et-EE',
  fa: 'fa-IR',
  fi: 'fi-FI',
  fil: 'fil-PH',
  fr: 'fr-FR',
  he: 'he-IL',
  hi: 'hi-IN',
  hr: 'hr-HR',
  hu: 'hu-HU',
  id: 'id-ID',
  it: 'it-IT',
  ja: 'ja-JP',
  ka: 'ka-GE',
  ko: 'ko-KR',
  mk: 'mk-MK',
  ms: 'ms-MY',
  nl: 'nl-NL',
  no: 'nb-NO',
  pl: 'pl-PL',
  pt: 'pt-BR',
  ro: 'ro-RO',
  ru: 'ru-RU',
  sk: 'sk-SK',
  sl: 'sl-SI',
  sv: 'sv-SE',
  sw: 'sw-KE',
  ta: 'ta-IN',
  te: 'te-IN',
  th: 'th-TH',
  tr: 'tr-TR',
  uk: 'uk-UA',
  ur: 'ur-PK',
  vi: 'vi-VN',
  zh: 'cmn-CN',
  az: 'az-AZ',
}

const GEMINI_SUPPORTED_LOCALES = new Set(Object.values(GEMINI_TTS_LOCALE_MAP))

function extractLocaleFromVoiceName(name: string): string | null {
  if (!name) return null
  const parts = name.split('-')
  if (parts.length < 2) return null
  return `${parts[0]}-${parts[1]}`
}

/**
 * Resolve a SceneFlow short language code (e.g. `ar`) to a Google TTS
 * languageCode (e.g. `ar-XA`). Passes through values that already look like
 * BCP-47 locales (`ar-XA`, `th-TH`).
 */
export function resolveGoogleTtsLanguageCode(shortCode: string): string {
  const code = shortCode?.trim()
  if (!code) return 'en-US'

  if (code.includes('-')) return code

  const fromVoice = SUPPORTED_LANGUAGES.find((l) => l.code === code)
  if (fromVoice?.voice) {
    const locale = extractLocaleFromVoiceName(fromVoice.voice)
    if (locale) return locale
  }

  if (GOOGLE_TTS_PRECISE_MAP[code]) return GOOGLE_TTS_PRECISE_MAP[code]

  return `${code}-${code.toUpperCase()}`
}

/**
 * Resolve a SceneFlow language code to a Cloud Gemini-TTS `languageCode`.
 * Gemini voices use a different locale list than legacy WaveNet/Standard voices
 * (e.g. Arabic is `ar-EG`, not `ar-XA`).
 */
export function resolveGeminiTtsLanguageCode(shortCode: string): string {
  const code = shortCode?.trim()
  if (!code) return 'en-US'

  const normalized = code.toLowerCase()
  if (code.includes('-')) {
    if (GEMINI_SUPPORTED_LOCALES.has(code)) return code
    const base = code.split('-')[0]?.toLowerCase()
    if (base && GEMINI_TTS_LOCALE_MAP[base]) return GEMINI_TTS_LOCALE_MAP[base]
    return resolveGoogleTtsLanguageCode(code)
  }

  if (GEMINI_TTS_LOCALE_MAP[normalized]) return GEMINI_TTS_LOCALE_MAP[normalized]

  return resolveGoogleTtsLanguageCode(code)
}
