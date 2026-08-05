/**
 * Unified Blueprint progress calculator for sidebar checklist, header strip, and next-step banner.
 */

import type { WorkflowStepStatus } from '@/config/nav/workflowGuideConfig'
import {
  READY_FOR_PRODUCTION_THRESHOLD_V3,
  type AudienceDefinition,
  type PersistedBlueprintAudienceResonance,
} from '@/lib/types/audienceResonance'
import { BLUEPRINT_COPY } from '@/lib/blueprint/blueprintGlossary'

export type BlueprintWorkflowStep = 'generate' | 'review' | 'iterate' | 'startProduction'

export interface BlueprintProgressInput {
  hasBlueprint: boolean
  isGenerating: boolean
  hasConceptInput: boolean
  audienceDefinition: AudienceDefinition | null
  savedBlueprintAR: PersistedBlueprintAudienceResonance | null
  shareUrl: string | null
  hasShareLink?: boolean
  heroRegenerated?: boolean
  audioPreviewed?: boolean
}

export interface BlueprintProgressItem {
  id: string
  /** Catalog key under `blueprint.checklist`; the renderer translates it. */
  labelKey: string
  isComplete: boolean
  value?: string
}

export interface BlueprintProgressResult {
  currentStep: BlueprintWorkflowStep
  /** Catalog key under `blueprint.nextStep`; the renderer translates it. */
  nextStepLabelKey: string
  nextStepEvent: string | null
  arScore: number | null
  arTarget: number
  pointsToTarget: number
  isAtTarget: boolean
  progressItems: BlueprintProgressItem[]
  guideStatus: Record<string, WorkflowStepStatus>
  weakestCategory: string | null
}

const CATEGORY_TO_SECTION: Record<string, string> = {
  'Audience Appeal': 'core',
  'Genre & Tone Fit': 'tone',
  'Concept Hook': 'story',
  'Character Connection': 'characters',
  'Clarity & Structure': 'beats',
}

export function blueprintCategoryToSection(categoryName: string): string {
  return CATEGORY_TO_SECTION[categoryName] ?? 'story'
}

/** Asks the blueprint card to select the tab owning a section. */
export const BLUEPRINT_ACTIVATE_SECTION_EVENT = 'blueprint:activate-section'

function highlight(el: Element) {
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  el.classList.add('ring-2', 'ring-cyan-400/60', 'rounded-lg')
  window.setTimeout(() => {
    el.classList.remove('ring-2', 'ring-cyan-400/60', 'rounded-lg')
  }, 2000)
}

/**
 * Reveal a blueprint section and scroll to it.
 *
 * The sections live in tabs, and the inactive panels are not mounted, so the
 * element usually does not exist yet. Ask the card to switch tabs first, then
 * look for it once React has committed that render.
 */
export function scrollToBlueprintSection(section: string) {
  if (typeof window === 'undefined') return

  window.dispatchEvent(
    new CustomEvent(BLUEPRINT_ACTIVATE_SECTION_EVENT, { detail: { section } })
  )

  const existing = document.querySelector(`[data-blueprint-section="${section}"]`)
  if (existing) {
    highlight(existing)
    return
  }

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      const el = document.querySelector(`[data-blueprint-section="${section}"]`)
      if (el) highlight(el)
    })
  })
}

export function calculateBlueprintProgress(
  input: BlueprintProgressInput
): BlueprintProgressResult {
  const arScore = input.savedBlueprintAR?.analysis?.overallScore ?? null
  const hasARRun = !!input.savedBlueprintAR?.analysis
  const hasAudienceSaved = !!(
    input.audienceDefinition?.updatedAt ||
    input.savedBlueprintAR?.audienceDefinition?.updatedAt
  )
  const hasShare = !!(input.shareUrl || input.hasShareLink)
  const isAtTarget =
    arScore !== null && arScore >= READY_FOR_PRODUCTION_THRESHOLD_V3
  const pointsToTarget =
    arScore !== null ? Math.max(0, READY_FOR_PRODUCTION_THRESHOLD_V3 - arScore) : READY_FOR_PRODUCTION_THRESHOLD_V3

  const appliedRecs = new Set(input.savedBlueprintAR?.appliedRecommendationIds ?? [])
  const pendingRecs =
    input.savedBlueprintAR?.analysis?.recommendations?.filter((r) => !appliedRecs.has(r.id)) ?? []
  const hasAppliedFixes = (input.savedBlueprintAR?.appliedRecommendationIds?.length ?? 0) > 0

  let currentStep: BlueprintWorkflowStep = 'generate'
  let nextStepLabelKey = 'generateBlueprint'
  let nextStepEvent: string | null = 'blueprint:generate-treatment'

  if (input.hasBlueprint) {
    currentStep = 'review'
    nextStepLabelKey = 'saveAudienceAndAnalyze'
    nextStepEvent = 'blueprint:analyze-resonance'

    if (hasAudienceSaved && hasARRun) {
      currentStep = 'iterate'
      nextStepLabelKey =
        pendingRecs.length > 0
          ? 'applyTopFix'
          : isAtTarget
            ? 'startProduction'
            : 'reAnalyzeOrRefine'
      nextStepEvent =
        pendingRecs.length > 0
          ? 'blueprint:apply-fixes'
          : isAtTarget
            ? 'blueprint:start-production'
            : 'blueprint:edit-sections'
    }

    if (isAtTarget || (hasARRun && input.hasBlueprint && hasAudienceSaved)) {
      if (isAtTarget || pendingRecs.length === 0) {
        currentStep = 'startProduction'
        nextStepLabelKey = isAtTarget ? 'startProduction' : 'improveScoreOrStart'
        nextStepEvent = 'blueprint:start-production'
      }
    }
  }

  if (input.isGenerating) {
    currentStep = 'generate'
    nextStepLabelKey = 'generating'
    nextStepEvent = null
  }

  const categories = input.savedBlueprintAR?.analysis?.categories ?? []
  const weakestCategory =
    categories.length > 0
      ? [...categories].sort((a, b) => a.score - b.score)[0]?.name ?? null
      : null

  const guideStatus: Record<string, WorkflowStepStatus> = {
    'enter-idea': input.hasConceptInput || input.hasBlueprint ? 'complete' : 'pending',
    'generate-blueprint': input.hasBlueprint
      ? 'complete'
      : input.isGenerating
        ? 'in-progress'
        : 'pending',
    'review-sections': input.hasBlueprint ? 'complete' : 'pending',
    'run-resonance': hasARRun ? 'complete' : hasAudienceSaved ? 'in-progress' : 'pending',
    'apply-fixes':
      hasAppliedFixes || isAtTarget
        ? 'complete'
        : pendingRecs.length > 0
          ? 'in-progress'
          : hasARRun
            ? 'pending'
            : 'pending',
    'regenerate-hero': input.heroRegenerated ? 'complete' : 'pending',
    'preview-audio': input.audioPreviewed ? 'complete' : 'pending',
    'collaborate-export': hasShare ? 'complete' : 'pending',
    'start-production': isAtTarget ? 'complete' : input.hasBlueprint ? 'in-progress' : 'pending',
  }

  const progressItems: BlueprintProgressItem[] = [
    {
      id: 'blueprint-generated',
      labelKey: 'blueprintGenerated',
      isComplete: input.hasBlueprint,
    },
    {
      id: 'audience-saved',
      labelKey: 'audienceSaved',
      isComplete: hasAudienceSaved,
    },
    {
      id: 'ar-analyzed',
      labelKey: 'arAnalyzed',
      isComplete: hasARRun,
      value: arScore !== null ? `${arScore}/100` : undefined,
    },
    {
      id: 'ar-target',
      labelKey: 'scoreTarget',
      isComplete: isAtTarget,
      value: arScore !== null ? `${arScore}` : undefined,
    },
    {
      id: 'collaborate-shared',
      labelKey: 'collaborateShared',
      isComplete: hasShare,
    },
  ]

  return {
    currentStep,
    nextStepLabelKey,
    nextStepEvent,
    arScore,
    arTarget: READY_FOR_PRODUCTION_THRESHOLD_V3,
    pointsToTarget,
    isAtTarget,
    progressItems,
    guideStatus,
    weakestCategory,
  }
}
