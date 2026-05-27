'use client'

import { useEffect } from 'react'
import type { BlueprintProgressResult } from '@/lib/blueprint/blueprintProgress'
import {
  blueprintCategoryToSection,
  scrollToBlueprintSection,
} from '@/lib/blueprint/blueprintProgress'

export interface StudioBlueprintEventHandlers {
  openReimaginDialog: () => void
  openBlueprintRefine: () => void
  openResonancePanel: () => void
  openCollaboratePanel: () => void
  handleSave: () => void
  handleShare: () => void
  requestStartProduction: () => void
  runGeneration?: () => void
  hasBlueprint: boolean
  hasConceptInput: boolean
}

export function useStudioBlueprintEvents(
  handlers: StudioBlueprintEventHandlers,
  progress: BlueprintProgressResult
) {
  useEffect(() => {
    const eventHandlers: Record<string, () => void> = {
      'blueprint:generate': () => {
        if (handlers.hasBlueprint) handlers.openReimaginDialog()
        else handlers.openReimaginDialog()
      },
      'blueprint:generate-treatment': () => {
        handlers.openReimaginDialog()
      },
      'blueprint:refine': () => handlers.openBlueprintRefine(),
      'blueprint:edit-sections': () => handlers.openBlueprintRefine(),
      'blueprint:scorecard': () => handlers.openResonancePanel(),
      'blueprint:analyze-resonance': () => handlers.openResonancePanel(),
      'blueprint:apply-fixes': () => handlers.openBlueprintRefine(),
      'blueprint:characters': () => {
        scrollToBlueprintSection('characters')
        handlers.openBlueprintRefine()
      },
      'blueprint:style': () => {
        scrollToBlueprintSection('tone')
        handlers.openBlueprintRefine()
      },
      'blueprint:beats': () => {
        scrollToBlueprintSection('beats')
        handlers.openBlueprintRefine()
      },
      'blueprint:regenerate-hero': () => {
        const hero = document.querySelector('[data-blueprint-section="hero-image"]')
        hero?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      },
      'blueprint:preview-audio': () => {
        scrollToBlueprintSection('core')
      },
      'blueprint:collaborate': () => handlers.openCollaboratePanel(),
      'blueprint:export': () => handlers.handleShare(),
      'blueprint:save': () => handlers.handleSave(),
      'blueprint:start-production': () => handlers.requestStartProduction(),
      'blueprint:enter-concept': () => {
        if (!handlers.hasBlueprint) handlers.openReimaginDialog()
        else scrollToBlueprintSection('core')
      },
      'blueprint:scroll-weakest': () => {
        if (progress.weakestCategory) {
          scrollToBlueprintSection(blueprintCategoryToSection(progress.weakestCategory))
        }
        handlers.openResonancePanel()
      },
    }

    const onScrollSection = (e: Event) => {
      const detail = (e as CustomEvent<{ section?: string }>).detail
      if (detail?.section) scrollToBlueprintSection(detail.section)
    }

    const onEvent = (e: Event) => {
      const fn = eventHandlers[e.type]
      if (fn) fn()
    }

    Object.keys(eventHandlers).forEach((name) => {
      window.addEventListener(name, onEvent)
    })
    window.addEventListener('blueprint:scroll-section', onScrollSection)

    return () => {
      Object.keys(eventHandlers).forEach((name) => {
        window.removeEventListener(name, onEvent)
      })
      window.removeEventListener('blueprint:scroll-section', onScrollSection)
    }
  }, [handlers, progress.weakestCategory])
}

export function useBlueprintGuideStatus(progress: BlueprintProgressResult) {
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('blueprint:guide-status', { detail: progress.guideStatus })
    )
  }, [progress.guideStatus])
}

export function useCueBlueprintMode(projectId: string, hasBlueprint: boolean) {
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('cue:set-blueprint-context', {
        detail: { projectId, hasBlueprint, phase: 'blueprint' },
      })
    )
  }, [projectId, hasBlueprint])
}
