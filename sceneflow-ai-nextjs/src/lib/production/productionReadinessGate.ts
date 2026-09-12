/**
 * Pre-Vis Ready checklist + Express gate helpers.
 */

import { calculateProductionReadiness } from '@/components/ui/StatusBadge'
import { getStoryboardBeatProgress } from '@/lib/production/sceneProgress'
import {
  formatReferenceReadinessMessage,
  resolveReferenceReadiness,
  type ReferenceReadiness,
} from '@/lib/vision/referenceReadiness'

export interface ExpressGateResult {
  allowed: boolean
  reasons: string[]
  /**
   * Undrawn references are the only thing blocking.
   *
   * A project-wide run still has to wait — it touches every scene, so it needs
   * every reference. A scene-level run does not: it draws the gaps its own
   * scene has, which is a step rather than a stop.
   */
  blockedOnlyByReferences: boolean
}

/** Vision characters use `referenceImage`; some callers pass `referenceImageUrl`. */
export function resolveCharacterReferenceImageUrl(
  character: { referenceImageUrl?: string; referenceImage?: string }
): string | undefined {
  const url = character.referenceImageUrl ?? character.referenceImage
  return typeof url === 'string' && url.trim() ? url.trim() : undefined
}

export interface ProductionReadyChecklist {
  voicesReady: boolean
  hasReferences: boolean
  storyboardBeatsReady: boolean
  missingVoices: string[]
  storyboardBeatsComplete: number
  storyboardBeatsTotal: number
  /** Every reference row in the library has a generated image. */
  referencesReady: boolean
  referenceReadiness: ReferenceReadiness
  /** True when voices and references are ready for Express. */
  isPreVisReady: boolean
  /** @deprecated Use isPreVisReady */
  isProductionReady: boolean
}

export function evaluateProductionReadyChecklist(input: {
  characters: Array<{ name: string; type?: string; voiceConfig?: unknown; referenceImageUrl?: string; referenceImage?: string }>
  scenes: Record<string, unknown>[]
  objectReferences?: Array<{ name?: string; imageUrl?: string }>
  locationReferences?: Array<{ location?: string; locationDisplay?: string; name?: string; imageUrl?: string }>
}): ProductionReadyChecklist {
  const readiness = calculateProductionReadiness(input.characters, input.scenes as never[])
  const storyboardTotals = input.scenes.reduce(
    (acc, scene) => {
      const { complete, total } = getStoryboardBeatProgress(scene)
      return { complete: acc.complete + complete, total: acc.total + total }
    },
    { complete: 0, total: 0 }
  )

  const hasReferences =
    input.characters.some((c) => !!resolveCharacterReferenceImageUrl(c)) ||
    (input.objectReferences?.length ?? 0) > 0 ||
    (input.locationReferences?.length ?? 0) > 0

  const referenceReadiness = resolveReferenceReadiness({
    characters: input.characters,
    objectReferences: input.objectReferences,
    locationReferences: input.locationReferences,
  })

  const voicesReady = readiness.isAudioReady
  const storyboardBeatsReady =
    storyboardTotals.total === 0 ||
    storyboardTotals.complete >= storyboardTotals.total

  const isPreVisReady = voicesReady && hasReferences && referenceReadiness.ready

  return {
    voicesReady,
    hasReferences,
    storyboardBeatsReady,
    missingVoices: readiness.charactersMissingVoices,
    storyboardBeatsComplete: storyboardTotals.complete,
    storyboardBeatsTotal: storyboardTotals.total,
    referencesReady: referenceReadiness.ready,
    referenceReadiness,
    isPreVisReady,
    isProductionReady: isPreVisReady,
  }
}

export function canRunExpress(input: {
  checklist: ProductionReadyChecklist
  /** When true, warn but allow (soft gate). */
  softGate?: boolean
}): ExpressGateResult {
  const reasons: string[] = []
  if (!input.checklist.voicesReady) {
    const missing = input.checklist.missingVoices.slice(0, 3).join(', ')
    reasons.push(
      input.checklist.missingVoices.length
        ? `Assign voices for: ${missing}${input.checklist.missingVoices.length > 3 ? '…' : ''}`
        : 'Assign character voices in the Reference Library.'
    )
  }
  if (!input.checklist.hasReferences) {
    reasons.push('Add at least one character, prop, or location reference before running agents.')
  }

  if (reasons.length === 0 && input.checklist.referencesReady !== false) {
    return { allowed: true, reasons: [], blockedOnlyByReferences: false }
  }

  // An un-imaged reference is a hard stop, not a warning: every frame that
  // names it invents a different appearance, so a soft-gated run produces
  // exactly the inconsistency Express exists to avoid.
  if (input.checklist.referencesReady === false) {
    return {
      allowed: false,
      reasons: [...reasons, formatReferenceReadinessMessage(input.checklist.referenceReadiness)],
      blockedOnlyByReferences: reasons.length === 0,
    }
  }

  return {
    allowed: input.softGate === true,
    reasons,
    blockedOnlyByReferences: false,
  }
}
