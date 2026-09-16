'use client'

import { useEffect, useRef } from 'react'
import type { ReferenceExpressKind } from '@/lib/vision/referenceExpress/types'

/**
 * When the Reference Library banner asks a kind agent to run while that
 * tab's library is unmounted, the parent sets `pendingKindAgentRun`, switches
 * tabs, and the newly mounted library starts the existing handler.
 */
export function usePendingKindAgentRun(
  pendingKindAgentRun: ReferenceExpressKind | null | undefined,
  kind: ReferenceExpressKind,
  run: () => void | Promise<void>,
  onConsumed?: () => void
) {
  const runRef = useRef(run)
  runRef.current = run
  const onConsumedRef = useRef(onConsumed)
  onConsumedRef.current = onConsumed

  useEffect(() => {
    if (pendingKindAgentRun !== kind) return
    void Promise.resolve(runRef.current()).finally(() => {
      onConsumedRef.current?.()
    })
  }, [pendingKindAgentRun, kind])
}
