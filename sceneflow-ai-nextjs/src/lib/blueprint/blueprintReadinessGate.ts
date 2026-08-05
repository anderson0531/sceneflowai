/**
 * Blueprint Ready checklist + soft AR gate before Start Production.
 */

import { READY_FOR_PRODUCTION_THRESHOLD_V3 } from '@/lib/types/audienceResonance'
import {
  getArtStylePresetName,
  resolveVariantArtStyle,
  resolveVariantAspectRatio,
} from '@/lib/treatment/blueprintFoundation'
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
  /** Catalog keys under `blueprint.gate`; the renderer translates them. */
  missingItemKeys: string[]
}

/** A gate message as a catalog key plus any values it interpolates. */
export interface GateReason {
  key: string
  values?: Record<string, string | number>
}

export interface StartProductionGateResult {
  allowed: boolean
  hardBlock: boolean
  /** Catalog keys under `blueprint.gate`; the renderer translates them. */
  reasonKeys: GateReason[]
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

  const missingItemKeys: string[] = []
  if (!blueprintGenerated) missingItemKeys.push('missingBlueprint')
  if (!artStyleSet) missingItemKeys.push('missingArtStyle')
  if (!aspectRatioSet) missingItemKeys.push('missingAspectRatio')
  if (!audienceSaved) missingItemKeys.push('missingAudience')
  if (!arRunAtLeastOnce) missingItemKeys.push('missingArRun')
  if (!scoreAtTarget) missingItemKeys.push('missingScore')

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
    missingItemKeys,
  }
}

export function evaluateStartProductionGate(input: {
  checklist: BlueprintReadyChecklist
  overrideSoftGate?: boolean
}): StartProductionGateResult {
  const { checklist } = input
  const reasons: GateReason[] = []

  if (!checklist.blueprintGenerated) {
    return {
      allowed: false,
      hardBlock: true,
      reasonKeys: [{ key: 'blockGenerateFirst' }],
      checklist,
    }
  }

  if (!checklist.artStyleSet) {
    reasons.push({ key: 'needArtStyle' })
  }
  if (!checklist.aspectRatioSet) {
    reasons.push({ key: 'needAspectRatio' })
  }
  if (!checklist.audienceSaved) {
    reasons.push({ key: 'needAudience' })
  }
  if (!checklist.arRunAtLeastOnce) {
    reasons.push({ key: 'needArRun' })
  }
  if (!checklist.scoreAtTarget) {
    reasons.push({
      key: 'needScore',
      values: {
        target: READY_FOR_PRODUCTION_THRESHOLD_V3,
        score: checklist.arScore ?? '—',
      },
    })
  }

  if (reasons.length === 0) {
    return { allowed: true, hardBlock: false, reasonKeys: [], checklist }
  }

  if (input.overrideSoftGate) {
    return { allowed: true, hardBlock: false, reasonKeys: reasons, checklist }
  }

  return { allowed: false, hardBlock: false, reasonKeys: reasons, checklist }
}
