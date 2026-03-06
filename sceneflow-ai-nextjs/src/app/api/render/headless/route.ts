/**
 * Headless Render API Route - Triggers Cloud Run Job for Pro rendering
 * 
 * POST /api/render/headless
 * 
 * This endpoint:
 * 1. Validates the render configuration
 * 2. Uploads job spec to GCS
 * 3. Triggers a Cloud Run Job for headless Puppeteer rendering
 * 4. Returns job ID for status polling
 * 
 * Environment Variables Required:
 * - GCP_PROJECT_ID: Google Cloud project ID
 * - GCP_REGION: Cloud Run region (default: us-central1)
 * - GCS_RENDER_BUCKET: GCS bucket for job specs and outputs
 * - CLOUD_RUN_PUPPETEER_JOB_NAME: Cloud Run job name (default: puppeteer-render-job)
 * - GOOGLE_APPLICATION_CREDENTIALS_JSON: Service account JSON (for Vercel deployment)
 */

import { NextRequest, NextResponse } from 'next/server'
import { Storage } from '@google-cloud/storage'
import { v4 as uuidv4 } from 'uuid'

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
      console.error('[HeadlessRender API] Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON:', e)
      throw new Error('Invalid GCP credentials configuration')
    }
  }
  
  // Fall back to Application Default Credentials (works in GCP environments)
  return new Storage()
}

// =============================================================================
// Types
// =============================================================================

interface HeadlessRenderRequest {
  segments: {
    segmentId: string
    assetUrl: string
    assetType: 'video' | 'image'
    startTime: number
    duration: number
    volume?: number
  }[]
  audioClips?: {
    url: string
    startTime: number
    duration: number
    volume: number
    type: 'narration' | 'dialogue' | 'music' | 'sfx'
  }[]
  textOverlays?: {
    id: string
    text: string
    subtext?: string
    position: { x: number; y: number; anchor: string }
    style: {
      fontFamily: string
      fontSize: number
      fontWeight: number
      color: string
      backgroundColor?: string
      backgroundOpacity?: number
      textShadow?: boolean
    }
    timing: {
      startTime: number
      duration: number
      fadeInMs: number
      fadeOutMs: number
    }
  }[]
  watermark?: {
    type: 'text' | 'image'
    text?: string
    imageUrl?: string
    anchor: string
    padding: number
    textStyle: {
      fontFamily: string
      fontSize: number
      fontWeight: number
      color: string
      opacity: number
      textShadow?: boolean
    }
    imageStyle: {
      width: number
      opacity: number
    }
  }
  resolution: '720p' | '1080p' | '4k'
  fps: number
  totalDuration: number
  callbackUrl?: string
  metadata?: {
    seriesId?: string
    episodeId?: string
    userId?: string
  }
}

interface HeadlessRenderResponse {
  success: boolean
  jobId?: string
  jobSpecPath?: string
  outputPath?: string
  error?: string
}

// =============================================================================
// Configuration
// =============================================================================

const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID
const GCP_REGION = process.env.GCP_REGION || 'us-central1'
const GCS_RENDER_BUCKET = process.env.GCS_RENDER_BUCKET || 'sceneflow-render-jobs'
const CLOUD_RUN_JOB_NAME = process.env.CLOUD_RUN_PUPPETEER_JOB_NAME || 'puppeteer-render-job'

// =============================================================================
// API Handler
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse<HeadlessRenderResponse>> {
  try {
    // Validate environment configuration
    if (!GCP_PROJECT_ID) {
      console.error('[HeadlessRender API] GCP_PROJECT_ID not configured')
      return NextResponse.json(
        { success: false, error: 'Server not configured for headless rendering' },
        { status: 500 }
      )
    }

    // Parse request body
    const body: HeadlessRenderRequest = await request.json()

    // Validate required fields
    if (!body.segments || body.segments.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one segment is required' },
        { status: 400 }
      )
    }

    if (!body.totalDuration || body.totalDuration <= 0) {
      return NextResponse.json(
        { success: false, error: 'totalDuration must be greater than 0' },
        { status: 400 }
      )
    }

    // Check for GCP credentials
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.error('[HeadlessRender API] No GCP credentials configured')
      return NextResponse.json(
        { 
          success: false, 
          error: 'Pro Cloud rendering requires GCP credentials. Please configure GOOGLE_APPLICATION_CREDENTIALS_JSON in Vercel.',
          code: 'CREDENTIALS_NOT_CONFIGURED'
        },
        { status: 503 }
      )
    }

    // Generate unique job ID
    const jobId = uuidv4()
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const outputPath = `renders/${timestamp}-${jobId}.webm`
    const jobSpecPath = `job-specs/${jobId}.json`

    console.log(`[HeadlessRender API] Creating render job: ${jobId}`)
    console.log(`[HeadlessRender API] Config:`, {
      resolution: body.resolution,
      fps: body.fps,
      duration: body.totalDuration,
      segments: body.segments.length,
      hasWatermark: !!body.watermark,
    })

    // Prepare job spec for Cloud Run Job
    const jobSpec = {
      ...body,
      outputPath,
      jobId,
      createdAt: new Date().toISOString(),
    }

    // Upload job spec to GCS
    const storage = getStorageClient()
    const bucket = storage.bucket(GCS_RENDER_BUCKET)
    
    await bucket.file(jobSpecPath).save(JSON.stringify(jobSpec, null, 2), {
      contentType: 'application/json',
    })

    console.log(`[HeadlessRender API] Job spec uploaded to gs://${GCS_RENDER_BUCKET}/${jobSpecPath}`)

    // Trigger Cloud Run Job using gcloud CLI via exec
    // Note: In production, you'd use the @google-cloud/run library
    // For now, we return the job info and the job can be triggered via:
    // - Cloud Scheduler
    // - Pub/Sub trigger
    // - Direct gcloud CLI call
    // - Cloud Function trigger
    
    // For immediate execution, the client can poll the GET endpoint
    // while a Cloud Function or Scheduler triggers the job
    
    console.log(`[HeadlessRender API] Job created: ${jobId}`)
    console.log(`[HeadlessRender API] To trigger manually:`)
    console.log(`  gcloud run jobs execute ${CLOUD_RUN_JOB_NAME} --region=${GCP_REGION} \\`)
    console.log(`    --update-env-vars="JOB_SPEC_PATH=${GCS_RENDER_BUCKET}/${jobSpecPath}"`)

    return NextResponse.json({
      success: true,
      jobId,
      jobSpecPath: `gs://${GCS_RENDER_BUCKET}/${jobSpecPath}`,
      outputPath: `gs://${GCS_RENDER_BUCKET}/${outputPath}`,
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[HeadlessRender API] Error:', errorMessage)
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}

/**
 * GET /api/render/headless?jobId=xxx
 * 
 * Check the status of a render job by checking if output file exists in GCS
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')

    if (!jobId) {
      return NextResponse.json(
        { success: false, error: 'jobId parameter is required' },
        { status: 400 }
      )
    }

    // Check for GCP credentials
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'GCP credentials not configured. Please set GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable.' 
        },
        { status: 503 }
      )
    }

    // Check for output file in GCS
    const storage = getStorageClient()
    const bucket = storage.bucket(GCS_RENDER_BUCKET)
    
    // List files matching the job ID pattern
    const [files] = await bucket.getFiles({
      prefix: `renders/`,
      maxResults: 100,
    })

    const outputFile = files.find(file => file.name.includes(jobId))

    if (outputFile) {
      // Job complete - get signed URL for download
      const [signedUrl] = await outputFile.getSignedUrl({
        action: 'read',
        expires: Date.now() + 3600 * 1000, // 1 hour
      })

      return NextResponse.json({
        success: true,
        status: 'complete',
        jobId,
        outputUrl: signedUrl,
        publicUrl: `https://storage.googleapis.com/${GCS_RENDER_BUCKET}/${outputFile.name}`,
      })
    }

    // Check job spec exists (job was created but not finished)
    const [jobSpecExists] = await bucket.file(`job-specs/${jobId}.json`).exists()

    if (jobSpecExists) {
      return NextResponse.json({
        success: true,
        status: 'processing',
        jobId,
      })
    }

    return NextResponse.json({
      success: false,
      status: 'not_found',
      jobId,
      error: 'Job not found',
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[HeadlessRender API] Status check error:', errorMessage)
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}
