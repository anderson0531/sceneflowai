/**
 * ElevenLabs voice mapping for different languages
 * All 73 ElevenLabs v3 languages mapped to multilingual voices.
 * 
 * Rachel (21m00Tcm4TlvDq8ikWAM) is English-only.
 * Bella (EXAVITQu4vr4xnSDxMaL) is the best multilingual voice for all others.
 * The getElevenLabsVoiceForLanguage() fallback also uses Bella, so new languages
 * added to SUPPORTED_LANGUAGES will work even if not listed here.
 */

export interface LanguageVoiceMapping {
  languageCode: string
  voiceId: string
  voiceName: string
  isMultilingual: boolean
}

const BELLA = 'EXAVITQu4vr4xnSDxMaL'

function bella(code: string): LanguageVoiceMapping {
  return { languageCode: code, voiceId: BELLA, voiceName: 'Bella', isMultilingual: true }
}

/**
 * Default voice mappings for all supported languages.
 * English uses Rachel; every other language uses Bella (multilingual).
 */
export const ELEVENLABS_LANGUAGE_VOICES: Record<string, LanguageVoiceMapping> = {
  // English — Rachel (English-native)
  en: { languageCode: 'en', voiceId: '21m00Tcm4TlvDq8ikWAM', voiceName: 'Rachel', isMultilingual: false },

  // Western European
  fr: bella('fr'), de: bella('de'), es: bella('es'), pt: bella('pt'), it: bella('it'),
  nl: bella('nl'), ca: bella('ca'), gl: bella('gl'), lb: bella('lb'),
  ga: bella('ga'), cy: bella('cy'), is: bella('is'),

  // Northern European
  da: bella('da'), fi: bella('fi'), no: bella('no'), sv: bella('sv'),
  et: bella('et'), lv: bella('lv'), lt: bella('lt'),

  // Eastern European
  ru: bella('ru'), pl: bella('pl'), cs: bella('cs'), sk: bella('sk'),
  uk: bella('uk'), be: bella('be'), bg: bella('bg'), ro: bella('ro'),
  hr: bella('hr'), bs: bella('bs'), sr: bella('sr'), sl: bella('sl'),
  mk: bella('mk'), hu: bella('hu'), ka: bella('ka'), hy: bella('hy'),
  az: bella('az'), kk: bella('kk'), ky: bella('ky'),

  // Mediterranean
  el: bella('el'), tr: bella('tr'),

  // Middle East
  ar: bella('ar'), he: bella('he'), fa: bella('fa'), ps: bella('ps'), ur: bella('ur'),

  // South Asian
  hi: bella('hi'), bn: bella('bn'), pa: bella('pa'), gu: bella('gu'),
  mr: bella('mr'), ta: bella('ta'), te: bella('te'), kn: bella('kn'),
  ml: bella('ml'), as: bella('as'), ne: bella('ne'), sd: bella('sd'),

  // Southeast Asian
  th: bella('th'), vi: bella('vi'), id: bella('id'), ms: bella('ms'),
  fil: bella('fil'), jv: bella('jv'), ceb: bella('ceb'),

  // East Asian
  zh: bella('zh'), ja: bella('ja'), ko: bella('ko'),

  // African
  af: bella('af'), sw: bella('sw'), ha: bella('ha'),
  so: bella('so'), ny: bella('ny'), ln: bella('ln'),
}

/**
 * Get ElevenLabs voice ID for a language code
 * Falls back to Bella (default multilingual voice) if language not found.
 */
export function getElevenLabsVoiceForLanguage(languageCode: string, customVoiceId?: string): LanguageVoiceMapping {
  // If custom voice ID provided, use it
  if (customVoiceId) {
    return {
      languageCode,
      voiceId: customVoiceId,
      voiceName: 'Custom',
      isMultilingual: true
    }
  }
  
  // Return mapped voice or default multilingual voice
  return ELEVENLABS_LANGUAGE_VOICES[languageCode] || bella(languageCode)
}
