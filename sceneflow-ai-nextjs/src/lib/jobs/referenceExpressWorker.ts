import '@/models'
import GenerationJob from '@/models/GenerationJob'
import {
  notifyUser,
  patchGenerationJobPayload,
  updateGenerationJob,
} from '@/lib/jobs/jobService'
import { calculateBackoffDelay, isRetryableError } from '@/lib/utils/retry'
import { runReferenceExpressItem } from '@/lib/vision/referenceExpress/runItem'
import {
  summarizeItemResults,
  referenceExpressItemKey,
  type ReferenceExpressItem,
  type ReferenceExpressItemResult,
  type ReferenceExpressScope,
} from '@/lib/vision/referenceExpress/types'
import { runLocationCatalogSyncStep } from '@/lib/vision/referenceExpress/catalogSync'
import {
  loadReferenceExpressContext,
  planFollowOnNestedItems,
  shouldIncludeNestedStills,
} from '@/lib/vision/referenceExpress/planItems'
import {
  getReferenceExpressMaxAttempts,
  isReferenceExpressLeaseHeld,
  millisUntilNextAttempt,
  readReferenceExpressWorkerState,
  REFERENCE_EXPRESS_BACKOFF_MS,
  REFERENCE_EXPRESS_MAX_BACKOFF_MS,
  resolveReferenceExpressStepWindow,
  type ReferenceExpressWorkerState,
} from '@/lib/jobs/referenceExpressWorkerState'

export type ReferenceExpressStepOutcome = {
  done: boolean
  error?: string
  /** Index of the first item this step acted on. */
  cursor?: number
  /** Another invocation currently holds the lease on this window. */
  inFlight?: boolean
  /** Caller should wait this long before stepping again (rate-limit backoff). */
  retryInMs?: number
}

async function saveWorkerState(
  jobId: string,
  worker: ReferenceExpressWorkerState
): Promise<void> {
  await patchGenerationJobPayload(jobId, { _worker: worker })
}

function readItems(payload: Record<string, unknown>): ReferenceExpressItem[] {
  const items = payload.items
  return Array.isArray(items) ? (items as ReferenceExpressItem[]) : []
}

function scopeFromPayload(payload: Record<string, unknown>): ReferenceExpressScope {
  const sceneIndices = Array.isArray(payload.sceneIndices)
    ? payload.sceneIndices.filter((index): index is number => Number.isInteger(index) && index >= 0)
    : undefined
  const kinds = Array.isArray(payload.kinds)
    ? (payload.kinds as ReferenceExpressScope['kinds'])
    : undefined
  return {
    sceneIndices,
    kinds,
    includeNestedStills:
      payload.includeNestedStills === true ||
      shouldIncludeNestedStills({ sceneIndices, kinds }),
  }
}

async function appendFollowOnNestedItems(input: {
  jobId: string
  projectId: string
  payload: Record<string, unknown>
  items: ReferenceExpressItem[]
  windowItems: Array<{ item: ReferenceExpressItem; result: ReferenceExpressItemResult }>
}): Promise<ReferenceExpressItem[]> {
  const { jobId, projectId, payload, items, windowItems } = input
  const scope = scopeFromPayload(payload)
  if (!shouldIncludeNestedStills(scope)) return items

  const succeeded = windowItems.filter((row) => row.result.status === 'succeeded')
  if (succeeded.length === 0) return items

  const context = await loadReferenceExpressContext(projectId)
  if (!context) return items

  const existing = new Set(items.map((item) => referenceExpressItemKey(item)))
  const followOns: ReferenceExpressItem[] = []
  for (const row of succeeded) {
    for (const followOn of planFollowOnNestedItems(row.item, context, scope)) {
      const key = referenceExpressItemKey(followOn)
      if (existing.has(key)) continue
      existing.add(key)
      followOns.push(followOn)
    }
  }
  if (followOns.length === 0) return items

  const nextItems = [...items, ...followOns]
  await patchGenerationJobPayload(jobId, {
    items: nextItems,
    itemCount: nextItems.length,
    castCount: nextItems.filter((item) => item.kind === 'cast').length,
    locationCount: nextItems.filter((item) => item.kind === 'location').length,
    propCount: nextItems.filter((item) => item.kind === 'prop').length,
  })
  return nextItems
}

async function failJob(
  jobId: string,
  userId: string,
  projectId: string,
  message: string
): Promise<ReferenceExpressStepOutcome> {
  await updateGenerationJob(jobId, { status: 'failed', error: message })
  await notifyUser({
    userId,
    projectId,
    jobId,
    type: 'job_failed',
    title: 'Reference generation failed',
    message,
    metadata: { kind: 'reference_express' },
  })
  return { done: true, error: message }
}

async function completeJob(
  jobId: string,
  userId: string,
  projectId: string,
  results: ReferenceExpressItemResult[],
  options?: { nothingToGenerate?: boolean }
): Promise<ReferenceExpressStepOutcome> {
  const summary = summarizeItemResults(results)
  const nothingToGenerate = options?.nothingToGenerate === true || summary.total === 0

  await updateGenerationJob(jobId, {
    status: 'completed',
    progress: 100,
    result: { ...summary, items: results, nothingToGenerate },
  })

  if (options?.nothingToGenerate === true && summary.total === 0) {
    await notifyUser({
      userId,
      projectId,
      jobId,
      type: 'job_completed',
      title: 'Location Agent finished',
      message: 'Locations already match the script — nothing to generate.',
      metadata: { kind: 'reference_express', ...summary, nothingToGenerate: true },
    })
    return { done: true }
  }

  const parts = [`Generated ${summary.succeeded} of ${summary.total} reference images.`]
  if (summary.failed) parts.push(`${summary.failed} failed.`)
  if (summary.skipped) parts.push(`${summary.skipped} skipped.`)
  if (summary.staleCount) {
    parts.push(`${summary.staleCount} changed while the batch ran — consider a re-run.`)
  }

  await notifyUser({
    userId,
    projectId,
    jobId,
    type: 'job_completed',
    title: 'Reference images ready',
    message: parts.join(' '),
    metadata: { kind: 'reference_express', ...summary },
  })

  return { done: true }
}

/**
 * Run the next window of a reference_express job.
 *
 * A window is one cast item, or up to `REFERENCE_EXPRESS_CONCURRENCY` location
 * and prop items. Cast stays alone because the 429 bursts that made this worker
 * serial come from the identity-reference lane a portrait uses, and because one
 * portrait can already consume most of a function's time budget.
 *
 * Retries are deferred to a later step rather than slept through in place, for
 * the same budget reason. Items in the window that already landed are kept in
 * `windowResults`, so a rate limit on one image does not redraw its siblings.
 */
async function runCatalogPhase(
  jobId: string,
  userId: string,
  projectId: string,
  payload: Record<string, unknown>,
  worker: ReferenceExpressWorkerState
): Promise<ReferenceExpressStepOutcome> {
  if (!worker.catalogSync || worker.catalogSync.status === 'done') {
    return runCurrentWindow(jobId, userId, projectId, payload, worker)
  }

  if (isReferenceExpressLeaseHeld(worker)) {
    return { done: false, cursor: worker.cursor, inFlight: true }
  }

  const waitMs = millisUntilNextAttempt(worker)
  if (waitMs > 0) {
    return { done: false, cursor: worker.cursor, retryInMs: waitMs }
  }

  await saveWorkerState(jobId, { ...worker, inFlightAt: new Date().toISOString() })

  const maxAttempts = getReferenceExpressMaxAttempts()
  const attempt = worker.attempt + 1
  const items = readItems(payload)

  try {
    const outcome = await runLocationCatalogSyncStep({
      projectId,
      catalogSync: worker.catalogSync,
      items,
    })

    if (outcome.kind === 'nothing-to-generate') {
      await patchGenerationJobPayload(jobId, {
        items: [],
        itemCount: 0,
        locationCount: 0,
        _worker: {
          ...worker,
          catalogSync: outcome.catalogSync,
          attempt: 0,
          nextAttemptAt: null,
          inFlightAt: null,
        },
      })
      return completeJob(jobId, userId, projectId, worker.results, { nothingToGenerate: true })
    }

    const nextItems = outcome.items ?? items
    const sync = outcome.catalogSync
    const progress =
      sync.status === 'syncing' && sync.locationIds.length > 0
        ? Math.round(5 + (sync.cursor / sync.locationIds.length) * 15)
        : sync.status === 'done'
          ? 20
          : 5

    await patchGenerationJobPayload(jobId, {
      items: nextItems,
      itemCount: nextItems.length,
      locationCount: nextItems.filter((item) => item.kind === 'location').length,
      castCount: nextItems.filter((item) => item.kind === 'cast').length,
      propCount: nextItems.filter((item) => item.kind === 'prop').length,
      _worker: {
        ...worker,
        catalogSync: sync,
        attempt: 0,
        nextAttemptAt: null,
        inFlightAt: null,
      },
    })
    await updateGenerationJob(jobId, { progress })
    return { done: false, cursor: worker.cursor }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Location catalog sync failed'
    if (isRetryableError(err, (err as { status?: number })?.status) && attempt < maxAttempts) {
      const delay = calculateBackoffDelay(
        attempt - 1,
        REFERENCE_EXPRESS_BACKOFF_MS,
        REFERENCE_EXPRESS_MAX_BACKOFF_MS
      )
      await saveWorkerState(jobId, {
        ...worker,
        attempt,
        nextAttemptAt: new Date(Date.now() + delay).toISOString(),
        inFlightAt: null,
      })
      return { done: false, cursor: worker.cursor, retryInMs: delay }
    }
    const catalog = worker.catalogSync
    if (catalog.status === 'syncing') {
      console.error(
        `[ReferenceExpress] Location catalog sync failed for ${catalog.locationIds[catalog.cursor] || 'location'}:`,
        message
      )
      await saveWorkerState(jobId, {
        ...worker,
        catalogSync: { ...catalog, cursor: catalog.cursor + 1 },
        attempt: 0,
        nextAttemptAt: null,
        inFlightAt: null,
      })
      return { done: false, cursor: worker.cursor }
    }
    return failJob(jobId, userId, projectId, message)
  }
}

async function runCurrentWindow(
  jobId: string,
  userId: string,
  projectId: string,
  payload: Record<string, unknown>,
  worker: ReferenceExpressWorkerState
): Promise<ReferenceExpressStepOutcome> {
  if (worker.catalogSync && worker.catalogSync.status !== 'done') {
    return runCatalogPhase(jobId, userId, projectId, payload, worker)
  }

  if (isReferenceExpressLeaseHeld(worker)) {
    return { done: false, cursor: worker.cursor, inFlight: true }
  }

  const items = readItems(payload)
  if (worker.cursor >= items.length) {
    return completeJob(jobId, userId, projectId, worker.results)
  }

  const waitMs = millisUntilNextAttempt(worker)
  if (waitMs > 0) {
    return { done: false, cursor: worker.cursor, retryInMs: waitMs }
  }

  const windowSize = resolveReferenceExpressStepWindow(items, worker.cursor)
  const landed = { ...(worker.windowResults ?? {}) }
  const pending = Array.from({ length: windowSize }, (_, offset) => worker.cursor + offset).filter(
    (index) => !landed[String(index)]
  )

  await saveWorkerState(jobId, { ...worker, inFlightAt: new Date().toISOString() })

  const maxAttempts = getReferenceExpressMaxAttempts()
  const attempt = worker.attempt + 1
  let retryable = false

  const outcomes = await Promise.all(
    pending.map(async (index) => {
      const item = items[index]!
      try {
        return { index, result: await runReferenceExpressItem({ userId, projectId, item }) }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Reference generation failed'
        if (isRetryableError(err, (err as { status?: number })?.status) && attempt < maxAttempts) {
          retryable = true
          console.warn(
            `[ReferenceExpress] ${item.label} attempt ${attempt}/${maxAttempts} failed (${message}); retrying in a later step`
          )
          return { index, result: null }
        }
        console.error(`[ReferenceExpress] ${item.label} failed permanently:`, message)
        return {
          index,
          result: {
            kind: item.kind,
            targetId: item.targetId,
            label: item.label,
            status: 'failed' as const,
            error: message,
          },
        }
      }
    })
  )

  for (const outcome of outcomes) {
    if (outcome.result) landed[String(outcome.index)] = outcome.result
  }

  if (retryable) {
    const delay = calculateBackoffDelay(
      attempt - 1,
      REFERENCE_EXPRESS_BACKOFF_MS,
      REFERENCE_EXPRESS_MAX_BACKOFF_MS
    )
    await saveWorkerState(jobId, {
      ...worker,
      attempt,
      nextAttemptAt: new Date(Date.now() + delay).toISOString(),
      inFlightAt: null,
      windowResults: landed,
    })
    return { done: false, cursor: worker.cursor, retryInMs: delay }
  }

  const results = [
    ...worker.results,
    ...Array.from({ length: windowSize }, (_, offset) => landed[String(worker.cursor + offset)]!),
  ]
  const nextCursor = worker.cursor + windowSize

  const nextItems = await appendFollowOnNestedItems({
    jobId,
    projectId,
    payload,
    items,
    windowItems: Array.from({ length: windowSize }, (_, offset) => ({
      item: items[worker.cursor + offset]!,
      result: landed[String(worker.cursor + offset)]!,
    })),
  })

  await updateGenerationJob(jobId, {
    progress: Math.round((nextCursor / nextItems.length) * 100),
  })
  await saveWorkerState(jobId, {
    cursor: nextCursor,
    attempt: 0,
    nextAttemptAt: null,
    results,
    inFlightAt: null,
    windowResults: {},
  })

  if (nextCursor >= nextItems.length) {
    return completeJob(jobId, userId, projectId, results)
  }
  return { done: false, cursor: nextCursor }
}

/**
 * Advance a reference_express job by one window. Safe to call repeatedly: a DB
 * lease guards the in-flight window and the cursor only moves once every item
 * in it resolves.
 */
export async function runReferenceExpressStep(
  jobId: string
): Promise<ReferenceExpressStepOutcome> {
  const job = await GenerationJob.findByPk(jobId)
  if (!job || job.job_type !== 'reference_express') {
    return { done: true, error: 'Job not found' }
  }

  if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
    return { done: true }
  }

  const userId = job.user_id
  const projectId = job.project_id
  const payload = (job.payload ?? {}) as Record<string, unknown>

  try {
    if (job.status === 'processing') {
      const worker = readReferenceExpressWorkerState(payload)
      if (!worker) {
        return {
          done: true,
          error: 'Reference worker state missing — cancel and start a new batch',
        }
      }
      return await runCurrentWindow(jobId, userId, projectId, payload, worker)
    }

    if (job.status !== 'queued') {
      return { done: true, error: `Unexpected job status: ${job.status}` }
    }

    // Init runs only while queued. The conditional update is the claim, so
    // concurrent callers cannot initialize the same job twice.
    const [claimed] = await GenerationJob.update(
      { status: 'processing', progress: 2 },
      { where: { id: jobId, status: 'queued' } }
    )

    if (claimed === 0) {
      const retry = await GenerationJob.findByPk(jobId)
      const retryWorker = retry
        ? readReferenceExpressWorkerState((retry.payload ?? {}) as Record<string, unknown>)
        : null
      if (retry?.status === 'processing' && retryWorker) {
        return await runCurrentWindow(
          jobId,
          userId,
          projectId,
          (retry.payload ?? {}) as Record<string, unknown>,
          retryWorker
        )
      }
      return { done: false, inFlight: true }
    }

    const items = readItems(payload)
    const catalogSync =
      payload.catalogSync === 'location'
        ? { status: 'pending' as const, cursor: 0, locationIds: [] as string[] }
        : undefined

    if (!items.length && payload.catalogSync !== 'location') {
      return failJob(jobId, userId, projectId, 'No references needed generation')
    }

    await saveWorkerState(jobId, {
      cursor: 0,
      attempt: 0,
      nextAttemptAt: null,
      results: [],
      inFlightAt: null,
      windowResults: {},
      catalogSync,
    })
    return { done: false, cursor: 0 }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Reference generation failed'
    return failJob(jobId, userId, projectId, message)
  }
}
