/**
 * Production Ready checklist + Express gate helpers.
 */

import { calculateProductionReadiness } from '@/components/ui/StatusBadge'
import { isScriptLocked, type ScriptLockStatus } from '@/lib/production/scriptLock'
import { getStoryboardBeatProgress } from '@/lib/production/sceneProgress'

export interface ExpressGateResult {
  allowed: boolean
  reasons: string[]
}

export interface ProductionReadyChecklist {
  scriptLocked: boolean
  voicesReady: boolean
  hasReferences: boolean
  storyboardBeatsReady: boolean
  missingVoices: string[]
  storyboardBeatsComplete: number
  storyboardBeatsTotal: number
  isProductionReady: boolean
}

export function evaluateProductionReadyChecklist(input: {
  scriptLockStatus: ScriptLockStatus
  characters: Array<{ name: string; type?: string; voiceConfig?: unknown; referenceImageUrl?: string }>
  scenes: Record<string, unknown>[]
  objectReferences?: unknown[]
  locationReferences?: unknown[]
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
    input.characters.some((c) => !!c.referenceImageUrl) ||
    (input.objectReferences?.length ?? 0) > 0 ||
    (input.locationReferences?.length ?? 0) > 0

  const scriptLocked = isScriptLocked(input.scriptLockStatus)
  const voicesReady = readiness.isAudioReady
  const storyboardBeatsReady =
    storyboardTotals.total === 0 ||
    storyboardTotals.complete >= storyboardTotals.total

  return {
    scriptLocked,
    voicesReady,
    hasReferences,
    storyboardBeatsReady,
    missingVoices: readiness.charactersMissingVoices,
    storyboardBeatsComplete: storyboardTotals.complete,
    storyboardBeatsTotal: storyboardTotals.total,
    isProductionReady: scriptLocked && voicesReady && hasReferences,
  }
}

export function canRunExpress(input: {
  scriptLockStatus: ScriptLockStatus
  checklist: ProductionReadyChecklist
  /** When true, warn but allow (soft gate). */
  softGate?: boolean
}): ExpressGateResult {
  const reasons: string[] = []
  if (!input.checklist.scriptLocked) {
    reasons.push('Lock the script before running Express (Script tab → Script Status).')
  }
  if (!input.checklist.voicesReady) {
    const missing = input.checklist.missingVoices.slice(0, 3).join(', ')
    reasons.push(
      input.checklist.missingVoices.length
        ? `Assign voices for: ${missing}${input.checklist.missingVoices.length > 3 ? '…' : ''}`
        : 'Assign character voices in the Reference Library.'
    )
  }
  if (!input.checklist.hasReferences) {
    reasons.push('Add at least one character, prop, or location reference before Express.')
  }

  if (reasons.length === 0) {
    return { allowed: true, reasons: [] }
  }

  return {
    allowed: input.softGate === true,
    reasons,
  }
}
