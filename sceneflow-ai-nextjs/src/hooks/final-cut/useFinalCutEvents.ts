'use client'

import { useEffect } from 'react'
import type { FinalCutProgressResult } from '@/lib/final-cut/finalCutProgress'
import { scrollToAssemblySceneRow } from '@/lib/final-cut/finalCutProgress'

export interface FinalCutEventHandlers {
  openAssembly: () => void
  openProduction: () => void
  renderFinalCut: () => void
  openPremiere: () => void
  focusScene: (sceneId: string) => void
}

export function useFinalCutEvents(handlers: FinalCutEventHandlers) {
  useEffect(() => {
    const map: Record<string, () => void> = {
      'final-cut:open-assembly': handlers.openAssembly,
      'final-cut:open-production': handlers.openProduction,
      'final-cut:render': handlers.renderFinalCut,
      'final-cut:open-premiere': handlers.openPremiere,
      'finalcut:screening-room': handlers.openPremiere,
      'final-cut:focus-scene': () => {},
    }

    const onEvent = (e: Event) => {
      const fn = map[e.type]
      if (fn) fn()
      if (e.type === 'final-cut:focus-scene') {
        const sceneId = (e as CustomEvent<{ sceneId?: string }>).detail?.sceneId
        if (sceneId) {
          handlers.focusScene(sceneId)
          scrollToAssemblySceneRow(sceneId)
        }
      }
    }

    Object.keys(map).forEach((name) => window.addEventListener(name, onEvent))
    window.addEventListener('final-cut:focus-scene', onEvent)

    return () => {
      Object.keys(map).forEach((name) => window.removeEventListener(name, onEvent))
      window.removeEventListener('final-cut:focus-scene', onEvent)
    }
  }, [handlers])
}

export function useFinalCutGuideStatus(progress: FinalCutProgressResult) {
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('final-cut:guide-status', { detail: progress.guideStatus })
    )
  }, [progress.guideStatus])
}
