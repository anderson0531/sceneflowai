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
  type ReferenceExpressItem,
  type ReferenceExpressItemResult,
} from '@/lib/vision/referenceExpress/types'
import {
  getReferenceExpressMaxAttempts,
  isReferenceExpressLeaseHeld,
  millisUntilNextAttempt,
  readReferenceExpressWorkerState,
  REFERENCE_EXPRESS_BACKOFF_MS,
  REFERENCE_EXPRESS_MAX_BACKOFF_MS,
  type ReferenceExpressWorkerState,
} from '@/lib/jobs/referenceExpressWorkerState'

export type ReferenceExpressStepOutcome = {
  done: boolean
  error?: string
  /** Index of the item this step acted on. */
  cursor?: number
  /** Another invocation currently holds the lease on this item. */
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
  results: ReferenceExpressItemResult[]
): Promise<ReferenceExpressStepOutcome> {
  const summary = summarizeItemResults(results)

  await updateGenerationJob(jobId, {
    status: 'completed',
    progress: 100,
    result: { ...summary, items: results },
  })

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
 * Run one item of a reference_express job.
 *
 * Strictly one image per invocation. Concurrency here would only shorten
 * wall-clock time, which stopped mattering once the work moved off a blocking
 * overlay — and the Vertex image lane answers bursts with 429s, so a parallel
 * batch spends its speedup on failures. Retries are deferred to a later step
 * rather than slept through in place: one cast item can already consume most of
 * a function's budget, so retrying inside the same isolate risks being killed
 * mid-attempt.
 */
async function runCurrentItem(
  jobId: string,
  userId: string,
  projectId: string,
  payload: Record<string, unknown>,
  worker: ReferenceExpressWorkerState
): Promise<ReferenceExpressStepOutcome> {
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

  const item = items[worker.cursor]!
  await saveWorkerState(jobId, { ...worker, inFlightAt: new Date().toISOString() })

  const advance = async (result: ReferenceExpressItemResult) => {
    const results = [...worker.results, result]
    const nextCursor = worker.cursor + 1
    await updateGenerationJob(jobId, {
      progress: Math.round((nextCursor / items.length) * 100),
    })
    await saveWorkerState(jobId, {
      cursor: nextCursor,
      attempt: 0,
      nextAttemptAt: null,
      results,
      inFlightAt: null,
    })
    if (nextCursor >= items.length) {
      return completeJob(jobId, userId, projectId, results)
    }
    return { done: false, cursor: nextCursor }
  }

  try {
    const result = await runReferenceExpressItem({ userId, projectId, item })
    return await advance(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Reference generation failed'
    const attempt = worker.attempt + 1
    const maxAttempts = getReferenceExpressMaxAttempts()

    if (isRetryableError(err, (err as { status?: number })?.status) && attempt < maxAttempts) {
      const delay = calculateBackoffDelay(
        attempt - 1,
        REFERENCE_EXPRESS_BACKOFF_MS,
        REFERENCE_EXPRESS_MAX_BACKOFF_MS
      )
      console.warn(
        `[ReferenceExpress] ${item.label} attempt ${attempt}/${maxAttempts} failed (${message}); retrying in ${delay}ms`
      )
      await saveWorkerState(jobId, {
        ...worker,
        attempt,
        nextAttemptAt: new Date(Date.now() + delay).toISOString(),
        inFlightAt: null,
      })
      return { done: false, cursor: worker.cursor, retryInMs: delay }
    }

    console.error(`[ReferenceExpress] ${item.label} failed permanently:`, message)
    return await advance({
      kind: item.kind,
      targetId: item.targetId,
      label: item.label,
      status: 'failed',
      error: message,
    })
  }
}

/**
 * Advance a reference_express job by one item. Safe to call repeatedly: a DB
 * lease guards the in-flight item and the cursor only moves once it resolves.
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
      return await runCurrentItem(jobId, userId, projectId, payload, worker)
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
        return await runCurrentItem(
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
    if (!items.length) {
      return failJob(jobId, userId, projectId, 'No references needed generation')
    }

    await saveWorkerState(jobId, {
      cursor: 0,
      attempt: 0,
      nextAttemptAt: null,
      results: [],
      inFlightAt: null,
    })
    return { done: false, cursor: 0 }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Reference generation failed'
    return failJob(jobId, userId, projectId, message)
  }
}
