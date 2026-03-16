/**
 * Supported languages for multi-language TTS generation
 * All 73 languages supported by ElevenLabs Eleven v3 model
 * Shared constants used across ScriptPanel, ScriptPlayer, and production components
 * 
 * Google TTS voice IDs are provided as fallbacks where available.
 * Languages without a Google TTS counterpart use '' (empty string).
 *
 * `rank` — YouTube audience size ranking (1 = largest, based on market data)
 * `tier` — 'top-10' | 'mid-tier' | 'long-tail' for UI badge colouring
 */

export type LanguageTier = 'top-10' | 'mid-tier' | 'long-tail'

export type LanguageRegion =
  | 'western-europe'
  | 'northern-europe'
  | 'eastern-europe'
  | 'mediterranean'
  | 'middle-east'
  | 'south-asia'
  | 'southeast-asia'
  | 'east-asia'
  | 'african'

export interface SupportedLanguage {
  code: string
  name: string
  voice: string          // Google TTS voice ID fallback ('' if unavailable)
  region: LanguageRegion // Region grouping for UI
  rank: number           // YouTube audience size ranking (1 = largest)
  tier: LanguageTier     // top-10 / mid-tier / long-tail
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  // ── Western European ──────────────────────────────────────────────────────
  { code: 'en', name: 'English', voice: 'en-US-Studio-M', region: 'western-europe', rank: 1, tier: 'top-10' },
  { code: 'fr', name: 'French', voice: 'fr-FR-Neural2-B', region: 'western-europe', rank: 8, tier: 'top-10' },
  { code: 'de', name: 'German', voice: 'de-DE-Neural2-B', region: 'western-europe', rank: 15, tier: 'mid-tier' },
  { code: 'es', name: 'Spanish', voice: 'es-ES-Neural2-B', region: 'western-europe', rank: 2, tier: 'top-10' },
  { code: 'pt', name: 'Portuguese', voice: 'pt-BR-Neural2-B', region: 'western-europe', rank: 4, tier: 'top-10' },
  { code: 'it', name: 'Italian', voice: 'it-IT-Neural2-C', region: 'western-europe', rank: 18, tier: 'mid-tier' },
  { code: 'nl', name: 'Dutch', voice: 'nl-NL-Wavenet-B', region: 'western-europe', rank: 23, tier: 'mid-tier' },
  { code: 'ca', name: 'Catalan', voice: 'ca-ES-Standard-A', region: 'western-europe', rank: 65, tier: 'long-tail' },
  { code: 'gl', name: 'Galician', voice: 'gl-ES-Standard-A', region: 'western-europe', rank: 72, tier: 'long-tail' },
  { code: 'lb', name: 'Luxembourgish', voice: '', region: 'western-europe', rank: 74, tier: 'long-tail' },
  { code: 'ga', name: 'Irish', voice: 'ga-IE-Standard-A', region: 'western-europe', rank: 71, tier: 'long-tail' },
  { code: 'cy', name: 'Welsh', voice: '', region: 'western-europe', rank: 73, tier: 'long-tail' },
  { code: 'is', name: 'Icelandic', voice: 'is-IS-Standard-A', region: 'western-europe', rank: 68, tier: 'long-tail' },

  // ── Northern European ─────────────────────────────────────────────────────
  { code: 'da', name: 'Danish', voice: 'da-DK-Neural2-D', region: 'northern-europe', rank: 38, tier: 'mid-tier' },
  { code: 'fi', name: 'Finnish', voice: 'fi-FI-Wavenet-A', region: 'northern-europe', rank: 34, tier: 'mid-tier' },
  { code: 'no', name: 'Norwegian', voice: 'nb-NO-Wavenet-B', region: 'northern-europe', rank: 37, tier: 'mid-tier' },
  { code: 'sv', name: 'Swedish', voice: 'sv-SE-Wavenet-C', region: 'northern-europe', rank: 32, tier: 'mid-tier' },
  { code: 'et', name: 'Estonian', voice: '', region: 'northern-europe', rank: 60, tier: 'long-tail' },
  { code: 'lv', name: 'Latvian', voice: 'lv-LV-Standard-A', region: 'northern-europe', rank: 58, tier: 'long-tail' },
  { code: 'lt', name: 'Lithuanian', voice: 'lt-LT-Standard-A', region: 'northern-europe', rank: 56, tier: 'long-tail' },

  // ── Eastern European ──────────────────────────────────────────────────────
  { code: 'ru', name: 'Russian', voice: 'ru-RU-Wavenet-B', region: 'eastern-europe', rank: 7, tier: 'top-10' },
  { code: 'pl', name: 'Polish', voice: 'pl-PL-Wavenet-B', region: 'eastern-europe', rank: 19, tier: 'mid-tier' },
  { code: 'cs', name: 'Czech', voice: 'cs-CZ-Wavenet-A', region: 'eastern-europe', rank: 30, tier: 'mid-tier' },
  { code: 'sk', name: 'Slovak', voice: 'sk-SK-Wavenet-A', region: 'eastern-europe', rank: 39, tier: 'mid-tier' },
  { code: 'uk', name: 'Ukrainian', voice: 'uk-UA-Wavenet-A', region: 'eastern-europe', rank: 22, tier: 'mid-tier' },
  { code: 'be', name: 'Belarusian', voice: '', region: 'eastern-europe', rank: 63, tier: 'long-tail' },
  { code: 'bg', name: 'Bulgarian', voice: 'bg-BG-Standard-A', region: 'eastern-europe', rank: 42, tier: 'mid-tier' },
  { code: 'ro', name: 'Romanian', voice: 'ro-RO-Wavenet-A', region: 'eastern-europe', rank: 29, tier: 'mid-tier' },
  { code: 'hr', name: 'Croatian', voice: '', region: 'eastern-europe', rank: 44, tier: 'mid-tier' },
  { code: 'bs', name: 'Bosnian', voice: '', region: 'eastern-europe', rank: 59, tier: 'long-tail' },
  { code: 'sr', name: 'Serbian', voice: 'sr-RS-Standard-A', region: 'eastern-europe', rank: 36, tier: 'mid-tier' },
  { code: 'sl', name: 'Slovenian', voice: '', region: 'eastern-europe', rank: 50, tier: 'mid-tier' },
  { code: 'mk', name: 'Macedonian', voice: '', region: 'eastern-europe', rank: 57, tier: 'long-tail' },
  { code: 'hu', name: 'Hungarian', voice: 'hu-HU-Wavenet-A', region: 'eastern-europe', rank: 28, tier: 'mid-tier' },
  { code: 'ka', name: 'Georgian', voice: '', region: 'eastern-europe', rank: 55, tier: 'long-tail' },
  { code: 'hy', name: 'Armenian', voice: '', region: 'eastern-europe', rank: 53, tier: 'long-tail' },
  { code: 'az', name: 'Azerbaijani', voice: '', region: 'eastern-europe', rank: 43, tier: 'mid-tier' },
  { code: 'kk', name: 'Kazakh', voice: '', region: 'eastern-europe', rank: 52, tier: 'long-tail' },
  { code: 'ky', name: 'Kirghiz', voice: '', region: 'eastern-europe', rank: 67, tier: 'long-tail' },

  // ── Greek & Turkish ────────────────────────────────────────────────────────
  { code: 'el', name: 'Greek', voice: 'el-GR-Wavenet-A', region: 'mediterranean', rank: 31, tier: 'mid-tier' },
  { code: 'tr', name: 'Turkish', voice: 'tr-TR-Wavenet-B', region: 'mediterranean', rank: 16, tier: 'mid-tier' },

  // ── Middle Eastern & North African ─────────────────────────────────────────
  { code: 'ar', name: 'Arabic', voice: 'ar-XA-Wavenet-B', region: 'middle-east', rank: 6, tier: 'top-10' },
  { code: 'he', name: 'Hebrew', voice: 'he-IL-Wavenet-A', region: 'middle-east', rank: 33, tier: 'mid-tier' },
  { code: 'fa', name: 'Persian', voice: '', region: 'middle-east', rank: 24, tier: 'mid-tier' },
  { code: 'ps', name: 'Pashto', voice: '', region: 'middle-east', rank: 62, tier: 'long-tail' },
  { code: 'ur', name: 'Urdu', voice: '', region: 'middle-east', rank: 20, tier: 'mid-tier' },

  // ── South Asian ────────────────────────────────────────────────────────────
  { code: 'hi', name: 'Hindi', voice: 'hi-IN-Neural2-B', region: 'south-asia', rank: 3, tier: 'top-10' },
  { code: 'bn', name: 'Bengali', voice: 'bn-IN-Wavenet-B', region: 'south-asia', rank: 11, tier: 'mid-tier' },
  { code: 'pa', name: 'Punjabi', voice: 'pa-IN-Wavenet-A', region: 'south-asia', rank: 35, tier: 'mid-tier' },
  { code: 'gu', name: 'Gujarati', voice: 'gu-IN-Wavenet-A', region: 'south-asia', rank: 40, tier: 'mid-tier' },
  { code: 'mr', name: 'Marathi', voice: 'mr-IN-Wavenet-A', region: 'south-asia', rank: 25, tier: 'mid-tier' },
  { code: 'ta', name: 'Tamil', voice: 'ta-IN-Wavenet-A', region: 'south-asia', rank: 17, tier: 'mid-tier' },
  { code: 'te', name: 'Telugu', voice: 'te-IN-Standard-A', region: 'south-asia', rank: 21, tier: 'mid-tier' },
  { code: 'kn', name: 'Kannada', voice: 'kn-IN-Wavenet-A', region: 'south-asia', rank: 26, tier: 'mid-tier' },
  { code: 'ml', name: 'Malayalam', voice: 'ml-IN-Wavenet-A', region: 'south-asia', rank: 27, tier: 'mid-tier' },
  { code: 'as', name: 'Assamese', voice: '', region: 'south-asia', rank: 61, tier: 'long-tail' },
  { code: 'ne', name: 'Nepali', voice: 'ne-NP-Standard-A', region: 'south-asia', rank: 51, tier: 'long-tail' },
  { code: 'sd', name: 'Sindhi', voice: '', region: 'south-asia', rank: 66, tier: 'long-tail' },

  // ── Southeast Asian ────────────────────────────────────────────────────────
  { code: 'th', name: 'Thai', voice: 'th-TH-Neural2-C', region: 'southeast-asia', rank: 12, tier: 'mid-tier' },
  { code: 'vi', name: 'Vietnamese', voice: 'vi-VN-Wavenet-A', region: 'southeast-asia', rank: 13, tier: 'mid-tier' },
  { code: 'id', name: 'Indonesian', voice: 'id-ID-Wavenet-A', region: 'southeast-asia', rank: 10, tier: 'top-10' },
  { code: 'ms', name: 'Malay', voice: 'ms-MY-Wavenet-A', region: 'southeast-asia', rank: 14, tier: 'mid-tier' },
  { code: 'fil', name: 'Filipino', voice: 'fil-PH-Wavenet-A', region: 'southeast-asia', rank: 41, tier: 'mid-tier' },
  { code: 'jv', name: 'Javanese', voice: 'jv-ID-Standard-A', region: 'southeast-asia', rank: 46, tier: 'mid-tier' },
  { code: 'ceb', name: 'Cebuano', voice: '', region: 'southeast-asia', rank: 64, tier: 'long-tail' },

  // ── East Asian ─────────────────────────────────────────────────────────────
  { code: 'zh', name: 'Chinese (Mandarin)', voice: 'cmn-CN-Wavenet-B', region: 'east-asia', rank: 5, tier: 'top-10' },
  { code: 'ja', name: 'Japanese', voice: 'ja-JP-Neural2-C', region: 'east-asia', rank: 9, tier: 'top-10' },
  { code: 'ko', name: 'Korean', voice: 'ko-KR-Neural2-C', region: 'east-asia', rank: 45, tier: 'mid-tier' },

  // ── African ────────────────────────────────────────────────────────────────
  { code: 'af', name: 'Afrikaans', voice: 'af-ZA-Standard-A', region: 'african', rank: 47, tier: 'mid-tier' },
  { code: 'sw', name: 'Swahili', voice: '', region: 'african', rank: 48, tier: 'mid-tier' },
  { code: 'ha', name: 'Hausa', voice: '', region: 'african', rank: 49, tier: 'mid-tier' },
  { code: 'so', name: 'Somali', voice: '', region: 'african', rank: 54, tier: 'long-tail' },
  { code: 'ny', name: 'Chichewa', voice: '', region: 'african', rank: 69, tier: 'long-tail' },
  { code: 'ln', name: 'Lingala', voice: '', region: 'african', rank: 70, tier: 'long-tail' },
]

/**
 * Flag emoji lookup by language code
 * Centralised here so every selector uses one source of truth.
 */
export const FLAG_EMOJIS: Record<string, string> = {
  // Western European
  en: '🇺🇸', fr: '🇫🇷', de: '🇩🇪', es: '🇪🇸', pt: '🇧🇷', it: '🇮🇹',
  nl: '🇳🇱', ca: '🇪🇸', gl: '🇪🇸', lb: '🇱🇺', ga: '��🇪', cy: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', is: '🇮🇸',
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
  hi: '🇮🇳', bn: '🇧🇩', pa: '🇮🇳', gu: '🇮🇳', mr: '🇮🇳',
  ta: '🇮🇳', te: '🇮🇳', kn: '🇮🇳', ml: '🇮🇳', as: '🇮🇳', ne: '🇳🇵', sd: '🇵🇰',
  // Southeast Asian
  th: '🇹🇭', vi: '🇻🇳', id: '🇮🇩', ms: '🇲🇾', fil: '🇵🇭', jv: '🇮🇩', ceb: '🇵🇭',
  // East Asian
  zh: '🇨🇳', ja: '🇯🇵', ko: '🇰🇷',
  // African
  af: '🇿🇦', sw: '🇰🇪', ha: '🇳🇬', so: '🇸🇴', ny: '🇲🇼', ln: '🇨🇩',
}

// ============================================================================
// Region Metadata & Display Order
// ============================================================================

/** Display labels with emoji prefixes for region group headers */
export const REGION_LABELS: Record<LanguageRegion, string> = {
  'east-asia':       '🌏 East Asia',
  'south-asia':      '🇮🇳 South Asia',
  'southeast-asia':  '🌴 Southeast Asia',
  'western-europe':  '🇪🇺 Western Europe',
  'northern-europe': '❄️ Northern Europe',
  'eastern-europe':  '🏔️ Eastern Europe',
  'mediterranean':   '☀️ Mediterranean',
  'middle-east':     '🕌 Middle East',
  'african':         '🌍 Africa',
}

/** Region display order — audience-reach order (high-volume regions first) */
export const REGION_ORDER: LanguageRegion[] = [
  'east-asia',
  'south-asia',
  'southeast-asia',
  'western-europe',
  'middle-east',
  'northern-europe',
  'eastern-europe',
  'mediterranean',
  'african',
]

// ============================================================================
// Helpers
// ============================================================================

/** Get a language name from its code */
export function getLanguageName(code: string): string {
  return SUPPORTED_LANGUAGES.find(l => l.code === code)?.name ?? code.toUpperCase()
}

/** Get languages grouped by region, sorted by rank within each group */
export function getLanguagesByRegion(
  /** Optional filter — only include these language codes */
  filterCodes?: string[]
): Array<{ region: LanguageRegion; label: string; languages: SupportedLanguage[] }> {
  const filtered = filterCodes
    ? SUPPORTED_LANGUAGES.filter(l => filterCodes.includes(l.code))
    : SUPPORTED_LANGUAGES

  return REGION_ORDER
    .map(region => ({
      region,
      label: REGION_LABELS[region],
      languages: filtered
        .filter(l => l.region === region)
        .sort((a, b) => a.rank - b.rank),
    }))
    .filter(g => g.languages.length > 0)
}

/** Get all languages sorted by audience rank */
export function getLanguagesSortedByRank(filterCodes?: string[]): SupportedLanguage[] {
  const filtered = filterCodes
    ? SUPPORTED_LANGUAGES.filter(l => filterCodes.includes(l.code))
    : SUPPORTED_LANGUAGES
  return [...filtered].sort((a, b) => a.rank - b.rank)
}
