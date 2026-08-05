/**
 * Bridges the platform's three language code vocabularies.
 *
 * The codebase grew three lists that mostly agree and disagree in a handful of
 * places, which is exactly the kind of mismatch that silently ships the wrong
 * language:
 *
 * | vocabulary                                   | Chinese   | Tagalog |
 * | -------------------------------------------- | --------- | ------- |
 * | platform locales (`landingTranslateLanguages`) | `zh-CN`   | `tl`    |
 * | TTS/content languages (`constants/languages`)  | `zh`      | `fil`   |
 * | Google Translate targets                       | `zh-CN`   | `tl`    |
 *
 * Platform locales already use Google Translate's spelling, so only the
 * TTS/content direction needs mapping. Use these helpers instead of passing
 * codes between subsystems directly.
 */

/** Platform locale -> TTS/content language code (`constants/languages`). */
const LOCALE_TO_TTS: Record<string, string> = {
  'zh-CN': 'zh',
  // The 73-language TTS list has no Traditional Chinese entry; Simplified is
  // the closest available voice set.
  'zh-TW': 'zh',
  tl: 'fil',
}

/** TTS/content language code -> platform locale. */
const TTS_TO_LOCALE: Record<string, string> = {
  zh: 'zh-CN',
  fil: 'tl',
}

export function toTtsLanguageCode(locale: string): string {
  return LOCALE_TO_TTS[locale] ?? locale
}

export function fromTtsLanguageCode(code: string): string {
  return TTS_TO_LOCALE[code] ?? code
}

/**
 * Platform locale -> Google Cloud Translation target code.
 *
 * Currently an identity mapping, but named so call sites document intent and a
 * future divergence has one place to live.
 */
export function toTranslationTargetCode(locale: string): string {
  return locale
}
