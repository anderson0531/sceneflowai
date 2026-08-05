import '@/models'
import GenerationJob from '@/models/GenerationJob'
import {
  notifyUser,
  patchGenerationJobPayload,
  updateGenerationJob,
} from '@/lib/jobs/jobService'
import {
  isStepLeaseHeld,
  readWorkerState,
  type BlueprintGuidedReviseWorkerState,
} from '@/lib/jobs/blueprintGuidedReviseWorkerState'
import {
  finalizeGuidedRevise,
  payloadFromJobRecord,
  runAllSectionRewrites,
  runPlannerStep,
  runSectionRewriteStep,
} from '@/lib/treatment/runGuidedRevise'
import type { BlueprintFixSection } from '@/lib/types/audienceResonance'

export type BlueprintGuidedReviseStepOutcome = {
  done: boolean
  error?: string
  phase?: string
  /** Another invocation currently holds the lease on this phase. */
  inFlight?: boolean
}

async function saveWorkerState(
  jobId: string,
  worker: BlueprintGuidedReviseWorkerState
): Promise<void> {
  await patchGenerationJobPayload(jobId, { _worker: worker })
}

async function runProcessingPhase(
  jobId: string,
  userId: string,
  projectId: string,
  payload: Record<string, unknown>,
  worker: BlueprintGuidedReviseWorkerState
): Promise<BlueprintGuidedReviseStepOutcome> {
  if (isStepLeaseHeld(worker)) {
    return { done: false, phase: worker.phase, inFlight: true }
  }

  await saveWorkerState(jobId, { ...worker, inFlightAt: new Date().toISOString() })

  try {
    const revisePayload = payloadFromJobRecord(payload)

    if (worker.phase === 'rewrite-all') {
      await updateGenerationJob(jobId, { progress: 50 })
      const mergedPatch = await runAllSectionRewrites(revisePayload, worker.plan)
      await saveWorkerState(jobId, {
        ...worker,
        phase: 'finalize',
        mergedPatch,
        inFlightAt: null,
      })
      return { done: false, phase: 'finalize' }
    }

    if (worker.phase === 'rewrite') {
      const sections = worker.sections
      const index = worker.sectionIndex ?? 0
      const section = sections[index]
      if (!section) {
        throw new Error(`Invalid section index ${index}`)
      }

      const isLast = index === sections.length - 1
      const progress = 15 + Math.round(((index + 1) / sections.length) * 70)
      await updateGenerationJob(jobId, { progress })

      const sectionPatch = await runSectionRewriteStep(
        revisePayload,
        worker.plan,
        section,
        worker.mergedPatch ?? {},
        isLast
      )

      const { narrative_reasoning: nr, ...fieldPatch } = sectionPatch
      const mergedPatch: Record<string, unknown> = {
        ...(worker.mergedPatch ?? {}),
        ...fieldPatch,
      }
      if (nr && typeof nr === 'object') {
        mergedPatch.narrative_reasoning = nr
      }

      const hasMoreSections = index + 1 < sections.length
      await saveWorkerState(jobId, {
        ...worker,
        phase: hasMoreSections ? 'rewrite' : 'finalize',
        sectionIndex: hasMoreSections ? index + 1 : index,
        mergedPatch,
        inFlightAt: null,
      })
      return { done: false, phase: hasMoreSections ? 'rewrite' : 'finalize' }
    }

    if (worker.phase === 'finalize') {
      await updateGenerationJob(jobId, { progress: 92 })
      const finalized = finalizeGuidedRevise(
        revisePayload,
        worker.plan,
        worker.mergedPatch ?? {}
      )
      const result = {
        patch: finalized.patch,
        diff: finalized.diff,
        changePlan: finalized.changePlan,
        narrativeReasoning: finalized.narrativeReasoning,
        incompleteBalance: finalized.incompleteBalance,
      }

      await updateGenerationJob(jobId, {
        status: 'completed',
        progress: 100,
        result,
      })
      await notifyUser({
        userId,
        projectId,
        jobId,
        type: 'job_completed',
        title: 'Blueprint revision ready',
        message: 'Your balanced blueprint edit is ready to review.',
        metadata: { kind: 'blueprint_guided_revise', dispatch: 'step_worker' },
      })
      return { done: true, phase: 'completed' }
    }

    return { done: true, error: `Unknown worker phase: ${String(worker.phase)}` }
  } catch (err) {
    await saveWorkerState(jobId, { ...worker, inFlightAt: null }).catch(() => {})
    throw err
  }
}

/**
 * Run exactly one planner / rewrite / finalize phase for a blueprint_guided_revise job.
 * Safe to call repeatedly and concurrently: a DB lease guards each phase.
 */
export async function runBlueprintGuidedReviseStep(
  jobId: string
): Promise<BlueprintGuidedReviseStepOutcome> {
  const job = await GenerationJob.findByPk(jobId)
  if (!job || job.job_type !== 'blueprint_guided_revise') {
    return { done: true, error: 'Job not found' }
  }

  if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
    return { done: true, phase: job.status }
  }

  const userId = job.user_id
  const projectId = job.project_id
  const payload = (job.payload ?? {}) as Record<string, unknown>
  const worker = readWorkerState(payload)

  try {
    if (job.status === 'processing') {
      if (!worker) {
        return {
          done: true,
          error: 'Revision worker state missing — cancel and start a new revision',
        }
      }
      return await runProcessingPhase(jobId, userId, projectId, payload, worker)
    }

    if (job.status !== 'queued') {
      return { done: true, error: `Unexpected job status: ${job.status}` }
    }

    // Planner runs only while queued. The conditional update is the claim, so
    // concurrent callers cannot plan the same job twice.
    const [claimed] = await GenerationJob.update(
      { status: 'processing', progress: 5 },
      { where: { id: jobId, status: 'queued' } }
    )

    if (claimed === 0) {
      const retry = await GenerationJob.findByPk(jobId)
      const retryWorker = retry ? readWorkerState((retry.payload ?? {}) as Record<string, unknown>) : null
      if (retry?.status === 'processing' && retryWorker) {
        return await runProcessingPhase(
          jobId,
          userId,
          projectId,
          (retry.payload ?? {}) as Record<string, unknown>,
          retryWorker
        )
      }
      return { done: false, phase: 'claim_pending', inFlight: true }
    }

    const revisePayload = payloadFromJobRecord(payload)
    const plan = await runPlannerStep(revisePayload)
    const sections = [...new Set(plan.sectionsToUpdate)] as BlueprintFixSection[]

    const nextWorker: BlueprintGuidedReviseWorkerState = {
      phase: sections.length <= 1 ? 'rewrite-all' : 'rewrite',
      plan,
      sections,
      sectionIndex: 0,
      mergedPatch: {},
      inFlightAt: null,
    }

    await saveWorkerState(jobId, nextWorker)
    await updateGenerationJob(jobId, { progress: 15 })
    return { done: false, phase: nextWorker.phase }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Blueprint revision failed'
    await updateGenerationJob(jobId, { status: 'failed', error: message })
    await notifyUser({
      userId,
      projectId,
      jobId,
      type: 'job_failed',
      title: 'Blueprint revision failed',
      message,
      metadata: { kind: 'blueprint_guided_revise', dispatch: 'step_worker' },
    })
    return { done: true, error: message }
  }
}
