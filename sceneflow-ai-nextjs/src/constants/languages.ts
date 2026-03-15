/**
 * Supported languages for multi-language TTS generation
 * All 73 languages supported by ElevenLabs Eleven v3 model
 * Shared constants used across ScriptPanel, ScriptPlayer, and production components
 * 
 * Google TTS voice IDs are provided as fallbacks where available.
 * Languages without a Google TTS counterpart use '' (empty string).
 */

export interface SupportedLanguage {
  code: string
  name: string
  voice: string          // Google TTS voice ID fallback ('' if unavailable)
  region?: string        // Region grouping for UI (optional)
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  // ── Western European ──────────────────────────────────────────────────────
  { code: 'en', name: 'English', voice: 'en-US-Studio-M', region: 'western-europe' },
  { code: 'fr', name: 'French', voice: 'fr-FR-Neural2-B', region: 'western-europe' },
  { code: 'de', name: 'German', voice: 'de-DE-Neural2-B', region: 'western-europe' },
  { code: 'es', name: 'Spanish', voice: 'es-ES-Neural2-B', region: 'western-europe' },
  { code: 'pt', name: 'Portuguese', voice: 'pt-BR-Neural2-B', region: 'western-europe' },
  { code: 'it', name: 'Italian', voice: 'it-IT-Neural2-C', region: 'western-europe' },
  { code: 'nl', name: 'Dutch', voice: 'nl-NL-Wavenet-B', region: 'western-europe' },
  { code: 'ca', name: 'Catalan', voice: 'ca-ES-Standard-A', region: 'western-europe' },
  { code: 'gl', name: 'Galician', voice: 'gl-ES-Standard-A', region: 'western-europe' },
  { code: 'lb', name: 'Luxembourgish', voice: '', region: 'western-europe' },
  { code: 'ga', name: 'Irish', voice: 'ga-IE-Standard-A', region: 'western-europe' },
  { code: 'cy', name: 'Welsh', voice: '', region: 'western-europe' },
  { code: 'is', name: 'Icelandic', voice: 'is-IS-Standard-A', region: 'western-europe' },

  // ── Northern European ─────────────────────────────────────────────────────
  { code: 'da', name: 'Danish', voice: 'da-DK-Neural2-D', region: 'northern-europe' },
  { code: 'fi', name: 'Finnish', voice: 'fi-FI-Wavenet-A', region: 'northern-europe' },
  { code: 'no', name: 'Norwegian', voice: 'nb-NO-Wavenet-B', region: 'northern-europe' },
  { code: 'sv', name: 'Swedish', voice: 'sv-SE-Wavenet-C', region: 'northern-europe' },
  { code: 'et', name: 'Estonian', voice: '', region: 'northern-europe' },
  { code: 'lv', name: 'Latvian', voice: 'lv-LV-Standard-A', region: 'northern-europe' },
  { code: 'lt', name: 'Lithuanian', voice: 'lt-LT-Standard-A', region: 'northern-europe' },

  // ── Eastern European ──────────────────────────────────────────────────────
  { code: 'ru', name: 'Russian', voice: 'ru-RU-Wavenet-B', region: 'eastern-europe' },
  { code: 'pl', name: 'Polish', voice: 'pl-PL-Wavenet-B', region: 'eastern-europe' },
  { code: 'cs', name: 'Czech', voice: 'cs-CZ-Wavenet-A', region: 'eastern-europe' },
  { code: 'sk', name: 'Slovak', voice: 'sk-SK-Wavenet-A', region: 'eastern-europe' },
  { code: 'uk', name: 'Ukrainian', voice: 'uk-UA-Wavenet-A', region: 'eastern-europe' },
  { code: 'be', name: 'Belarusian', voice: '', region: 'eastern-europe' },
  { code: 'bg', name: 'Bulgarian', voice: 'bg-BG-Standard-A', region: 'eastern-europe' },
  { code: 'ro', name: 'Romanian', voice: 'ro-RO-Wavenet-A', region: 'eastern-europe' },
  { code: 'hr', name: 'Croatian', voice: '', region: 'eastern-europe' },
  { code: 'bs', name: 'Bosnian', voice: '', region: 'eastern-europe' },
  { code: 'sr', name: 'Serbian', voice: 'sr-RS-Standard-A', region: 'eastern-europe' },
  { code: 'sl', name: 'Slovenian', voice: '', region: 'eastern-europe' },
  { code: 'mk', name: 'Macedonian', voice: '', region: 'eastern-europe' },
  { code: 'hu', name: 'Hungarian', voice: 'hu-HU-Wavenet-A', region: 'eastern-europe' },
  { code: 'ka', name: 'Georgian', voice: '', region: 'eastern-europe' },
  { code: 'hy', name: 'Armenian', voice: '', region: 'eastern-europe' },
  { code: 'az', name: 'Azerbaijani', voice: '', region: 'eastern-europe' },
  { code: 'kk', name: 'Kazakh', voice: '', region: 'eastern-europe' },
  { code: 'ky', name: 'Kirghiz', voice: '', region: 'eastern-europe' },

  // ── Greek & Turkish ────────────────────────────────────────────────────────
  { code: 'el', name: 'Greek', voice: 'el-GR-Wavenet-A', region: 'mediterranean' },
  { code: 'tr', name: 'Turkish', voice: 'tr-TR-Wavenet-B', region: 'mediterranean' },

  // ── Middle Eastern & North African ─────────────────────────────────────────
  { code: 'ar', name: 'Arabic', voice: 'ar-XA-Wavenet-B', region: 'middle-east' },
  { code: 'he', name: 'Hebrew', voice: 'he-IL-Wavenet-A', region: 'middle-east' },
  { code: 'fa', name: 'Persian', voice: '', region: 'middle-east' },
  { code: 'ps', name: 'Pashto', voice: '', region: 'middle-east' },
  { code: 'ur', name: 'Urdu', voice: '', region: 'middle-east' },

  // ── South Asian ────────────────────────────────────────────────────────────
  { code: 'hi', name: 'Hindi', voice: 'hi-IN-Neural2-B', region: 'south-asia' },
  { code: 'bn', name: 'Bengali', voice: 'bn-IN-Wavenet-B', region: 'south-asia' },
  { code: 'pa', name: 'Punjabi', voice: 'pa-IN-Wavenet-A', region: 'south-asia' },
  { code: 'gu', name: 'Gujarati', voice: 'gu-IN-Wavenet-A', region: 'south-asia' },
  { code: 'mr', name: 'Marathi', voice: 'mr-IN-Wavenet-A', region: 'south-asia' },
  { code: 'ta', name: 'Tamil', voice: 'ta-IN-Wavenet-A', region: 'south-asia' },
  { code: 'te', name: 'Telugu', voice: 'te-IN-Standard-A', region: 'south-asia' },
  { code: 'kn', name: 'Kannada', voice: 'kn-IN-Wavenet-A', region: 'south-asia' },
  { code: 'ml', name: 'Malayalam', voice: 'ml-IN-Wavenet-A', region: 'south-asia' },
  { code: 'as', name: 'Assamese', voice: '', region: 'south-asia' },
  { code: 'ne', name: 'Nepali', voice: 'ne-NP-Standard-A', region: 'south-asia' },
  { code: 'sd', name: 'Sindhi', voice: '', region: 'south-asia' },

  // ── Southeast Asian ────────────────────────────────────────────────────────
  { code: 'th', name: 'Thai', voice: 'th-TH-Neural2-C', region: 'southeast-asia' },
  { code: 'vi', name: 'Vietnamese', voice: 'vi-VN-Wavenet-A', region: 'southeast-asia' },
  { code: 'id', name: 'Indonesian', voice: 'id-ID-Wavenet-A', region: 'southeast-asia' },
  { code: 'ms', name: 'Malay', voice: 'ms-MY-Wavenet-A', region: 'southeast-asia' },
  { code: 'fil', name: 'Filipino', voice: 'fil-PH-Wavenet-A', region: 'southeast-asia' },
  { code: 'jv', name: 'Javanese', voice: 'jv-ID-Standard-A', region: 'southeast-asia' },
  { code: 'ceb', name: 'Cebuano', voice: '', region: 'southeast-asia' },

  // ── East Asian ─────────────────────────────────────────────────────────────
  { code: 'zh', name: 'Chinese (Mandarin)', voice: 'cmn-CN-Wavenet-B', region: 'east-asia' },
  { code: 'ja', name: 'Japanese', voice: 'ja-JP-Neural2-C', region: 'east-asia' },
  { code: 'ko', name: 'Korean', voice: 'ko-KR-Neural2-C', region: 'east-asia' },

  // ── African ────────────────────────────────────────────────────────────────
  { code: 'af', name: 'Afrikaans', voice: 'af-ZA-Standard-A', region: 'african' },
  { code: 'sw', name: 'Swahili', voice: '', region: 'african' },
  { code: 'ha', name: 'Hausa', voice: '', region: 'african' },
  { code: 'so', name: 'Somali', voice: '', region: 'african' },
  { code: 'ny', name: 'Chichewa', voice: '', region: 'african' },
  { code: 'ln', name: 'Lingala', voice: '', region: 'african' },
]

/**
 * Flag emoji lookup by language code
 * Centralised here so every selector uses one source of truth.
 */
export const FLAG_EMOJIS: Record<string, string> = {
  // Western European
  en: '🇺🇸', fr: '🇫🇷', de: '��🇪', es: '🇪🇸', pt: '🇧🇷', it: '🇮🇹',
  nl: '��🇱', ca: '🇪🇸', gl: '🇪🇸', lb: '🇱🇺', ga: '🇮��', cy: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', is: '🇮🇸',
  // Northern European
  da: '🇩🇰', fi: '🇫🇮', no: '🇳🇴', sv: '🇸🇪', et: '🇪🇪', lv: '🇱🇻', lt: '🇱🇹',
  // Eastern European
  ru: '🇷🇺', pl: '🇵🇱', cs: '🇨🇿', sk: '🇸🇰', uk: '🇺🇦', be: '🇧🇾',
  bg: '🇧🇬', ro: '🇷🇴', hr: '🇭🇷', bs: '🇧🇦', sr: '🇷🇸', sl: '🇸🇮',
  mk: '🇲🇰', hu: '🇭🇺', ka: '🇬🇪', hy: '🇦🇲', az: '🇦🇿', kk: '🇰🇿', ky: '🇰🇬',
  // Mediterranean
  el: '🇬🇷', tr: '🇹🇷',
  // Middle East
  ar: '🇸🇦', he: '🇮🇱', fa: '🇮🇷', ps: '🇦🇫', ur: '🇵🇰',
  // South Asian
  hi: '🇮🇳', bn: '🇧🇩', pa: '🇮🇳', gu: '🇮🇳', mr: '��🇳',
  ta: '🇮🇳', te: '🇮🇳', kn: '🇮🇳', ml: '��🇳', as: '🇮🇳', ne: '🇳🇵', sd: '🇵🇰',
  // Southeast Asian
  th: '🇹🇭', vi: '🇻🇳', id: '🇮🇩', ms: '🇲🇾', fil: '🇵🇭', jv: '🇮🇩', ceb: '🇵🇭',
  // East Asian
  zh: '🇨🇳', ja: '🇯🇵', ko: '🇰🇷',
  // African
  af: '🇿🇦', sw: '🇰🇪', ha: '��🇬', so: '🇸🇴', ny: '🇲🇼', ln: '🇨🇩',
}

/**
 * Convenience: get a language name from its code
 */
export function getLanguageName(code: string): string {
  return SUPPORTED_LANGUAGES.find(l => l.code === code)?.name ?? code.toUpperCase()
}
