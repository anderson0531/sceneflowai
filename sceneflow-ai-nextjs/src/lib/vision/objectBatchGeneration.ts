import {
  CONCURRENCY_DEFAULTS,
  processWithConcurrency,
} from '@/lib/utils/concurrent-processor'

/**
 * How many object reference images generate at once.
 *
 * Three is what the Vertex image lane answers without 429s, matching
 * `VERTEX_IMAGE_CONCURRENCY.geminiFlashImage`. That constant is not reused here
 * because it reads an env knob this client bundle cannot see, so it would
 * silently resolve to its default anyway.
 */
export const OBJECT_BATCH_CONCURRENCY = CONCURRENCY_DEFAULTS.IMAGE_GENERATION

export interface ObjectBatchTarget {
  id: string
  name: string
}

export interface ObjectBatchOptions<T extends ObjectBatchTarget> {
  /** Generates one object. A rejection fails that object, never the batch. */
  generate: (target: T) => Promise<void>
  /** Objects generating right now, in start order, for the progress overlay. */
  onInFlightChange?: (names: string[]) => void
  /** Whole-batch completion, 0-100. */
  onProgress?: (percent: number) => void
  concurrency?: number
}

export interface ObjectBatchSummary {
  total: number
  succeeded: number
  failed: number
  /** First failure's message, to name a cause when nothing generated. */
  firstError?: string
}

/**
 * Generate a batch of object reference images a few at a time.
 *
 * A script can suggest dozens of props, which one-at-a-time turned into a wait
 * behind a blocking overlay that users abandon. Kept out of the panel so the
 * batch's rules can be tested without a DOM: the concurrency cap holds, a
 * failed object does not take the rest of the batch with it, and progress
 * still reaches 100% when some of them fail.
 */
export async function runObjectBatch<T extends ObjectBatchTarget>(
  targets: T[],
  options: ObjectBatchOptions<T>
): Promise<ObjectBatchSummary> {
  const total = targets.length
  if (total === 0) return { total: 0, succeeded: 0, failed: 0 }

  const inFlight: string[] = []
  const reportInFlight = () => options.onInFlightChange?.([...inFlight])
  let settled = 0
  let failed = 0
  let firstError: string | undefined

  await processWithConcurrency(
    targets.map((target) => ({
      id: target.id,
      execute: async () => {
        inFlight.push(target.name)
        reportInFlight()
        try {
          await options.generate(target)
        } finally {
          const at = inFlight.indexOf(target.name)
          if (at > -1) inFlight.splice(at, 1)
          reportInFlight()
        }
      },
    })),
    options.concurrency ?? OBJECT_BATCH_CONCURRENCY,
    (event) => {
      if (event.type === 'error') {
        failed += 1
        firstError ??= event.error?.message
      }
      // Counted here rather than read from `event.completed`, which tallies
      // only fulfilled tasks — one failed object would otherwise leave the bar
      // short of 100% for the rest of the batch.
      if (event.type === 'complete' || event.type === 'error') {
        settled += 1
        options.onProgress?.(Math.round((settled / total) * 100))
      }
    },
    // Per-item retry is the user's to spend: a batch tends to fail as a batch
    // when credits run out or the lane is rate-limited, and retrying all of it
    // doubles the wait to the same end. A failed object keeps its place in the
    // suggestion list, with its own button.
    false
  )

  return {
    total,
    succeeded: total - failed,
    failed,
    ...(firstError ? { firstError } : {}),
  }
}
