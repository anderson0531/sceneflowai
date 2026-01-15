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
import { getSignedDownloadUrl } from '@/lib/gcs/renderStorage'

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
    
    // Convert gs:// URL to signed HTTPS URL if needed
    let downloadUrl = payload.outputUrl
    if (downloadUrl && downloadUrl.startsWith('gs://')) {
      console.log(`[SceneRenderCallback] Converting gs:// URL to signed URL for job ${payload.jobId}`)
      try {
        const signedUrl = await getSignedDownloadUrl(payload.jobId)
        if (signedUrl) {
          downloadUrl = signedUrl
          console.log(`[SceneRenderCallback] Generated signed URL for job ${payload.jobId}`)
        } else {
          console.warn(`[SceneRenderCallback] Could not generate signed URL, file may not exist yet`)
        }
      } catch (error) {
        console.error(`[SceneRenderCallback] Failed to generate signed URL:`, error)
      }
    }
    
    // Update job status in store
    const existingJob = getJobStatus(payload.jobId)
    
    if (existingJob) {
      updateJobStatus(payload.jobId, {
        status: payload.status,
        progress: payload.progress,
        downloadUrl: downloadUrl,
        error: payload.error,
      })
      
      console.log(`[SceneRenderCallback] Updated job ${payload.jobId} status to ${payload.status}`)
    } else {
      // Job not in memory - create entry
      setJobStatus(payload.jobId, {
        status: payload.status,
        progress: payload.progress,
        downloadUrl: downloadUrl,
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
