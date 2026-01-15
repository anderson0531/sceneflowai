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
 * Updates the job status in the database.
 */

import { NextRequest, NextResponse } from 'next/server'

interface RenderCallbackPayload {
  jobId: string
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED'
  progress: number
  outputUrl?: string
  error?: string
}

// In-memory job status store (same as main route - should be in shared module)
// For production, this should be in a database
const jobStatusStore = new Map<string, {
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  progress: number
  downloadUrl?: string
  error?: string
  createdAt: string
}>()

// Export for use by parent route
export { jobStatusStore }

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
    const existingJob = jobStatusStore.get(payload.jobId)
    
    if (existingJob) {
      jobStatusStore.set(payload.jobId, {
        ...existingJob,
        status: payload.status,
        progress: payload.progress,
        downloadUrl: payload.outputUrl,
        error: payload.error,
      })
      
      console.log(`[SceneRenderCallback] Updated job ${payload.jobId} status to ${payload.status}`)
    } else {
      // Job not in memory - create entry
      jobStatusStore.set(payload.jobId, {
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
