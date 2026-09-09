import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BlueprintChangePlan } from '@/lib/treatment/blueprintRevisionTypes'

const samplePlan: BlueprintChangePlan = {
  primaryGoal: 'Balance story and beats',
  sectionsToUpdate: ['story', 'beats'],
  crossSectionDependencies: [],
  preserveConstraints: [],
  coherenceActions: [],
}

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

const row: Row = {
  id: 'job-1',
  user_id: 'user-1',
  project_id: 'project-1',
  job_type: 'blueprint_guided_revise',
  status: 'queued',
  progress: 0,
  payload: { rawVariant: { title: 'Test' }, userIntent: 'Tighten act two' },
  result: null,
  error: null,
}

vi.mock('@/models', () => ({}))

vi.mock('@/models/GenerationJob', () => ({
  default: {
    findByPk: vi.fn(async () => ({ ...row })),
    update: vi.fn(async (patch: Partial<Row>, options: { where: Record<string, unknown> }) => {
      const where = options.where
      if (where.status && where.status !== row.status) return [0]
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
  patchGenerationJobPayload: vi.fn(async (_jobId: string, patch: Record<string, unknown>) => {
    row.payload = { ...row.payload, ...patch }
    return row.payload
  }),
}))

class FakeTruncatedError extends Error {
  constructor(
    readonly section: string,
    readonly finishReason: string
  ) {
    super(`${section} was cut off (${finishReason})`)
    this.name = 'GuidedReviseTruncatedError'
  }
}

const runConsolidatedRewrite = vi.fn(async () => ({ story_field: 'rewritten' }))

vi.mock('@/lib/treatment/runGuidedRevise', () => ({
  payloadFromJobRecord: vi.fn(() => ({
    rawVariant: { title: 'Test' },
    preservedCharacterAssets: {},
    variant: { title: 'Test' },
    intentText: 'Tighten act two',
    selectedRecs: [],
    focusScope: 'all',
    contentIntent: 'narrative',
  })),
  GuidedReviseTruncatedError: FakeTruncatedError,
  runPlannerStep: vi.fn(async () => samplePlan),
  runSectionRewriteStep: vi.fn(async (_p, _plan, section: string) => ({
    [`${section}_field`]: 'rewritten',
  })),
  runConsolidatedRewrite,
  finalizeGuidedRevise: vi.fn(() => ({
    patch: { story_field: 'rewritten' },
    diff: [],
    changePlan: samplePlan,
    narrativeReasoning: undefined,
    incompleteBalance: false,
  })),
}))

const { runBlueprintGuidedReviseStep } = await import('@/lib/jobs/blueprintGuidedReviseWorker')

async function drainPhases(limit = 8): Promise<string[]> {
  const phases: string[] = []
  for (let i = 0; i < limit; i++) {
    const outcome = await runBlueprintGuidedReviseStep('job-1')
    phases.push(outcome.phase ?? outcome.error ?? 'unknown')
    if (outcome.done) break
  }
  return phases
}

describe('runBlueprintGuidedReviseStep', () => {
  beforeEach(() => {
    row.status = 'queued'
    row.progress = 0
    row.payload = { rawVariant: { title: 'Test' }, userIntent: 'Tighten act two' }
    row.result = null
    row.error = null
    runConsolidatedRewrite.mockClear()
    runConsolidatedRewrite.mockImplementation(async () => ({ story_field: 'rewritten' }))
  })

  it('advances plan -> one consolidated rewrite -> finalize without repeating a phase', async () => {
    const phases = await drainPhases()

    // A two-section plan used to mean two rewrite hops. It is one pass now.
    expect(phases).toEqual(['rewrite-all', 'finalize', 'completed'])
    expect(runConsolidatedRewrite).toHaveBeenCalledTimes(1)
    expect(row.status).toBe('completed')
    expect(row.progress).toBe(100)
  })

  it('falls back to per-section rewrites when the consolidated pass is cut off', async () => {
    runConsolidatedRewrite.mockImplementation(async () => {
      throw new FakeTruncatedError('balanced revision', 'MAX_TOKENS')
    })

    const phases = await drainPhases()

    // Truncation must degrade to the narrower passes, not fail the job.
    expect(phases).toEqual(['rewrite-all', 'rewrite', 'rewrite', 'finalize', 'completed'])
    expect(row.status).toBe('completed')
    expect(row.error).toBeNull()
  })

  it('surfaces non-truncation rewrite failures instead of retrying per section', async () => {
    runConsolidatedRewrite.mockImplementation(async () => {
      throw new Error('Vertex AI quota exhausted')
    })

    await runBlueprintGuidedReviseStep('job-1')
    const outcome = await runBlueprintGuidedReviseStep('job-1')

    expect(outcome.phase).toBeUndefined()
    expect(row.status).toBe('failed')
    expect(row.error).toContain('quota exhausted')
  })

  it('reports inFlight instead of re-running a leased phase', async () => {
    await runBlueprintGuidedReviseStep('job-1')

    const worker = row.payload._worker as Record<string, unknown>
    row.payload = {
      ...row.payload,
      _worker: { ...worker, inFlightAt: new Date().toISOString() },
    }

    const outcome = await runBlueprintGuidedReviseStep('job-1')
    expect(outcome.inFlight).toBe(true)
    expect(outcome.done).toBe(false)
  })
})
