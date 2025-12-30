/**
 * Export Video Status API Route
 * 
 * GET /api/export/video/status/[renderId]
 * 
 * Polls render status for Cloud Run Jobs.
 * The jobId (UUID format) is used to query the RenderJob database table.
 * 
 * Content Moderation:
 * - Export gate moderation runs when video is first marked complete
 * - Blocks NSFW, violence, hate content before download is allowed
 * - This is the final safety gate - 100% coverage
 */

import { NextRequest, NextResponse } from 'next/server'
import RenderJob, { RenderJobStatus } from '@/models/RenderJob'
import { moderateExport, createExportBlockedResponse, getUserModerationContext } from '@/lib/moderation'

export const maxDuration = 30
export const runtime = 'nodejs'

// Check if this is a valid UUID format (Cloud Run job ID)
function isValidJobId(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

// Get status from Cloud Run job (via database)
async function getJobStatus(jobId: string) {
  const job = await RenderJob.findByPk(jobId)
  
  if (!job) {
    return null
  }

  const status = job.status.toLowerCase()
  let mappedStatus: string
  let progress: number

  switch (status) {
    case 'queued':
      mappedStatus = 'queued'
      progress = 10
      break
    case 'processing':
      mappedStatus = 'rendering'
      progress = job.progress || 50
      break
    case 'completed':
      mappedStatus = 'done'
      progress = 100
      break
    case 'failed':
      mappedStatus = 'failed'
      progress = 0
      break
    case 'cancelled':
      mappedStatus = 'cancelled'
      progress = 0
      break
    default:
      mappedStatus = status
      progress = 0
  }

  return {
    status: mappedStatus,
    progress,
    url: job.download_url || null,
    error: job.error || null,
    estimatedDuration: job.estimated_duration,
    resolution: job.resolution,
    language: job.language,
    createdAt: job.created_at,
    completedAt: job.completed_at,
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ renderId: string }> }
) {
  try {
    const { renderId } = await params

    if (!renderId) {
      return NextResponse.json(
        { error: 'Missing renderId parameter' },
        { status: 400 }
      )
    }

    console.log(`[Export Video Status] Checking render status: ${renderId}`)

    // Validate job ID format
    if (!isValidJobId(renderId)) {
      return NextResponse.json(
        { 
          error: 'Invalid job ID format',
          details: 'Job ID must be a valid UUID. Legacy Shotstack render IDs are no longer supported.'
        },
        { status: 400 }
      )
    }

    const jobStatus = await getJobStatus(renderId)
    
    if (!jobStatus) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    console.log(`[Export Video Status] Job ${renderId}:`, {
      status: jobStatus.status,
      progress: jobStatus.progress,
      hasUrl: !!jobStatus.url,
    })

    // Export gate moderation: Check video content before allowing download
    // This is the final safety gate - runs at 100% coverage
    let finalUrl = jobStatus.url
    let moderationBlocked = false
    
    // Get job record to check current state
    const job = await RenderJob.findByPk(renderId)
    
    // Only run moderation if:
    // 1. Job is done with a URL
    // 2. Job hasn't already been blocked (status !== BLOCKED)  
    // 3. Job hasn't been marked as moderation-passed (check completed_at exists for done status)
    const shouldRunModeration = jobStatus.status === 'done' && 
                                jobStatus.url && 
                                job?.status !== 'BLOCKED' as RenderJobStatus
    
    if (shouldRunModeration && job) {
      console.log(`[Export Video Status] Running export gate moderation for job ${renderId}`)
      
      const userId = job.user_id || 'anonymous'
      const projectId = job.project_id || undefined
      
      const moderationContext = await getUserModerationContext(userId, projectId)
      const moderationResult = await moderateExport(jobStatus.url, null, moderationContext)
      
      if (!moderationResult.allowed) {
        console.warn(`[Export Video Status] Export blocked by moderation for job ${renderId}`)
        moderationBlocked = true
        finalUrl = null
        
        // Update job record to indicate moderation failure
        // Use type assertion since BLOCKED is a valid status for moderation failures
        await job.update({
          status: 'FAILED' as RenderJobStatus,
          error: `Content blocked: ${moderationResult.result?.flaggedCategories.join(', ') || 'policy violation'}`,
        })
      } else {
        // Video passed moderation - log success
        console.log(`[Export Video Status] Export passed moderation for job ${renderId}`)
      }
    }

    // If blocked, return appropriate response
    if (moderationBlocked) {
      return NextResponse.json({
        success: false,
        jobId: renderId,
        provider: 'cloud-run',
        status: 'blocked',
        progress: 100,
        url: null,
        error: 'Export blocked: Video contains content that violates our content policy. Please review and remove flagged content.',
        blocked: true,
        metadata: {
          estimatedDuration: jobStatus.estimatedDuration,
          resolution: jobStatus.resolution,
          language: jobStatus.language,
          createdAt: jobStatus.createdAt,
          completedAt: jobStatus.completedAt,
        },
      })
    }

    return NextResponse.json({
      success: true,
      jobId: renderId,
      provider: 'cloud-run',
      status: jobStatus.status,
      progress: jobStatus.progress,
      url: jobStatus.url,
      error: jobStatus.error,
      metadata: {
        estimatedDuration: jobStatus.estimatedDuration,
        resolution: jobStatus.resolution,
        language: jobStatus.language,
        createdAt: jobStatus.createdAt,
        completedAt: jobStatus.completedAt,
      },
    })
  } catch (error: unknown) {
    console.error('[Export Video Status] Error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to get render status',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
