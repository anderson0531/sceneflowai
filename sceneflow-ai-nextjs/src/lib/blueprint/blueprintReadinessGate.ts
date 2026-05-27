/**
 * Blueprint Ready checklist + soft AR gate before Start Production.
 */

import { READY_FOR_PRODUCTION_THRESHOLD_V3 } from '@/lib/types/audienceResonance'
import type {
  AudienceDefinition,
  PersistedBlueprintAudienceResonance,
} from '@/lib/types/audienceResonance'

export interface BlueprintReadyChecklist {
  blueprintGenerated: boolean
  audienceSaved: boolean
  arRunAtLeastOnce: boolean
  scoreAtTarget: boolean
  arScore: number | null
  beatsCount: number
  characterCount: number
  runtimeEstimate: string | null
  isBlueprintReady: boolean
  missingItems: string[]
}

export interface StartProductionGateResult {
  allowed: boolean
  hardBlock: boolean
  reasons: string[]
  checklist: BlueprintReadyChecklist
}

export function evaluateBlueprintReadyChecklist(input: {
  hasBlueprint: boolean
  variant: Record<string, unknown> | null
  audienceDefinition: AudienceDefinition | null
  savedBlueprintAR: PersistedBlueprintAudienceResonance | null
  estimatedRuntimeMinutes?: number | null
}): BlueprintReadyChecklist {
  const beats = Array.isArray(input.variant?.beats) ? input.variant!.beats : []
  const characters = Array.isArray(input.variant?.character_descriptions)
    ? input.variant!.character_descriptions
    : []
  const arScore = input.savedBlueprintAR?.analysis?.overallScore ?? null
  const audienceSaved = !!(
    input.audienceDefinition?.updatedAt ||
    input.savedBlueprintAR?.audienceDefinition?.updatedAt
  )
  const arRunAtLeastOnce = !!input.savedBlueprintAR?.analysis
  const scoreAtTarget =
    arScore !== null && arScore >= READY_FOR_PRODUCTION_THRESHOLD_V3

  const runtimeEstimate =
    input.estimatedRuntimeMinutes != null
      ? `~${Math.round(input.estimatedRuntimeMinutes)} min`
      : typeof input.variant?.format_length === 'string'
        ? String(input.variant.format_length)
        : null

  const blueprintGenerated = input.hasBlueprint
  const isBlueprintReady =
    blueprintGenerated && audienceSaved && arRunAtLeastOnce && scoreAtTarget

  const missingItems: string[] = []
  if (!blueprintGenerated) missingItems.push('Generate a Blueprint first')
  if (!audienceSaved) missingItems.push('Save your target audience')
  if (!arRunAtLeastOnce) missingItems.push('Run Audience Resonance at least once')
  if (!scoreAtTarget) {
    missingItems.push(
      `Reach ${READY_FOR_PRODUCTION_THRESHOLD_V3}+ Audience Resonance (currently ${arScore ?? '—'})`
    )
  }

  return {
    blueprintGenerated,
    audienceSaved,
    arRunAtLeastOnce,
    scoreAtTarget,
    arScore,
    beatsCount: beats.length,
    characterCount: characters.length,
    runtimeEstimate,
    isBlueprintReady,
    missingItems,
  }
}

export function evaluateStartProductionGate(input: {
  checklist: BlueprintReadyChecklist
  overrideSoftGate?: boolean
}): StartProductionGateResult {
  const { checklist } = input
  const reasons: string[] = []

  if (!checklist.blueprintGenerated) {
    return {
      allowed: false,
      hardBlock: true,
      reasons: ['Generate a Blueprint before starting Production.'],
      checklist,
    }
  }

  if (!checklist.audienceSaved) {
    reasons.push('Save your target audience in the Resonance panel.')
  }
  if (!checklist.arRunAtLeastOnce) {
    reasons.push('Run Audience Resonance at least once.')
  }
  if (!checklist.scoreAtTarget) {
    reasons.push(
      `Audience Resonance is below ${READY_FOR_PRODUCTION_THRESHOLD_V3} (score: ${checklist.arScore ?? '—'}).`
    )
  }

  if (reasons.length === 0) {
    return { allowed: true, hardBlock: false, reasons: [], checklist }
  }

  if (input.overrideSoftGate) {
    return { allowed: true, hardBlock: false, reasons, checklist }
  }

  return { allowed: false, hardBlock: false, reasons, checklist }
}
