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
import crypto from 'crypto'

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
// Helper: Get Access Token for Cloud Run API
// =============================================================================

async function getAccessToken(): Promise<string> {
  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  
  if (credentialsJson) {
    try {
      const credentials = JSON.parse(credentialsJson)
      // Create signed JWT for service account authentication
      const jwt = await createJWT(credentials)
      
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: jwt,
        }),
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Token request failed: ${response.status} - ${errorText}`)
      }
      
      const data = await response.json()
      return data.access_token
    } catch (error) {
      console.error('[HeadlessRender API] Failed to get access token:', error)
      throw error
    }
  }
  
  // Fallback: try metadata server (when running on GCP)
  try {
    const response = await fetch(
      'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
      { headers: { 'Metadata-Flavor': 'Google' } }
    )
    
    if (response.ok) {
      const data = await response.json()
      return data.access_token
    }
  } catch {
    // Not running on GCP, ignore
  }
  
  throw new Error('No valid credentials found for Cloud Run API')
}

/**
 * Create a signed JWT for service account authentication
 */
async function createJWT(credentials: { client_email: string; private_key: string }): Promise<string> {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  }
  
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: credentials.client_email,
    sub: credentials.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
  }
  
  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url')
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signatureInput = `${base64Header}.${base64Payload}`
  
  const sign = crypto.createSign('RSA-SHA256')
  sign.update(signatureInput)
  const signature = sign.sign(credentials.private_key, 'base64url')
  
  return `${signatureInput}.${signature}`
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
    playbackRate?: number
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

    // Trigger Cloud Run Job via REST API
    const jobName = `projects/${GCP_PROJECT_ID}/locations/${GCP_REGION}/jobs/${CLOUD_RUN_JOB_NAME}`
    const apiUrl = `https://run.googleapis.com/v2/${jobName}:run`
    
    console.log(`[HeadlessRender API] Triggering Cloud Run Job: ${jobName}`)
    
    // Get access token for API authentication
    const accessToken = await getAccessToken()
    
    // Build the request body with environment overrides
    const CALLBACK_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sceneflowai.studio'
    const requestBody = {
      overrides: {
        containerOverrides: [
          {
            env: [
              { name: 'JOB_ID', value: jobId },
              { name: 'JOB_SPEC_PATH', value: `${GCS_RENDER_BUCKET}/${jobSpecPath}` },
              { name: 'GCS_BUCKET', value: GCS_RENDER_BUCKET },
              { name: 'CALLBACK_URL', value: `${CALLBACK_BASE_URL}/api/render/headless/callback` },
            ],
          },
        ],
      },
    }
    
    const runResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })
    
    if (!runResponse.ok) {
      const errorText = await runResponse.text()
      console.error(`[HeadlessRender API] Failed to trigger Cloud Run Job:`, errorText)
      
      // Clean up job spec if trigger fails
      try {
        await bucket.file(jobSpecPath).delete()
      } catch (deleteError) {
        console.warn(`[HeadlessRender API] Failed to clean up job spec:`, deleteError)
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: `Failed to trigger render job: ${runResponse.status}`,
          details: errorText.substring(0, 200),
        },
        { status: 500 }
      )
    }
    
    const runResult = await runResponse.json()
    const executionName = runResult.name || runResult.metadata?.name || 'unknown'
    
    console.log(`[HeadlessRender API] Cloud Run Job triggered successfully: ${executionName}`)

    return NextResponse.json({
      success: true,
      jobId,
      executionName,
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
    
    // First, check for callback status file (fastest detection)
    const statusFile = bucket.file(`job-status/${jobId}.json`)
    const [statusExists] = await statusFile.exists()
    
    if (statusExists) {
      const [statusData] = await statusFile.download()
      const status = JSON.parse(statusData.toString())
      
      if (status.status === 'complete' && status.outputUrl) {
        return NextResponse.json({
          success: true,
          status: 'complete',
          jobId,
          outputUrl: status.outputUrl,
          publicUrl: status.outputUrl,
          duration: status.duration,
          frameCount: status.frameCount,
          resolution: status.resolution,
        })
      }
      
      if (status.status === 'failed') {
        return NextResponse.json({
          success: false,
          status: 'failed',
          jobId,
          error: status.error || 'Render job failed',
        })
      }
    }
    
    // Fallback: List files matching the job ID pattern
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
