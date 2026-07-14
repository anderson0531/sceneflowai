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
