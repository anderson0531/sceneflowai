import {
  notifyUser,
  updateGenerationJob,
} from '@/lib/jobs/jobService'
import {
  finalizeGuidedRevise,
  payloadFromJobRecord,
  runAllSectionRewrites,
  runPlannerStep,
  runSectionRewriteStep,
} from '@/lib/treatment/runGuidedRevise'
import type { BlueprintFixSection } from '@/lib/types/audienceResonance'

/**
 * Run a blueprint_guided_revise job inline (fallback when Inngest dispatch is unavailable).
 * Inngest remains preferred — each section gets its own durable step there.
 */
export async function executeBlueprintGuidedReviseJob(input: {
  jobId: string
  userId: string
  projectId: string
  payload: Record<string, unknown>
}): Promise<void> {
  const { jobId, userId, projectId, payload: storedPayload } = input

  try {
    await updateGenerationJob(jobId, { status: 'processing', progress: 5 })
    const revisePayload = payloadFromJobRecord(storedPayload)

    const plan = await runPlannerStep(revisePayload)
    await updateGenerationJob(jobId, { progress: 15 })

    const sections = [...new Set(plan.sectionsToUpdate)]
    let mergedPatch: Record<string, unknown> = {}

    if (sections.length <= 1) {
      await updateGenerationJob(jobId, { progress: 50 })
      mergedPatch = await runAllSectionRewrites(revisePayload, plan)
    } else {
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i] as BlueprintFixSection
        const isLast = i === sections.length - 1
        const progress = 15 + Math.round(((i + 1) / sections.length) * 70)
        await updateGenerationJob(jobId, { progress })
        const sectionPatch = await runSectionRewriteStep(
          revisePayload,
          plan,
          section,
          mergedPatch,
          isLast
        )
        const { narrative_reasoning: nr, ...fieldPatch } = sectionPatch
        mergedPatch = { ...mergedPatch, ...fieldPatch }
        if (nr && typeof nr === 'object') {
          mergedPatch.narrative_reasoning = nr
        }
      }
    }

    await updateGenerationJob(jobId, { progress: 92 })
    const finalized = finalizeGuidedRevise(revisePayload, plan, mergedPatch)
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
      metadata: { kind: 'blueprint_guided_revise', dispatch: 'inline_fallback' },
    })
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
      metadata: { kind: 'blueprint_guided_revise', dispatch: 'inline_fallback' },
    })
    throw err
  }
}
