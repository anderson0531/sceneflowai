'use client'

import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import {
  DEFAULT_LANDING_LOCALE,
  getLandingLocalePath,
  isLandingLocale,
} from '@/i18n/locale'
import { persistLandingLocale } from '@/i18n/persistLandingLocale'

/** Switch landing UI locale while preserving hash. */
export function useLandingLocale() {
  const locale = useLocale()
  const router = useRouter()

  const switchLocale = useCallback(
    (nextLocale: string) => {
      if (!isLandingLocale(nextLocale) || nextLocale === locale) return

      persistLandingLocale(nextLocale)

      const hash = typeof window !== 'undefined' ? window.location.hash : ''
      const nextPath = getLandingLocalePath(nextLocale, hash)

      router.push(nextPath)
    },
    [locale, router]
  )

  return {
    locale: isLandingLocale(locale) ? locale : DEFAULT_LANDING_LOCALE,
    switchLocale,
  }
}
