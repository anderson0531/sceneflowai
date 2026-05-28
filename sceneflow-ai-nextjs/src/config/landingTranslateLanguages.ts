export type LandingTranslateLanguage = {
  code: string
  name: string
  region: string
}

/** Languages offered in the landing page Google Translate selector. */
export const LANDING_TRANSLATE_LANGUAGES: LandingTranslateLanguage[] = [
  { code: 'en', name: 'English', region: 'Americas' },
  { code: 'es', name: 'Español', region: 'Americas' },
  { code: 'pt', name: 'Português', region: 'Americas' },
  { code: 'fr', name: 'Français', region: 'Europe' },
  { code: 'de', name: 'Deutsch', region: 'Europe' },
  { code: 'it', name: 'Italiano', region: 'Europe' },
  { code: 'nl', name: 'Nederlands', region: 'Europe' },
  { code: 'pl', name: 'Polski', region: 'Europe' },
  { code: 'ru', name: 'Русский', region: 'Europe' },
  { code: 'uk', name: 'Українська', region: 'Europe' },
  { code: 'cs', name: 'Čeština', region: 'Europe' },
  { code: 'sv', name: 'Svenska', region: 'Europe' },
  { code: 'da', name: 'Dansk', region: 'Europe' },
  { code: 'no', name: 'Norsk', region: 'Europe' },
  { code: 'fi', name: 'Suomi', region: 'Europe' },
  { code: 'el', name: 'Ελληνικά', region: 'Europe' },
  { code: 'tr', name: 'Türkçe', region: 'Europe' },
  { code: 'ro', name: 'Română', region: 'Europe' },
  { code: 'hu', name: 'Magyar', region: 'Europe' },
  { code: 'zh-CN', name: '中文 (简体)', region: 'Asia Pacific' },
  { code: 'zh-TW', name: '中文 (繁體)', region: 'Asia Pacific' },
  { code: 'ja', name: '日本語', region: 'Asia Pacific' },
  { code: 'ko', name: '한국어', region: 'Asia Pacific' },
  { code: 'hi', name: 'हिन्दी', region: 'Asia Pacific' },
  { code: 'bn', name: 'বাংলা', region: 'Asia Pacific' },
  { code: 'th', name: 'ภาษาไทย', region: 'Asia Pacific' },
  { code: 'vi', name: 'Tiếng Việt', region: 'Asia Pacific' },
  { code: 'id', name: 'Bahasa Indonesia', region: 'Asia Pacific' },
  { code: 'ms', name: 'Bahasa Melayu', region: 'Asia Pacific' },
  { code: 'tl', name: 'Tagalog', region: 'Asia Pacific' },
  { code: 'ur', name: 'اردو', region: 'Asia Pacific' },
  { code: 'ar', name: 'العربية', region: 'Middle East & Africa' },
  { code: 'he', name: 'עברית', region: 'Middle East & Africa' },
  { code: 'fa', name: 'فارسی', region: 'Middle East & Africa' },
  { code: 'sw', name: 'Kiswahili', region: 'Middle East & Africa' },
  { code: 'am', name: 'አማርኛ', region: 'Middle East & Africa' },
  { code: 'yo', name: 'Yorùbá', region: 'Middle East & Africa' },
  { code: 'zu', name: 'IsiZulu', region: 'Middle East & Africa' },
  { code: 'af', name: 'Afrikaans', region: 'Middle East & Africa' },
]

export const LANDING_TRANSLATE_INCLUDED_LANGUAGES = LANDING_TRANSLATE_LANGUAGES.map(
  (language) => language.code
).join(',')
