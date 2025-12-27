/**
 * Export Video Status API Route
 * 
 * GET /api/export/video/status/[renderId]
 * 
 * Polls render status for Cloud Run Jobs.
 * The jobId (UUID format) is used to query the RenderJob database table.
 */

import { NextRequest, NextResponse } from 'next/server'
import RenderJob from '@/models/RenderJob'

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
