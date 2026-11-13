'use client'

import { useMemo } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import {
  WORLD_CLASS_LANDING_TRANSLATIONS,
  resolveLocalizedStudioLandingCopy,
  type StudioLandingCopy,
} from '@/config/landing/worldClassLandingCopy'

export function useStudioLandingCopy(): StudioLandingCopy {
  const locale = useLocale()
  const t = useTranslations()

  return useMemo(() => {
    const normalized =
      locale === 'zh' || locale.toLowerCase().startsWith('zh')
        ? 'zh-CN'
        : locale.split('-')[0]

    // Priority UI locales (`es`, `pt`, `hi`, `zh-CN`, `ar`, `th`) and `en`
    // ship complete, strongly-typed curated copy directly in `worldClassLandingCopy`
    // (also mirrored in `messages/*.json`), guaranteeing zero partial-array fallback.
    if (
      normalized === 'en' ||
      normalized in WORLD_CLASS_LANDING_TRANSLATIONS
    ) {
      return resolveLocalizedStudioLandingCopy(locale)
    }

    const localized = resolveLocalizedStudioLandingCopy(locale)
    if (t.has('studioLanding')) {
      try {
        const fromCatalog = t.raw('studioLanding') as StudioLandingCopy
        if (fromCatalog && typeof fromCatalog === 'object' && fromCatalog.audienceGateway?.cards) {
          return fromCatalog
        }
      } catch {
        // Fallback to strongly typed localized copy
      }
    }
    return localized
  }, [locale, t])
}
