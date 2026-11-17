'use client'

import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import {
  DEFAULT_LANDING_LOCALE,
  getLandingLocalePath,
  isLandingLocale,
} from '@/i18n/locale'
import { beginLocaleSwitch, endLocaleSwitch } from '@/i18n/localeSwitchStatus'
import { persistLandingLocale } from '@/i18n/persistLandingLocale'

let switchFallbackTimer: ReturnType<typeof setTimeout> | null = null

/** Switch landing UI locale with instant processing overlay & route prefetching while preserving hash. */
export function useLandingLocale() {
  const locale = useLocale()
  const router = useRouter()

  const prefetchLocale = useCallback(
    (targetLocale: string) => {
      if (!isLandingLocale(targetLocale) || targetLocale === locale) return
      try {
        router.prefetch(getLandingLocalePath(targetLocale))
      } catch {
        // Ignore prefetch failures in test/offline environments
      }
    },
    [locale, router]
  )

  const switchLocale = useCallback(
    (nextLocale: string) => {
      if (!isLandingLocale(nextLocale) || nextLocale === locale) return

      // Immediately show LocaleSwitchOverlay so the user sees instant visual confirmation
      beginLocaleSwitch(nextLocale)
      if (switchFallbackTimer) clearTimeout(switchFallbackTimer)
      switchFallbackTimer = setTimeout(() => {
        endLocaleSwitch()
        switchFallbackTimer = null
      }, 10_000)

      persistLandingLocale(nextLocale, { explicit: true })

      const hash = typeof window !== 'undefined' ? window.location.hash : ''
      const nextPath = getLandingLocalePath(nextLocale, hash)

      router.push(nextPath)
    },
    [locale, router]
  )

  return {
    locale: isLandingLocale(locale) ? locale : DEFAULT_LANDING_LOCALE,
    switchLocale,
    prefetchLocale,
  }
}
