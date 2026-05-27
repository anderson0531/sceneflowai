/**
 * Unified Blueprint progress calculator for sidebar checklist, header strip, and next-step banner.
 */

import type { WorkflowStepStatus } from '@/config/nav/workflowGuideConfig'
import {
  READY_FOR_PRODUCTION_THRESHOLD_V3,
  type AudienceDefinition,
  type PersistedBlueprintAudienceResonance,
} from '@/lib/types/audienceResonance'

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
  label: string
  isComplete: boolean
  value?: string
}

export interface BlueprintProgressResult {
  currentStep: BlueprintWorkflowStep
  nextStepLabel: string
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

export function scrollToBlueprintSection(section: string) {
  if (typeof window === 'undefined') return
  const el = document.querySelector(`[data-blueprint-section="${section}"]`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.classList.add('ring-2', 'ring-cyan-400/60', 'rounded-lg')
    window.setTimeout(() => {
      el.classList.remove('ring-2', 'ring-cyan-400/60', 'rounded-lg')
    }, 2000)
  }
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
  let nextStepLabel = 'Generate Blueprint'
  let nextStepEvent: string | null = 'blueprint:generate-treatment'

  if (input.hasBlueprint) {
    currentStep = 'review'
    nextStepLabel = 'Save audience & run Audience Resonance'
    nextStepEvent = 'blueprint:analyze-resonance'

    if (hasAudienceSaved && hasARRun) {
      currentStep = 'iterate'
      nextStepLabel =
        pendingRecs.length > 0
          ? 'Apply top Audience Resonance fix'
          : isAtTarget
            ? 'Start Production'
            : 'Re-analyze or refine Blueprint'
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
        nextStepLabel = isAtTarget ? 'Start Production' : 'Improve score or Start Production'
        nextStepEvent = 'blueprint:start-production'
      }
    }
  }

  if (input.isGenerating) {
    currentStep = 'generate'
    nextStepLabel = 'Generating Blueprint…'
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
      label: 'Blueprint generated',
      isComplete: input.hasBlueprint,
    },
    {
      id: 'audience-saved',
      label: 'Target audience saved',
      isComplete: hasAudienceSaved,
    },
    {
      id: 'ar-analyzed',
      label: 'Audience Resonance analyzed',
      isComplete: hasARRun,
      value: arScore !== null ? `${arScore}/100` : undefined,
    },
    {
      id: 'ar-target',
      label: `Score ${READY_FOR_PRODUCTION_THRESHOLD_V3}+`,
      isComplete: isAtTarget,
      value: arScore !== null ? `${arScore}` : undefined,
    },
    {
      id: 'collaborate-shared',
      label: 'Collaborate link shared',
      isComplete: hasShare,
    },
  ]

  return {
    currentStep,
    nextStepLabel,
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
