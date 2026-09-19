'use client'

import { useEffect } from 'react'
import { useLocale } from 'next-intl'
import { isLandingLocale } from '@/i18n/locale'
import { persistLandingLocale, readPersistedLandingLocale } from '@/i18n/persistLandingLocale'

/**
 * On first marketing visit (no cookie yet), store the resolved locale so `/`
 * stays in that language on the next load. Does not overwrite an explicit choice.
 */
export function PersistLandingLocale() {
  const locale = useLocale()

  useEffect(() => {
    if (!isLandingLocale(locale)) return
    if (readPersistedLandingLocale()) return
    persistLandingLocale(locale)
  }, [locale])

  return null
}
