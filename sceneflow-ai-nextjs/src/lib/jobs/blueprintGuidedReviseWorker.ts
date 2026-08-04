import '@/models'
import GenerationJob from '@/models/GenerationJob'
import {
  notifyUser,
  patchGenerationJobPayload,
  updateGenerationJob,
} from '@/lib/jobs/jobService'
import {
  readWorkerState,
  writeWorkerState,
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
}

/**
 * Run exactly one planner / rewrite / finalize phase for a blueprint_guided_revise job.
 * Caller chains the next step via scheduleBlueprintGuidedReviseStep().
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
  const storedPayload = (job.payload ?? {}) as Record<string, unknown>
  const worker = readWorkerState(storedPayload)

  try {
    if (job.status === 'queued' || !worker) {
      await updateGenerationJob(jobId, { status: 'processing', progress: 5 })
      const revisePayload = payloadFromJobRecord(storedPayload)
      const plan = await runPlannerStep(revisePayload)
      const sections = [...new Set(plan.sectionsToUpdate)] as BlueprintFixSection[]

      const nextWorker: BlueprintGuidedReviseWorkerState = {
        phase: sections.length <= 1 ? 'rewrite-all' : 'rewrite',
        plan,
        sections,
        sectionIndex: 0,
        mergedPatch: {},
      }

      await patchGenerationJobPayload(jobId, writeWorkerState(storedPayload, nextWorker))
      await updateGenerationJob(jobId, { progress: 15 })
      return { done: false, phase: nextWorker.phase }
    }

    const freshJob = await GenerationJob.findByPk(jobId)
    if (!freshJob) return { done: true, error: 'Job not found' }
    const payload = (freshJob.payload ?? {}) as Record<string, unknown>
    const state = readWorkerState(payload)
    if (!state) {
      return { done: true, error: 'Worker state missing' }
    }

    const revisePayload = payloadFromJobRecord(payload)

    if (state.phase === 'rewrite-all') {
      await updateGenerationJob(jobId, { progress: 50 })
      const mergedPatch = await runAllSectionRewrites(revisePayload, state.plan)
      await patchGenerationJobPayload(
        jobId,
        writeWorkerState(payload, {
          ...state,
          phase: 'finalize',
          mergedPatch,
        })
      )
      return { done: false, phase: 'finalize' }
    }

    if (state.phase === 'rewrite') {
      const sections = state.sections
      const index = state.sectionIndex ?? 0
      const section = sections[index]
      if (!section) {
        throw new Error(`Invalid section index ${index}`)
      }

      const isLast = index === sections.length - 1
      const progress = 15 + Math.round(((index + 1) / sections.length) * 70)
      await updateGenerationJob(jobId, { progress })

      const sectionPatch = await runSectionRewriteStep(
        revisePayload,
        state.plan,
        section,
        state.mergedPatch ?? {},
        isLast
      )

      const { narrative_reasoning: nr, ...fieldPatch } = sectionPatch
      const mergedPatch: Record<string, unknown> = {
        ...(state.mergedPatch ?? {}),
        ...fieldPatch,
      }
      if (nr && typeof nr === 'object') {
        mergedPatch.narrative_reasoning = nr
      }

      if (index + 1 < sections.length) {
        await patchGenerationJobPayload(
          jobId,
          writeWorkerState(payload, {
            ...state,
            sectionIndex: index + 1,
            mergedPatch,
          })
        )
        return { done: false, phase: 'rewrite' }
      }

      await patchGenerationJobPayload(
        jobId,
        writeWorkerState(payload, {
          ...state,
          phase: 'finalize',
          mergedPatch,
        })
      )
      return { done: false, phase: 'finalize' }
    }

    if (state.phase === 'finalize') {
      await updateGenerationJob(jobId, { progress: 92 })
      const finalized = finalizeGuidedRevise(
        revisePayload,
        state.plan,
        state.mergedPatch ?? {}
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

    return { done: true, error: `Unknown worker phase: ${String(state.phase)}` }
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
