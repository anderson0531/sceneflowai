import { scheduleBlueprintGuidedReviseStep } from '@/lib/jobs/dispatchBlueprintGuidedReviseStep'

/**
 * Kick off blueprint_guided_revise when Inngest is unavailable.
 * Work runs one step per internal HTTP invocation (fresh memory per LLM call).
 */
export async function executeBlueprintGuidedReviseJob(input: {
  jobId: string
  userId: string
  projectId: string
  payload: Record<string, unknown>
}): Promise<void> {
  void input
  scheduleBlueprintGuidedReviseStep(input.jobId)
}
