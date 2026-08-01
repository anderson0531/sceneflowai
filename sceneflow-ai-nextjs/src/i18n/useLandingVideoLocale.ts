'use client'

import { useLocale } from 'next-intl'
import {
  landingLocaleToVideoLocale,
  resolveVideoLocaleForPlayer,
  type VideoLocale,
  type VideoLocaleId,
} from '@/config/landing/videoLocales'

/** Video dub locale synced to the landing page global language selector. */
export function useLandingVideoLocale(locales?: VideoLocale[]): VideoLocaleId {
  const landingLocale = useLocale()
  if (!locales?.length) return landingLocaleToVideoLocale(landingLocale)
  return resolveVideoLocaleForPlayer(landingLocale, locales)
}
