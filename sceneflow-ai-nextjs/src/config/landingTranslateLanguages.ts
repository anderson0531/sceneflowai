export type LandingTranslateLanguage = {
  code: string
  /** Endonym, shown in language pickers. */
  name: string
  /** English exonym, used in LLM prompts and admin tooling. */
  englishName: string
  region: string
}

/**
 * Single source of truth for every locale the platform ships: landing page
 * routes, app chrome catalogs (`messages/app/{locale}/`), and the Google
 * Translate fallback selector.
 */
export const LANDING_TRANSLATE_LANGUAGES: LandingTranslateLanguage[] = [
  { code: 'en', name: 'English', englishName: 'English', region: 'Americas' },
  { code: 'es', name: 'Español', englishName: 'Spanish', region: 'Americas' },
  { code: 'pt', name: 'Português', englishName: 'Portuguese', region: 'Americas' },
  { code: 'fr', name: 'Français', englishName: 'French', region: 'Europe' },
  { code: 'de', name: 'Deutsch', englishName: 'German', region: 'Europe' },
  { code: 'it', name: 'Italiano', englishName: 'Italian', region: 'Europe' },
  { code: 'nl', name: 'Nederlands', englishName: 'Dutch', region: 'Europe' },
  { code: 'pl', name: 'Polski', englishName: 'Polish', region: 'Europe' },
  { code: 'ru', name: 'Русский', englishName: 'Russian', region: 'Europe' },
  { code: 'uk', name: 'Українська', englishName: 'Ukrainian', region: 'Europe' },
  { code: 'cs', name: 'Čeština', englishName: 'Czech', region: 'Europe' },
  { code: 'sv', name: 'Svenska', englishName: 'Swedish', region: 'Europe' },
  { code: 'da', name: 'Dansk', englishName: 'Danish', region: 'Europe' },
  { code: 'no', name: 'Norsk', englishName: 'Norwegian', region: 'Europe' },
  { code: 'fi', name: 'Suomi', englishName: 'Finnish', region: 'Europe' },
  { code: 'el', name: 'Ελληνικά', englishName: 'Greek', region: 'Europe' },
  { code: 'tr', name: 'Türkçe', englishName: 'Turkish', region: 'Europe' },
  { code: 'ro', name: 'Română', englishName: 'Romanian', region: 'Europe' },
  { code: 'hu', name: 'Magyar', englishName: 'Hungarian', region: 'Europe' },
  { code: 'zh-CN', name: '中文 (简体)', englishName: 'Simplified Chinese', region: 'Asia Pacific' },
  { code: 'zh-TW', name: '中文 (繁體)', englishName: 'Traditional Chinese', region: 'Asia Pacific' },
  { code: 'ja', name: '日本語', englishName: 'Japanese', region: 'Asia Pacific' },
  { code: 'ko', name: '한국어', englishName: 'Korean', region: 'Asia Pacific' },
  { code: 'hi', name: 'हिन्दी', englishName: 'Hindi', region: 'Asia Pacific' },
  { code: 'bn', name: 'বাংলা', englishName: 'Bengali', region: 'Asia Pacific' },
  { code: 'th', name: 'ภาษาไทย', englishName: 'Thai', region: 'Asia Pacific' },
  { code: 'vi', name: 'Tiếng Việt', englishName: 'Vietnamese', region: 'Asia Pacific' },
  { code: 'id', name: 'Bahasa Indonesia', englishName: 'Indonesian', region: 'Asia Pacific' },
  { code: 'ms', name: 'Bahasa Melayu', englishName: 'Malay', region: 'Asia Pacific' },
  { code: 'tl', name: 'Tagalog', englishName: 'Tagalog', region: 'Asia Pacific' },
  { code: 'ur', name: 'اردو', englishName: 'Urdu', region: 'Asia Pacific' },
  { code: 'ar', name: 'العربية', englishName: 'Arabic', region: 'Middle East & Africa' },
  { code: 'he', name: 'עברית', englishName: 'Hebrew', region: 'Middle East & Africa' },
  { code: 'fa', name: 'فارسی', englishName: 'Persian', region: 'Middle East & Africa' },
  { code: 'sw', name: 'Kiswahili', englishName: 'Swahili', region: 'Middle East & Africa' },
  { code: 'am', name: 'አማርኛ', englishName: 'Amharic', region: 'Middle East & Africa' },
  { code: 'yo', name: 'Yorùbá', englishName: 'Yoruba', region: 'Middle East & Africa' },
  { code: 'zu', name: 'IsiZulu', englishName: 'Zulu', region: 'Middle East & Africa' },
  { code: 'af', name: 'Afrikaans', englishName: 'Afrikaans', region: 'Middle East & Africa' },
]

export const LANDING_TRANSLATE_INCLUDED_LANGUAGES = LANDING_TRANSLATE_LANGUAGES.map(
  (language) => language.code
).join(',')

/** Platform-wide alias. Prefer this name in app (non-landing) code. */
export const PLATFORM_LANGUAGES = LANDING_TRANSLATE_LANGUAGES
export type PlatformLanguage = LandingTranslateLanguage

const BY_CODE = new Map(LANDING_TRANSLATE_LANGUAGES.map((l) => [l.code, l]))

export function getPlatformLanguage(code: string): PlatformLanguage | undefined {
  return BY_CODE.get(code)
}
