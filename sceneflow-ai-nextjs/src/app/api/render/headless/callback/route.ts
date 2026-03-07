/**
 * Headless Render Callback API Route
 * 
 * POST /api/render/headless/callback
 * 
 * This endpoint receives completion callbacks from Cloud Run Jobs.
 * It updates the job status in GCS so polling can detect completion.
 */

import { NextRequest, NextResponse } from 'next/server'
import { Storage } from '@google-cloud/storage'

// =============================================================================
// Helper: Get Storage client with credentials
// =============================================================================

function getStorageClient(): Storage {
  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  
  if (credentialsJson) {
    try {
      const credentials = JSON.parse(credentialsJson)
      return new Storage({
        projectId: credentials.project_id,
        credentials,
      })
    } catch (e) {
      console.error('[HeadlessCallback API] Failed to parse credentials:', e)
      throw new Error('Invalid GCP credentials configuration')
    }
  }
  
  return new Storage()
}

// =============================================================================
// Configuration
// =============================================================================

const GCS_RENDER_BUCKET = process.env.GCS_RENDER_BUCKET || 'sceneflow-render-jobs'

// =============================================================================
// Types
// =============================================================================

interface CallbackPayload {
  success: boolean
  jobId?: string
  outputUrl?: string
  duration?: number
  frameCount?: number
  resolution?: string
  error?: string
}

// =============================================================================
// API Handler
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: CallbackPayload = await request.json()
    
    console.log('[HeadlessCallback API] Received callback:', {
      success: body.success,
      jobId: body.jobId,
      outputUrl: body.outputUrl?.substring(0, 50),
      duration: body.duration,
    })
    
    // Extract job ID from output URL if not provided directly
    let jobId = body.jobId
    if (!jobId && body.outputUrl) {
      // Try to extract from URL like: .../renders/2024-01-01T12-00-00-000Z-uuid.webm
      const match = body.outputUrl.match(/([a-f0-9-]{36})\.webm/)
      if (match) {
        jobId = match[1]
      }
    }
    
    if (!jobId) {
      console.warn('[HeadlessCallback API] No job ID provided')
      return NextResponse.json({ success: true, message: 'Callback received (no job ID)' })
    }
    
    // Update job status in GCS
    const storage = getStorageClient()
    const bucket = storage.bucket(GCS_RENDER_BUCKET)
    
    const statusFile = `job-status/${jobId}.json`
    const statusData = {
      jobId,
      status: body.success ? 'complete' : 'failed',
      outputUrl: body.outputUrl,
      duration: body.duration,
      frameCount: body.frameCount,
      resolution: body.resolution,
      error: body.error,
      completedAt: new Date().toISOString(),
    }
    
    await bucket.file(statusFile).save(JSON.stringify(statusData, null, 2), {
      contentType: 'application/json',
    })
    
    console.log(`[HeadlessCallback API] Status updated: ${statusFile}`)
    
    return NextResponse.json({
      success: true,
      message: 'Callback processed successfully',
      jobId,
    })
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[HeadlessCallback API] Error:', errorMessage)
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}
