'use client'

import { useEffect } from 'react'
import type { PremiereProgressResult } from '@/lib/premiere/premiereProgress'

export interface PremiereEventHandlers {
  createScreening: () => void
  reviewInsights: () => void
  openPublish: () => void
  openFinalCut: () => void
  share: () => void
}

export function usePremiereEvents(handlers: PremiereEventHandlers) {
  useEffect(() => {
    const map: Record<string, () => void> = {
      'premiere:create-screening': handlers.createScreening,
      'premiere:review-insights': handlers.reviewInsights,
      'premiere:open-publish': handlers.openPublish,
      'premiere:open-final-cut': handlers.openFinalCut,
      'premiere:share': handlers.share,
      'premiere:qa': handlers.reviewInsights,
      'premiere:audience-score': handlers.reviewInsights,
      'premiere:export-settings': handlers.openPublish,
      'premiere:metadata': handlers.openPublish,
    }

    const onEvent = (e: Event) => {
      const fn = map[e.type]
      if (fn) fn()
    }

    Object.keys(map).forEach((name) => window.addEventListener(name, onEvent))
    return () => Object.keys(map).forEach((name) => window.removeEventListener(name, onEvent))
  }, [handlers])
}

export function usePremiereGuideStatus(progress: PremiereProgressResult) {
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('premiere:guide-status', { detail: progress.guideStatus }))
  }, [progress.guideStatus])
}
