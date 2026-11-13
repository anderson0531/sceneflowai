'use client'

import { useMemo } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import {
  resolveLocalizedStudioLandingCopy,
  type StudioLandingCopy,
} from '@/config/landing/worldClassLandingCopy'

export function useStudioLandingCopy(): StudioLandingCopy {
  const locale = useLocale()
  const t = useTranslations()

  return useMemo(() => {
    const localized = resolveLocalizedStudioLandingCopy(locale)
    if (t.has('studioLanding')) {
      try {
        const fromCatalog = t.raw('studioLanding') as Partial<StudioLandingCopy>
        if (fromCatalog && typeof fromCatalog === 'object') {
          return {
            ...localized,
            ...fromCatalog,
            heroDock: { ...localized.heroDock, ...(fromCatalog.heroDock ?? {}) },
            audienceGateway: {
              ...localized.audienceGateway,
              ...(fromCatalog.audienceGateway ?? {}),
              cards: fromCatalog.audienceGateway?.cards ?? localized.audienceGateway.cards,
            },
            superpowers: {
              ...localized.superpowers,
              ...(fromCatalog.superpowers ?? {}),
              pillars: fromCatalog.superpowers?.pillars ?? localized.superpowers.pillars,
            },
            videoServices: {
              ...localized.videoServices,
              ...(fromCatalog.videoServices ?? {}),
              workflowSteps:
                fromCatalog.videoServices?.workflowSteps ?? localized.videoServices.workflowSteps,
              verticals:
                fromCatalog.videoServices?.verticals ?? localized.videoServices.verticals,
            },
            guidedTour: {
              ...localized.guidedTour,
              ...(fromCatalog.guidedTour ?? {}),
              rooms: fromCatalog.guidedTour?.rooms ?? localized.guidedTour.rooms,
            },
            directoryDrawer: {
              ...localized.directoryDrawer,
              ...(fromCatalog.directoryDrawer ?? {}),
            },
            academyStrip: {
              ...localized.academyStrip,
              ...(fromCatalog.academyStrip ?? {}),
            },
          }
        }
      } catch {
        // Fallback to strongly typed localized copy
      }
    }
    return localized
  }, [locale, t])
}
