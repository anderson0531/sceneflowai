/**
 * Blueprint Ready checklist + soft AR gate before Start Production.
 */

import { READY_FOR_PRODUCTION_THRESHOLD_V3 } from '@/lib/types/audienceResonance'
import { formatBlueprintRuntime } from '@/lib/blueprint/formatBlueprintCore'
import {
  getArtStylePresetName,
  resolveVariantArtStyle,
  resolveVariantAspectRatio,
} from '@/lib/treatment/blueprintFoundation'
import { computeBlueprintDurationFromBeats } from '@/lib/treatment/duration'
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
  artStyleSet: boolean
  aspectRatioSet: boolean
  artStyleLabel: string | null
  aspectRatioLabel: string | null
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

  const runtimeEstimate = resolveRuntimeEstimate(input.variant, input.estimatedRuntimeMinutes)

  const artStyle = input.variant ? resolveVariantArtStyle(input.variant) : null
  const aspectRatio = input.variant ? resolveVariantAspectRatio(input.variant) : null
  const artStyleSet = !!artStyle
  const aspectRatioSet = !!aspectRatio

  const blueprintGenerated = input.hasBlueprint
  const isBlueprintReady =
    blueprintGenerated &&
    audienceSaved &&
    arRunAtLeastOnce &&
    scoreAtTarget &&
    artStyleSet &&
    aspectRatioSet

  const missingItems: string[] = []
  if (!blueprintGenerated) missingItems.push('Generate a Blueprint first')
  if (!artStyleSet) missingItems.push('Select an art style in Visual Foundation')
  if (!aspectRatioSet) missingItems.push('Select an aspect ratio in Visual Foundation')
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
    artStyleSet,
    aspectRatioSet,
    artStyleLabel: artStyle ? getArtStylePresetName(artStyle) : null,
    aspectRatioLabel: aspectRatio,
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

  if (!checklist.artStyleSet) {
    reasons.push('Select an art style in Blueprint Visual Foundation.')
  }
  if (!checklist.aspectRatioSet) {
    reasons.push('Select an aspect ratio in Blueprint Visual Foundation.')
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

function resolveRuntimeEstimate(
  variant: Record<string, unknown> | null,
  legacyEstimatedMinutes?: number | null
): string | null {
  const estMin = variant?.estimatedDurationMinutes
  if (typeof estMin === 'number' && estMin > 0) {
    return `~${Math.round(estMin)} min`
  }

  const beats = variant?.beats
  if (Array.isArray(beats) && beats.length > 0) {
    const { estimatedDurationMinutes } = computeBlueprintDurationFromBeats(
      beats as Array<{ minutes?: number }>
    )
    return `~${estimatedDurationMinutes} min`
  }

  if (typeof variant?.format_length === 'string' && variant.format_length) {
    const { display } = formatBlueprintRuntime(variant.format_length)
    return display || variant.format_length
  }

  if (legacyEstimatedMinutes != null) {
    return `~${Math.round(legacyEstimatedMinutes)} min`
  }

  return null
}
