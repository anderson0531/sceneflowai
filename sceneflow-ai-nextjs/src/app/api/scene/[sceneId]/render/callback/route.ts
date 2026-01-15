/**
 * Scene Render Callback API Route
 * 
 * POST /api/scene/[sceneId]/render/callback
 * 
 * Called by Cloud Run FFmpeg renderer when:
 * - Job starts processing
 * - Job completes successfully  
 * - Job fails with error
 * 
 * Updates the job status in the shared store.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getJobStatus, setJobStatus, updateJobStatus } from '@/lib/render/jobStatusStore'

interface RenderCallbackPayload {
  jobId: string
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED'
  progress: number
  outputUrl?: string
  error?: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sceneId: string }> }
) {
  try {
    const { sceneId } = await params
    const payload: RenderCallbackPayload = await request.json()
    
    console.log(`[SceneRenderCallback] Received callback for scene ${sceneId}:`, {
      jobId: payload.jobId,
      status: payload.status,
      progress: payload.progress,
    })
    
    // Validate required fields
    if (!payload.jobId || !payload.status) {
      return NextResponse.json(
        { error: 'jobId and status are required' },
        { status: 400 }
      )
    }
    
    // Update job status in store
    const existingJob = getJobStatus(payload.jobId)
    
    if (existingJob) {
      updateJobStatus(payload.jobId, {
        status: payload.status,
        progress: payload.progress,
        downloadUrl: payload.outputUrl,
        error: payload.error,
      })
      
      console.log(`[SceneRenderCallback] Updated job ${payload.jobId} status to ${payload.status}`)
    } else {
      // Job not in memory - create entry
      setJobStatus(payload.jobId, {
        status: payload.status,
        progress: payload.progress,
        downloadUrl: payload.outputUrl,
        error: payload.error,
        createdAt: new Date().toISOString(),
      })
      
      console.log(`[SceneRenderCallback] Created job ${payload.jobId} with status ${payload.status}`)
    }
    
    // Log completion/failure
    if (payload.status === 'COMPLETED') {
      console.log(`[SceneRenderCallback] ✅ Job ${payload.jobId} completed successfully`)
      console.log(`[SceneRenderCallback] Download URL: ${payload.outputUrl}`)
    } else if (payload.status === 'FAILED') {
      console.error(`[SceneRenderCallback] ❌ Job ${payload.jobId} failed: ${payload.error}`)
    }
    
    return NextResponse.json({
      success: true,
      message: `Job status updated to ${payload.status}`,
    })
    
  } catch (error) {
    console.error('[SceneRenderCallback] Error processing callback:', error)
    return NextResponse.json(
      { error: 'Failed to process callback' },
      { status: 500 }
    )
  }
}
