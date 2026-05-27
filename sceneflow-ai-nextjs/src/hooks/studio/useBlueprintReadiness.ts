'use client'

import { useMemo } from 'react'
import {
  evaluateBlueprintReadyChecklist,
  evaluateStartProductionGate,
  type BlueprintReadyChecklist,
  type StartProductionGateResult,
} from '@/lib/blueprint/blueprintReadinessGate'
import type {
  AudienceDefinition,
  PersistedBlueprintAudienceResonance,
} from '@/lib/types/audienceResonance'

export function useBlueprintReadiness(input: {
  hasBlueprint: boolean
  variant: Record<string, unknown> | null
  audienceDefinition: AudienceDefinition | null
  savedBlueprintAR: PersistedBlueprintAudienceResonance | null
  estimatedRuntimeMinutes?: number | null
}) {
  const checklist = useMemo(
    () => evaluateBlueprintReadyChecklist(input),
    [
      input.hasBlueprint,
      input.variant,
      input.audienceDefinition,
      input.savedBlueprintAR,
      input.estimatedRuntimeMinutes,
    ]
  )

  const evaluateGate = (overrideSoftGate = false): StartProductionGateResult =>
    evaluateStartProductionGate({ checklist, overrideSoftGate })

  return { checklist, evaluateGate }
}

export type { BlueprintReadyChecklist, StartProductionGateResult }
