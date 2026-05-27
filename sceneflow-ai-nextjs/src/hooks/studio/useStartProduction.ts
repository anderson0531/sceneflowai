'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { BLUEPRINT_COPY } from '@/lib/blueprint/blueprintGlossary'
import {
  getOrCreateAuthUserId,
  startProductionFromBlueprint,
} from '@/lib/blueprint/startProduction'
import type { StartProductionGateResult } from '@/lib/blueprint/blueprintReadinessGate'

export function useStartProduction(projectId: string) {
  const router = useRouter()
  const [isStarting, setIsStarting] = useState(false)
  const [showPreflight, setShowPreflight] = useState(false)
  const [pendingVariant, setPendingVariant] = useState<Record<string, unknown> | null>(null)
  const [pendingGate, setPendingGate] = useState<StartProductionGateResult | null>(null)

  const executeHandoff = useCallback(
    async (variant: Record<string, unknown>) => {
      setIsStarting(true)
      try {
        toast.info(BLUEPRINT_COPY.startingProduction)
        const result = await startProductionFromBlueprint({
          variant,
          userId: getOrCreateAuthUserId(),
          sourceBlueprintProjectId: projectId.startsWith('new-project') ? undefined : projectId,
        })

        if (result.success && result.redirect) {
          toast.success(BLUEPRINT_COPY.blueprintSavedOpeningProduction)
          router.push(result.redirect)
        } else {
          toast.error(result.error || 'Failed to start Production')
        }
      } catch (e) {
        console.error('[useStartProduction]', e)
        toast.error('Failed to start Production')
      } finally {
        setIsStarting(false)
        setShowPreflight(false)
        setPendingVariant(null)
        setPendingGate(null)
      }
    },
    [projectId, router]
  )

  const requestStartProduction = useCallback(
    (variant: Record<string, unknown> | null, gate: StartProductionGateResult) => {
      if (!variant) {
        toast.error('No Blueprint variant found')
        return
      }

      if (gate.hardBlock || !gate.allowed) {
        setPendingVariant(variant)
        setPendingGate(gate)
        setShowPreflight(true)
        return
      }

      void executeHandoff(variant)
    },
    [executeHandoff]
  )

  const confirmStartProduction = useCallback(
    (override = false) => {
      if (!pendingVariant || !pendingGate) return
      if (override && !pendingGate.hardBlock) {
        void executeHandoff(pendingVariant)
        return
      }
      if (pendingGate.allowed) {
        void executeHandoff(pendingVariant)
      }
    },
    [pendingVariant, pendingGate, executeHandoff]
  )

  const cancelStartProduction = useCallback(() => {
    setShowPreflight(false)
    setPendingVariant(null)
    setPendingGate(null)
  }, [])

  return {
    isStarting,
    showPreflight,
    pendingGate,
    requestStartProduction,
    confirmStartProduction,
    cancelStartProduction,
    executeHandoff,
  }
}
