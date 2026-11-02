'use client'

import { useEffect } from 'react'
import { useLocale } from 'next-intl'
import {
  DEFAULT_LANDING_LOCALE,
  getLandingLocalePath,
  isLandingLocale,
  matchAcceptLanguage,
} from '@/i18n/locale'
import {
  hasExplicitLandingLocaleChoice,
  persistLandingLocale,
  readPersistedLandingLocale,
} from '@/i18n/persistLandingLocale'

/**
 * On marketing routes, sync the active locale cookie and, when visiting `/`
 * without an explicit language selection, honour `navigator.languages` if
 * a cached response rendered the default English page.
 */
export function PersistLandingLocale() {
  const locale = useLocale()

  useEffect(() => {
    if (!isLandingLocale(locale)) return
    const explicit = hasExplicitLandingLocaleChoice()

    if (!explicit && typeof window !== 'undefined' && window.location.pathname === '/') {
      const browserHeader =
        Array.isArray(navigator.languages) && navigator.languages.length > 0
          ? navigator.languages.join(',')
          : navigator.language
      const browserLocale = matchAcceptLanguage(browserHeader)
      if (
        browserLocale &&
        isLandingLocale(browserLocale) &&
        browserLocale !== DEFAULT_LANDING_LOCALE &&
        browserLocale !== locale
      ) {
        persistLandingLocale(browserLocale)
        window.location.replace(getLandingLocalePath(browserLocale, window.location.hash))
        return
      }
    }

    if (locale !== DEFAULT_LANDING_LOCALE) {
      persistLandingLocale(locale)
      return
    }

    if (readPersistedLandingLocale()) return
    persistLandingLocale(locale)
  }, [locale])

  return null
}
