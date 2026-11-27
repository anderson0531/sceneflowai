import { NextRequest, NextResponse } from 'next/server'
import '@/models'
import Project from '@/models/Project'
import { getSessionUserId } from '@/lib/auth/sessionUser'
import {
  createGenerationJob,
  findActiveJob,
} from '@/lib/jobs/jobService'
import { isInngestDispatchConfigured } from '@/lib/jobs/inngestDispatch'
import { inngest } from '@/inngest/client'
import {
  resolveVertexCredentialForUser,
  resolveKlingCredentialForUser,
} from '@/lib/byok/resolveProviderCredential'
import {
  normalizeProductionStages,
  type ProductionBuilderOptions,
  type ProductionStageId,
} from '@/lib/production/runProductionAgent'
import { PRODUCTION_AGENT_JOB_TYPE } from '@/lib/jobs/productionAgentWorker'
import type { GenerationJobType } from '@/models/GenerationJob'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    let body: {
      projectId?: string
      options?: Partial<ProductionBuilderOptions>
      preferByok?: boolean
    }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const projectId = body?.projectId?.trim()
    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    const project = await Project.findByPk(projectId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    if (project.user_id && project.user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const existing = await findActiveJob({
      userId,
      projectId,
      jobType: PRODUCTION_AGENT_JOB_TYPE as GenerationJobType,
    })
    if (existing) {
      return NextResponse.json(
        {
          jobId: existing.id,
          status: existing.status,
          alreadyRunning: true,
        },
        { status: 200 }
      )
    }

    // Detect active BYOK credentials and automatically lock sequential execution profile for BYOK
    const [vertexCred, klingCred] = await Promise.all([
      resolveVertexCredentialForUser(userId, { preferByok: body.preferByok }),
      resolveKlingCredentialForUser(userId, { preferByok: body.preferByok }),
    ])
    const hasByok = vertexCred.source === 'byok' || klingCred.source === 'byok'
    const credentialSource = hasByok ? 'byok' : 'platform'

    const rawOpts = body.options ?? {}
    const orderedStages = normalizeProductionStages(
      Array.isArray(rawOpts.stages) && rawOpts.stages.length > 0
        ? (rawOpts.stages as ProductionStageId[])
        : ['previs']
    )
    const selectedSceneIndices = Array.isArray(rawOpts.selectedSceneIndices)
      ? rawOpts.selectedSceneIndices
          .filter((n): n is number => Number.isInteger(n) && n >= 0)
          .sort((a, b) => a - b)
      : []

    if (selectedSceneIndices.length === 0) {
      return NextResponse.json(
        { error: 'At least one scene index must be selected' },
        { status: 400 }
      )
    }

    const executionProfile: 'adaptive' | 'sequential' = hasByok
      ? 'sequential'
      : rawOpts.executionProfile === 'sequential'
        ? 'sequential'
        : 'adaptive'

    const normalizedOptions: ProductionBuilderOptions = {
      scopeMode: rawOpts.scopeMode ?? 'custom',
      chapterId: rawOpts.chapterId,
      selectedSceneIndices,
      stages: orderedStages,
      quality: rawOpts.quality ?? 'draft',
      language: rawOpts.language ?? 'en',
      missingOnly: rawOpts.missingOnly !== false,
      optimizeShotDirection: rawOpts.optimizeShotDirection !== false,
      autoRerunFailedShots: rawOpts.autoRerunFailedShots !== false,
      creativeClipPolicyFallback: rawOpts.creativeClipPolicyFallback !== false,
      checkpointMode: rawOpts.checkpointMode ?? 'autonomous',
      notificationFrequency: rawOpts.notificationFrequency ?? 'phase_milestones',
      mintScreeningLink: rawOpts.mintScreeningLink !== false,
      previsIncludeAudio: rawOpts.previsIncludeAudio !== false,
      previsIncludeStills: rawOpts.previsIncludeStills !== false,
      executionProfile,
      maxRateLimitRecoveryPasses:
        typeof rawOpts.maxRateLimitRecoveryPasses === 'number' &&
        Number.isFinite(rawOpts.maxRateLimitRecoveryPasses)
          ? Math.max(0, Math.min(5, Math.floor(rawOpts.maxRateLimitRecoveryPasses)))
          : 3,
      coordinatePrevisLanes: rawOpts.coordinatePrevisLanes !== false,
    }

    const { job } = await createGenerationJob({
      userId,
      projectId,
      jobType: PRODUCTION_AGENT_JOB_TYPE as GenerationJobType,
      payload: {
        options: normalizedOptions,
        credentialSource,
        vertexBucketNamespace: vertexCred.bucketNamespace,
        klingBucketNamespace: klingCred.bucketNamespace,
      },
      dispatch: false,
    })

    let dispatched = false
    if (isInngestDispatchConfigured()) {
      try {
        await inngest.send({
          name: 'production/agent.requested',
          data: {
            jobId: job.id,
            userId,
            projectId,
          },
        })
        dispatched = true
      } catch (err) {
        console.warn('[production/agent/start] Inngest dispatch failed; job left queued:', err)
      }
    } else {
      console.warn('[production/agent/start] INNGEST_EVENT_KEY not configured; job left queued')
    }

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      dispatched,
      executionProfile,
      credentialSource,
    })
  } catch (err: any) {
    console.error('[production/agent/start] Error:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to start Production Agent' },
      { status: 500 }
    )
  }
}
