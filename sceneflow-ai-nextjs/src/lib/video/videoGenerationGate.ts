/**
 * Process-wide cap on concurrent video generations.
 *
 * Video Agent and Take each open their own HTTP request. Without a shared
 * admission lock, one Fluid instance will run every request that arrives.
 * The cap matches CONCURRENCY_DEFAULTS.VIDEO_GENERATION (two). It is not
 * distributed across serverless instances.
 */

import { CONCURRENCY_DEFAULTS } from '@/lib/utils/concurrent-processor'

const max = CONCURRENCY_DEFAULTS.VIDEO_GENERATION
let inFlight = 0
const waiters: Array<() => void> = []

export async function runInVideoGenerationGate<T>(fn: () => Promise<T>): Promise<T> {
  while (inFlight >= max) {
    await new Promise<void>((resolve) => {
      waiters.push(resolve)
    })
  }
  inFlight += 1
  try {
    return await fn()
  } finally {
    inFlight = Math.max(0, inFlight - 1)
    waiters.shift()?.()
  }
}

/** Test-only. */
export function resetVideoGenerationGateForTests(): void {
  inFlight = 0
  waiters.length = 0
}

export function getVideoGenerationGateInFlight(): number {
  return inFlight
}
