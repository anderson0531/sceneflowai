import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReferenceExpressItem } from '@/lib/vision/referenceExpress/types'

type Row = {
  id: string
  user_id: string
  project_id: string
  job_type: string
  status: string
  progress: number
  payload: Record<string, unknown>
  result: Record<string, unknown> | null
  error: string | null
}

const ITEMS: ReferenceExpressItem[] = [
  { kind: 'cast', targetId: 'c1', label: 'Mira', sourceFingerprint: 'aaaa' },
  { kind: 'location', targetId: 'l1', label: 'Dockyard', sourceFingerprint: 'bbbb' },
]

let row: Row

vi.mock('@/models', () => ({}))

vi.mock('@/models/GenerationJob', () => ({
  default: {
    findByPk: vi.fn(async () => ({ ...row })),
    update: vi.fn(async (patch: Partial<Row>, options: { where: Record<string, unknown> }) => {
      if (options.where.status && options.where.status !== row.status) return [0]
      Object.assign(row, patch)
      return [1]
    }),
  },
}))

vi.mock('@/lib/jobs/jobService', () => ({
  notifyUser: vi.fn(async () => {}),
  updateGenerationJob: vi.fn(async (_jobId: string, patch: Partial<Row>) => {
    Object.assign(row, patch)
  }),
  patchGenerationJobPayload: vi.fn(
    async (_jobId: string, patch: Record<string, unknown>) => {
      row.payload = { ...row.payload, ...patch }
      return row.payload
    }
  ),
}))

vi.mock('@/lib/vision/referenceExpress/runItem', () => ({
  runReferenceExpressItem: vi.fn(),
}))

import GenerationJob from '@/models/GenerationJob'
import { notifyUser, updateGenerationJob } from '@/lib/jobs/jobService'
import { runReferenceExpressItem } from '@/lib/vision/referenceExpress/runItem'
import { runReferenceExpressStep } from '@/lib/jobs/referenceExpressWorker'
import { readReferenceExpressWorkerState } from '@/lib/jobs/referenceExpressWorkerState'

const mockRunItem = vi.mocked(runReferenceExpressItem)

const worker = () => readReferenceExpressWorkerState(row.payload)

const succeeded = (item: ReferenceExpressItem) =>
  ({
    kind: item.kind,
    targetId: item.targetId,
    label: item.label,
    status: 'succeeded',
    imageUrl: `https://cdn/${item.targetId}.png`,
  }) as const

beforeEach(() => {
  vi.clearAllMocks()
  row = {
    id: 'job-1',
    user_id: 'user-1',
    project_id: 'project-1',
    job_type: 'reference_express',
    status: 'queued',
    progress: 0,
    payload: { items: ITEMS, itemCount: ITEMS.length },
    result: null,
    error: null,
  }
  mockRunItem.mockImplementation(async ({ item }) => succeeded(item))
})

describe('runReferenceExpressStep', () => {
  it('claims a queued job and seeds the cursor without generating anything', async () => {
    const outcome = await runReferenceExpressStep('job-1')

    expect(outcome).toEqual({ done: false, cursor: 0 })
    expect(row.status).toBe('processing')
    expect(mockRunItem).not.toHaveBeenCalled()
    expect(worker()).toMatchObject({ cursor: 0, attempt: 0, results: [] })
  })

  it('abandons a processing job whose worker state was lost', async () => {
    row.status = 'processing'

    expect(await runReferenceExpressStep('job-1')).toEqual({
      done: true,
      error: 'Reference worker state missing — cancel and start a new batch',
    })
    expect(mockRunItem).not.toHaveBeenCalled()
  })

  it('does not re-initialize a job another caller claimed first', async () => {
    // The claim is a conditional update, so the loser sees zero rows changed
    // while the winner has already moved the job on.
    vi.mocked(GenerationJob.update).mockImplementationOnce(async () => {
      row.status = 'processing'
      row.payload = {
        ...row.payload,
        _worker: {
          cursor: 1,
          attempt: 0,
          nextAttemptAt: null,
          results: [succeeded(ITEMS[0]!)],
          inFlightAt: null,
        },
      }
      return [0] as never
    })

    expect(await runReferenceExpressStep('job-1')).toEqual({ done: true })
    // Picks up where the winner left off rather than restarting from zero.
    expect(mockRunItem).toHaveBeenCalledOnce()
    expect(mockRunItem.mock.calls[0]![0]!.item.targetId).toBe('l1')
    expect(row.result).toMatchObject({ total: 2, succeeded: 2 })
  })

  it('waits instead of restarting when the winner has not written state yet', async () => {
    vi.mocked(GenerationJob.update).mockResolvedValueOnce([0] as never)

    expect(await runReferenceExpressStep('job-1')).toEqual({ done: false, inFlight: true })
    expect(mockRunItem).not.toHaveBeenCalled()
  })

  it('generates exactly one image per step and walks the cursor to completion', async () => {
    await runReferenceExpressStep('job-1')

    expect(await runReferenceExpressStep('job-1')).toEqual({ done: false, cursor: 1 })
    expect(mockRunItem).toHaveBeenCalledTimes(1)
    expect(mockRunItem.mock.calls[0]![0]!.item.targetId).toBe('c1')

    expect(await runReferenceExpressStep('job-1')).toEqual({ done: true })
    expect(mockRunItem).toHaveBeenCalledTimes(2)
    expect(mockRunItem.mock.calls[1]![0]!.item.targetId).toBe('l1')

    expect(row.status).toBe('completed')
    expect(row.result).toMatchObject({ total: 2, succeeded: 2, failed: 0, staleCount: 0 })
    expect(notifyUser).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'job_completed' })
    )
  })

  it('holds the cursor and backs off when an item hits a rate limit', async () => {
    await runReferenceExpressStep('job-1')

    mockRunItem.mockRejectedValueOnce(Object.assign(new Error('rate limited'), { status: 429 }))
    const deferred = await runReferenceExpressStep('job-1')

    expect(deferred.cursor).toBe(0)
    expect(deferred.done).toBe(false)
    expect(deferred.retryInMs).toBeGreaterThan(0)

    // The item is still pending, so no result was recorded for it.
    expect(worker()).toMatchObject({ cursor: 0, attempt: 1, results: [] })
    expect(worker()?.nextAttemptAt).toBeTruthy()
  })

  it('refuses to start the retry before the backoff window elapses', async () => {
    await runReferenceExpressStep('job-1')
    mockRunItem.mockRejectedValueOnce(Object.assign(new Error('429'), { status: 429 }))
    await runReferenceExpressStep('job-1')

    const blocked = await runReferenceExpressStep('job-1')
    expect(blocked.retryInMs).toBeGreaterThan(0)
    expect(mockRunItem).toHaveBeenCalledTimes(1)
  })

  it('succeeds on the retry once the window passes, leaving no failure behind', async () => {
    await runReferenceExpressStep('job-1')
    mockRunItem.mockRejectedValueOnce(Object.assign(new Error('429'), { status: 429 }))
    await runReferenceExpressStep('job-1')

    row.payload = {
      ...row.payload,
      _worker: { ...worker(), nextAttemptAt: new Date(Date.now() - 1).toISOString() },
    }

    expect(await runReferenceExpressStep('job-1')).toEqual({ done: false, cursor: 1 })
    expect(worker()).toMatchObject({ cursor: 1, attempt: 0, nextAttemptAt: null })
    expect(worker()?.results).toEqual([
      expect.objectContaining({ targetId: 'c1', status: 'succeeded' }),
    ])
  })

  it('records a non-retryable failure and moves on instead of stalling the batch', async () => {
    await runReferenceExpressStep('job-1')

    mockRunItem.mockRejectedValueOnce(new Error('Prompt blocked by safety filters'))
    expect(await runReferenceExpressStep('job-1')).toEqual({ done: false, cursor: 1 })

    expect(worker()?.results).toEqual([
      expect.objectContaining({
        targetId: 'c1',
        status: 'failed',
        error: 'Prompt blocked by safety filters',
      }),
    ])
    expect(row.status).toBe('processing')
  })

  it('gives up on an item after the attempt budget and finishes the run', async () => {
    await runReferenceExpressStep('job-1')

    const rateLimited = () => Object.assign(new Error('429'), { status: 429 })
    const clearBackoff = () => {
      row.payload = { ...row.payload, _worker: { ...worker(), nextAttemptAt: null } }
    }

    for (let attempt = 0; attempt < 3; attempt++) {
      mockRunItem.mockRejectedValueOnce(rateLimited())
      await runReferenceExpressStep('job-1')
      clearBackoff()
    }

    expect(mockRunItem).toHaveBeenCalledTimes(3)
    expect(worker()).toMatchObject({ cursor: 1, attempt: 0 })
    expect(worker()?.results).toEqual([
      expect.objectContaining({ targetId: 'c1', status: 'failed' }),
    ])

    expect(await runReferenceExpressStep('job-1')).toEqual({ done: true })
    expect(row.result).toMatchObject({ total: 2, succeeded: 1, failed: 1 })
  })

  it('yields to a live lease so two callers never generate the same image', async () => {
    await runReferenceExpressStep('job-1')
    row.payload = {
      ...row.payload,
      _worker: { ...worker(), inFlightAt: new Date().toISOString() },
    }

    expect(await runReferenceExpressStep('job-1')).toEqual({
      done: false,
      cursor: 0,
      inFlight: true,
    })
    expect(mockRunItem).not.toHaveBeenCalled()
  })

  it('reclaims an item whose lease expired mid-run', async () => {
    await runReferenceExpressStep('job-1')
    row.payload = {
      ...row.payload,
      _worker: {
        ...worker(),
        inFlightAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      },
    }

    expect(await runReferenceExpressStep('job-1')).toEqual({ done: false, cursor: 1 })
    expect(mockRunItem).toHaveBeenCalledOnce()
  })

  it('carries staleSource through to the run summary', async () => {
    await runReferenceExpressStep('job-1')
    mockRunItem.mockImplementation(async ({ item }) => ({
      ...succeeded(item),
      staleSource: true,
    }))

    await runReferenceExpressStep('job-1')
    await runReferenceExpressStep('job-1')

    expect(row.result).toMatchObject({ total: 2, succeeded: 2, staleCount: 2 })
    expect(notifyUser).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('changed while the batch ran'),
      })
    )
  })

  it('is a no-op once the job is terminal', async () => {
    row.status = 'cancelled'

    expect(await runReferenceExpressStep('job-1')).toEqual({ done: true })
    expect(updateGenerationJob).not.toHaveBeenCalled()
  })

  it('fails a claimed job that has no items to work through', async () => {
    row.payload = { items: [] }

    const outcome = await runReferenceExpressStep('job-1')
    expect(outcome.done).toBe(true)
    expect(outcome.error).toBe('No references needed generation')
    expect(row.status).toBe('failed')
  })

  it('ignores jobs of another type', async () => {
    row.job_type = 'script_analysis'

    expect(await runReferenceExpressStep('job-1')).toEqual({
      done: true,
      error: 'Job not found',
    })
    expect(GenerationJob.update).not.toHaveBeenCalled()
  })
})
