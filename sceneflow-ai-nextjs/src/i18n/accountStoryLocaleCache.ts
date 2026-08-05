import { isLocale } from '@/i18n/locale'

/**
 * Module-level cache for the account story language.
 *
 * Kept separate from the hooks so `useUiLocale` can update it when the header
 * switcher writes both locales without creating a circular import with
 * `useStoryLocale` (which already reads the UI cookie helper).
 */
let cachedAccountStoryLocale: string | null = null

export function getCachedAccountStoryLocale(): string | null {
  return cachedAccountStoryLocale
}

export function setCachedAccountStoryLocale(locale: string): void {
  if (!isLocale(locale)) return
  cachedAccountStoryLocale = locale
}
