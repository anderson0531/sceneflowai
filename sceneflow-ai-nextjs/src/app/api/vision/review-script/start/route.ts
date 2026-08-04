import { NextRequest, NextResponse } from 'next/server'
import '@/models'
import { createGenerationJob, findActiveJob } from '@/lib/jobs/jobService'
import { getSessionUserId } from '@/lib/auth/sessionUser'
import { CreditService } from '@/services/CreditService'
import { BLUEPRINT_CREDITS } from '@/lib/credits/creditCosts'
import { loadScriptForAnalysis } from '@/lib/script/audienceResonance/persistReview'
import { planSceneChunks, DEFAULT_SCENE_CHUNK_SIZE } from '@/lib/script/audienceResonance/chunkPlan'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const AUDIENCE_RESONANCE_CREDIT_COST = BLUEPRINT_CREDITS.AUDIENCE_RESONANCE_ANALYSIS

/** Rough wall-clock estimate so the UI can tell the user what to expect. */
function estimateSeconds(chunkCount: number): number {
  const PER_CHUNK_SECONDS = 40
  const SYNTHESIS_SECONDS = 45
  return chunkCount * PER_CHUNK_SECONDS + SYNTHESIS_SECONDS
}

/**
 * Queues a full-script Audience Resonance analysis and returns immediately.
 *
 * Analysis of every scene exceeds a single function's budget on long scripts,
 * so the work runs as a durable Inngest job. The client is handed a jobId to
 * poll and receives a notification on completion.
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { projectId, targetDemographic, chunkSize } = body as {
      projectId?: string
      targetDemographic?: string
      chunkSize?: number
    }

    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 })
    }

    // One analysis per project at a time — concurrent runs would race on the
    // same review metadata and double-charge credits.
    const existing = await findActiveJob({ userId, projectId, jobType: 'script_analysis' })
    if (existing) {
      return NextResponse.json(
        {
          jobId: existing.id,
          status: existing.status,
          progress: existing.progress,
          alreadyRunning: true,
        },
        { status: 200 }
      )
    }

    const context = await loadScriptForAnalysis(projectId)
    if (!context) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    const sceneCount = context.script.scenes?.length || 0
    if (!sceneCount) {
      return NextResponse.json({ error: 'Script has no scenes to analyze' }, { status: 400 })
    }

    const hasCredits = await CreditService.ensureCredits(userId, AUDIENCE_RESONANCE_CREDIT_COST)
    if (!hasCredits) {
      return NextResponse.json(
        {
          error: 'Insufficient credits for Audience Resonance analysis',
          required: AUDIENCE_RESONANCE_CREDIT_COST,
          operation: 'audience_resonance_analysis',
        },
        { status: 402 }
      )
    }

    const chunks = planSceneChunks(sceneCount, chunkSize ?? DEFAULT_SCENE_CHUNK_SIZE)

    const { job } = await createGenerationJob({
      userId,
      projectId,
      jobType: 'script_analysis',
      payload: {
        targetDemographic: targetDemographic ?? context.targetDemographic,
        // Recorded at enqueue time so a late-finishing job can tell whether the
        // script moved underneath it.
        baseScriptUpdatedAt: context.scriptUpdatedAt,
        sceneCount,
        chunkCount: chunks.length,
        ...(chunkSize ? { chunkSize } : {}),
      },
    })

    // Charged at enqueue: the work is committed once the job is queued, and the
    // request that would have charged on completion has already returned.
    await CreditService.charge(userId, AUDIENCE_RESONANCE_CREDIT_COST, 'ai_usage', null, {
      operation: 'audience_resonance_analysis',
      projectId,
      jobId: job.id,
      sceneCount,
    })

    return NextResponse.json(
      {
        jobId: job.id,
        status: 'queued',
        sceneCount,
        chunkCount: chunks.length,
        estimatedSeconds: estimateSeconds(chunks.length),
        creditsUsed: AUDIENCE_RESONANCE_CREDIT_COST,
      },
      { status: 202 }
    )
  } catch (err: any) {
    console.error('[Script Review Start] Error:', err)
    return NextResponse.json({ error: err?.message || 'Failed to queue analysis' }, { status: 500 })
  }
}
