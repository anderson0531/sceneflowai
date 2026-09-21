import '@/models'
import GenerationJob from '@/models/GenerationJob'
import {
  notifyUser,
  patchGenerationJobPayload,
  updateGenerationJob,
} from '@/lib/jobs/jobService'
import {
  isPolishStepLeaseHeld,
  readPolishWorkerState,
  type ScenePolishWorkerState,
} from '@/lib/jobs/scenePolishWorkerState'
import { localeDirective } from '@/lib/prompts/localeDirective'
import { analyzeScenePolish } from '@/lib/script/scenePolish/analyzeScenePolish'
import { persistPolishAnalysis } from '@/lib/script/scenePolish/persistPolishAnalysis'
import {
  POLISH_PROGRESS_ANALYZING,
  POLISH_PROGRESS_DONE,
  POLISH_PROGRESS_PERSISTING,
  POLISH_PROGRESS_QUEUED,
  polishActivityLabel,
} from '@/lib/script/scenePolish/enqueueScenePolish'
import type { PolishSceneInput, ScenePolishAnalysis } from '@/lib/script/scenePolish/types'

export type ScenePolishStepOutcome = {
  done: boolean
  error?: string
  phase?: string
  inFlight?: boolean
}

async function saveWorkerState(jobId: string, worker: ScenePolishWorkerState): Promise<void> {
  await patchGenerationJobPayload(jobId, { _worker: worker })
}

async function failJob(
  jobId: string,
  userId: string,
  projectId: string,
  message: string
): Promise<ScenePolishStepOutcome> {
  await updateGenerationJob(jobId, { status: 'failed', error: message })
  await notifyUser({
    userId,
    projectId,
    jobId,
    type: 'job_failed',
    title: 'Polish failed',
    message,
    metadata: { kind: 'scene_polish', dispatch: 'step_worker' },
  })
  return { done: true, error: message }
}

function asPolishScene(value: unknown): PolishSceneInput | null {
  if (!value || typeof value !== 'object') return null
  return value as PolishSceneInput
}

async function completePolish(input: {
  jobId: string
  userId: string
  projectId: string
  sceneIndex: number
  sceneId?: string
  beatCount: number
  analysis: ScenePolishAnalysis
}): Promise<ScenePolishStepOutcome> {
  await updateGenerationJob(input.jobId, { progress: POLISH_PROGRESS_PERSISTING })
  await patchGenerationJobPayload(input.jobId, {
    activity: polishActivityLabel(input.beatCount, 'saving'),
  })

  const persisted = await persistPolishAnalysis({
    projectId: input.projectId,
    sceneIndex: input.sceneIndex,
    sceneId: input.sceneId,
    analysis: input.analysis,
  })
  if (!persisted.saved) {
    return failJob(input.jobId, input.userId, input.projectId, 'Could not save polish analysis')
  }

  const analysis = { ...input.analysis, stale: persisted.stale }
  await updateGenerationJob(input.jobId, {
    status: 'completed',
    progress: POLISH_PROGRESS_DONE,
    result: {
      sceneIndex: persisted.sceneIndex,
      issueCount: analysis.issueCount,
      notes: analysis.notes,
      stale: persisted.stale,
      polishAnalysis: analysis,
    },
  })

  const issueCount = analysis.issueCount
  await notifyUser({
    userId: input.userId,
    projectId: input.projectId,
    jobId: input.jobId,
    type: 'job_completed',
    title: 'Polish ready',
    message: persisted.stale
      ? 'Beats changed while Polish ran — re-run to refresh recommendations.'
      : issueCount === 0
        ? 'Beat sequence looks aligned.'
        : issueCount === 1
          ? 'Polish found 1 beat issue.'
          : `Polish found ${issueCount} beat issues.`,
    metadata: {
      kind: 'scene_polish',
      sceneIndex: persisted.sceneIndex,
      issueCount,
      stale: persisted.stale,
      dispatch: 'step_worker',
    },
  })

  return { done: true, phase: 'completed' }
}

async function runAnalyzeAndPersist(
  jobId: string,
  userId: string,
  projectId: string,
  payload: Record<string, unknown>,
  worker: ScenePolishWorkerState
): Promise<ScenePolishStepOutcome> {
  if (isPolishStepLeaseHeld(worker)) {
    return { done: false, phase: worker.phase, inFlight: true }
  }

  const leased: ScenePolishWorkerState = {
    ...worker,
    inFlightAt: new Date().toISOString(),
  }
  await saveWorkerState(jobId, leased)

  const sceneIndex = Number(payload.sceneIndex)
  const beatCount = Number(payload.beatCount) || 0
  const sceneId = typeof payload.sceneId === 'string' ? payload.sceneId : undefined
  const scene = asPolishScene(payload.scene)

  try {
    if (!scene || !Number.isInteger(sceneIndex) || sceneIndex < 0) {
      return failJob(jobId, userId, projectId, 'Polish job is missing its scene')
    }

    let analysis = leased.analysis
    if (!analysis) {
      await updateGenerationJob(jobId, { progress: POLISH_PROGRESS_ANALYZING })
      await patchGenerationJobPayload(jobId, {
        activity: polishActivityLabel(beatCount, 'analyzing'),
      })

      const { resolveStoryLocale } = await import('@/i18n/server/storyLocale')
      const { storyLocale, properNouns } = await resolveStoryLocale({
        projectId,
        userIdOrEmail: userId,
      })
      const languageBlock = localeDirective(storyLocale, {
        properNouns,
        note: 'The JSON keys, "priority" values, "category" values, and beatIndices stay exactly as specified.',
      })

      analysis = await analyzeScenePolish({
        scene,
        previousScene: asPolishScene(payload.previousScene),
        nextScene: asPolishScene(payload.nextScene),
        languageBlock,
        logContext: { projectId, sceneIndex },
      })
      await saveWorkerState(jobId, { phase: 'persist', analysis, inFlightAt: new Date().toISOString() })
    }

    const outcome = await completePolish({
      jobId,
      userId,
      projectId,
      sceneIndex,
      sceneId,
      beatCount,
      analysis,
    })
    await saveWorkerState(jobId, { phase: 'persist', analysis, inFlightAt: null }).catch(() => {})
    return outcome
  } catch (err) {
    await saveWorkerState(jobId, { ...leased, inFlightAt: null }).catch(() => {})
    const message = err instanceof Error ? err.message : 'Failed to polish scene'
    return failJob(jobId, userId, projectId, message)
  }
}

/**
 * Run the Scene Polish job. One Gemini pass plus persist; lease-guarded so
 * overlapping client ticks and the internal after() hop cannot double-call.
 */
export async function runScenePolishStep(jobId: string): Promise<ScenePolishStepOutcome> {
  const job = await GenerationJob.findByPk(jobId)
  if (!job || job.job_type !== 'scene_polish') {
    return { done: true, error: 'Job not found' }
  }

  if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
    return { done: true, phase: job.status }
  }

  const userId = job.user_id
  const projectId = job.project_id
  const payload = (job.payload ?? {}) as Record<string, unknown>
  const worker = readPolishWorkerState(payload) ?? { phase: 'analyze', inFlightAt: null }

  try {
    if (job.status === 'processing') {
      return await runAnalyzeAndPersist(jobId, userId, projectId, payload, worker)
    }

    if (job.status !== 'queued') {
      return { done: true, error: `Unexpected job status: ${job.status}` }
    }

    const [claimed] = await GenerationJob.update(
      { status: 'processing', progress: POLISH_PROGRESS_QUEUED },
      { where: { id: jobId, status: 'queued' } }
    )

    if (claimed === 0) {
      const retry = await GenerationJob.findByPk(jobId)
      if (retry?.status === 'processing') {
        return await runAnalyzeAndPersist(
          jobId,
          userId,
          projectId,
          (retry.payload ?? {}) as Record<string, unknown>,
          readPolishWorkerState((retry.payload ?? {}) as Record<string, unknown>) ?? {
            phase: 'analyze',
            inFlightAt: null,
          }
        )
      }
      return { done: false, phase: 'claim_pending', inFlight: true }
    }

    return await runAnalyzeAndPersist(jobId, userId, projectId, payload, {
      phase: 'analyze',
      inFlightAt: null,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to polish scene'
    return failJob(jobId, userId, projectId, message)
  }
}
