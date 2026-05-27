'use client'

import { useCallback, useMemo } from 'react'
import {
  canAdvanceScriptLock,
  canRetreatScriptLock,
  getScriptLockLabel,
  getScriptLockStatusFromMetadata,
  normalizeScriptLockStatus,
  type ScriptLockStatus,
} from '@/lib/production/scriptLock'

export function useProductionScriptLock(projectMetadata: unknown) {
  const scriptLockStatus = useMemo(
    () => getScriptLockStatusFromMetadata(projectMetadata),
    [projectMetadata]
  )

  const scriptLockLabel = useMemo(
    () => getScriptLockLabel(scriptLockStatus),
    [scriptLockStatus]
  )

  const nextStatus = useMemo(
    () => canAdvanceScriptLock(scriptLockStatus),
    [scriptLockStatus]
  )

  const previousStatus = useMemo(
    () => canRetreatScriptLock(scriptLockStatus),
    [scriptLockStatus]
  )

  const buildMetadataPatch = useCallback((status: ScriptLockStatus) => {
    const normalized = normalizeScriptLockStatus(status)
    return {
      visionPhase: {
        scriptLockStatus: normalized,
        scriptLockedAt:
          normalized === 'locked' ? new Date().toISOString() : undefined,
      },
    }
  }, [])

  return {
    scriptLockStatus,
    scriptLockLabel,
    nextStatus,
    previousStatus,
    buildMetadataPatch,
  }
}
