/**
 * Scene Render API Route
 * 
 * POST /api/scene/[sceneId]/render - Create a render job for the scene
 * GET /api/scene/[sceneId]/render?jobId=xxx - Check status of a render job
 * 
 * This route triggers a Cloud Run FFmpeg job to:
 * 1. Download all segment MP4 videos
 * 2. Download selected audio tracks
 * 3. Concatenate videos and mix audio
 * 4. Upload final MP4 to GCS
 * 5. Return signed download URL
 */

import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import type { 
  CreateSceneRenderJobRequest,
  SceneRenderJobSpec,
  SceneRenderVideoSegment,
  SceneRenderAudioClip,
} from '@/lib/video/renderTypes'
import { RENDER_DEFAULTS } from '@/lib/video/renderTypes'
import { uploadJobSpec, getOutputPath, getRenderBucket, getSignedDownloadUrl } from '@/lib/gcs/renderStorage'
import { isCloudRunJobsEnabled } from '@/lib/video/CloudRunJobsService'
import { getJobStatus, setJobStatus } from '@/lib/render/jobStatusStore'

// Environment configuration
const CALLBACK_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sceneflowai.studio'
const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID || ''
const GCP_REGION = process.env.GCP_REGION || process.env.CLOUD_RUN_REGION || 'us-central1'
const CLOUD_RUN_JOB_NAME = process.env.CLOUD_RUN_JOB_NAME || process.env.CLOUD_RUN_RENDER_JOB || 'sceneflow-ffmpeg-renderer'

/**
 * Get access token for Google Cloud API calls
 */
async function getAccessToken(): Promise<string> {
  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  
  if (credentialsJson) {
    try {
      const credentials = JSON.parse(credentialsJson)
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: await createJWT(credentials),
        }),
      })
      
      if (!response.ok) {
        throw new Error(`Token request failed: ${response.status}`)
      }
      
      const data = await response.json()
      return data.access_token
    } catch (error) {
      console.error('[SceneRender] Failed to get access token:', error)
      throw error
    }
  }
  
  throw new Error('No valid credentials found for Cloud Run API')
}

/**
 * Create a signed JWT for service account authentication
 */
async function createJWT(credentials: { client_email: string; private_key: string }): Promise<string> {
  const crypto = await import('crypto')
  
  const header = { alg: 'RS256', typ: 'JWT' }
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

/**
 * Trigger a Cloud Run Job for scene rendering
 */
async function triggerCloudRunJob(jobId: string, jobSpecPath: string, sceneId: string): Promise<void> {
  if (!GCP_PROJECT_ID || !CLOUD_RUN_JOB_NAME) {
    console.log(`[SceneRender] Skipping Cloud Run trigger (missing configuration)`)
    console.log(`  - GCP_PROJECT_ID: ${GCP_PROJECT_ID || '(not set)'}`)
    console.log(`  - CLOUD_RUN_JOB_NAME: ${CLOUD_RUN_JOB_NAME || '(not set)'}`)
    return
  }
  
  const jobName = `projects/${GCP_PROJECT_ID}/locations/${GCP_REGION}/jobs/${CLOUD_RUN_JOB_NAME}`
  const apiUrl = `https://run.googleapis.com/v2/${jobName}:run`
  
  console.log(`[SceneRender] Triggering Cloud Run Job: ${jobName}`)
  
  const accessToken = await getAccessToken()
  
  const requestBody = {
    overrides: {
      containerOverrides: [
        {
          env: [
            { name: 'JOB_ID', value: jobId },
            { name: 'JOB_SPEC_PATH', value: jobSpecPath },
            { name: 'GCS_BUCKET', value: getRenderBucket() },
            { name: 'RENDER_MODE', value: 'concatenate' },
            { name: 'CALLBACK_URL', value: `${CALLBACK_BASE_URL}/api/scene/${sceneId}/render/callback` },
          ],
        },
      ],
    },
  }
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error(`[SceneRender] Failed to trigger Cloud Run job:`, errorText)
    throw new Error(`Cloud Run API error: ${response.status} - ${errorText}`)
  }
  
  const result = await response.json()
  console.log(`[SceneRender] Cloud Run job triggered:`, result.name || result.metadata?.name)
}
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sceneId: string }> }
) {
  try {
    const { sceneId } = await params
    const body: CreateSceneRenderJobRequest = await request.json()
    
    console.log(`[SceneRender] Creating render job for scene ${sceneId}`)
    console.log(`[SceneRender] Request:`, {
      projectId: body.projectId,
      sceneNumber: body.sceneNumber,
      resolution: body.resolution,
      segments: body.segments?.length,
      audioConfig: body.audioConfig,
    })
    
    // Validate request
    if (!body.segments || body.segments.length === 0) {
      return NextResponse.json(
        { error: 'No video segments provided' },
        { status: 400 }
      )
    }
    
    // Generate job ID
    const jobId = uuidv4()
    
    // Build video segments for job spec (including per-segment audio settings)
    const videoSegments: SceneRenderVideoSegment[] = body.segments.map((seg, idx) => ({
      segmentId: seg.segmentId,
      sequenceIndex: seg.sequenceIndex,
      videoUrl: seg.videoUrl,
      startTime: seg.startTime,
      duration: seg.endTime - seg.startTime,
      audioSource: seg.audioSource ?? 'original',
      audioVolume: seg.audioVolume ?? 1.0,
      voiceoverUrl: seg.voiceoverUrl,
      voiceoverStartTime: seg.voiceoverStartTime,
      voiceoverDuration: seg.voiceoverDuration,
    }))
    
    // Get volume settings from audioConfig (with defaults)
    const narrationVolume = body.audioConfig.narrationVolume ?? 0.8
    const dialogueVolume = body.audioConfig.dialogueVolume ?? 0.9
    const musicVolume = body.audioConfig.musicVolume ?? 0.5
    const sfxVolume = body.audioConfig.sfxVolume ?? 0.6
    const segmentAudioVolume = body.audioConfig.segmentAudioVolume ?? 0.7
    const includeSegmentAudio = body.audioConfig.includeSegmentAudio ?? false
    
    // Build audio clips from selected tracks
    const audioClips: SceneRenderAudioClip[] = []
    
    // Add narration
    if (body.audioConfig.includeNarration && body.audioTracks.narration) {
      for (const track of body.audioTracks.narration) {
        audioClips.push({
          url: track.url,
          startTime: track.startTime,
          duration: track.duration,
          volume: narrationVolume,
          type: 'narration',
        })
      }
    }
    
    // Add dialogue
    if (body.audioConfig.includeDialogue && body.audioTracks.dialogue) {
      for (const track of body.audioTracks.dialogue) {
        audioClips.push({
          url: track.url,
          startTime: track.startTime,
          duration: track.duration,
          volume: dialogueVolume,
          type: 'dialogue',
          character: track.character,
        })
      }
    }
    
    // Add music
    if (body.audioConfig.includeMusic && body.audioTracks.music) {
      for (const track of body.audioTracks.music) {
        audioClips.push({
          url: track.url,
          startTime: track.startTime,
          duration: track.duration,
          volume: musicVolume,
          type: 'music',
        })
      }
    }
    
    // Add SFX
    if (body.audioConfig.includeSfx && body.audioTracks.sfx) {
      for (const track of body.audioTracks.sfx) {
        audioClips.push({
          url: track.url,
          startTime: track.startTime,
          duration: track.duration,
          volume: sfxVolume,
          type: 'sfx',
        })
      }
    }
    
    // Calculate total duration from segments
    const totalDuration = videoSegments.reduce((sum, seg) => sum + seg.duration, 0)
    
    // Build job spec
    const jobSpec: SceneRenderJobSpec = {
      jobId,
      projectId: body.projectId,
      sceneId,
      sceneNumber: body.sceneNumber,
      resolution: body.resolution,
      fps: RENDER_DEFAULTS.fps,
      videoSegments,
      audioClips,
      outputPath: getOutputPath(jobId),
      callbackUrl: `${CALLBACK_BASE_URL}/api/scene/${sceneId}/render/callback`,
      createdAt: new Date().toISOString(),
      renderMode: 'concatenate', // Use video concatenation, not Ken Burns
      language: body.audioConfig.language,
      includeSegmentAudio,
      segmentAudioVolume,
    }
    
    console.log(`[SceneRender] Job spec created:`, {
      jobId,
      videoSegments: videoSegments.length,
      audioClips: audioClips.length,
      totalDuration,
      resolution: body.resolution,
    })
    
    // Store initial job status
    setJobStatus(jobId, {
      status: 'QUEUED',
      progress: 0,
      createdAt: new Date().toISOString(),
    })
    
    // Upload job spec to GCS
    let jobSpecPath: string
    try {
      jobSpecPath = await uploadJobSpec(jobSpec as never)
      console.log(`[SceneRender] Job spec uploaded: ${jobSpecPath}`)
    } catch (uploadError: unknown) {
      const errorMessage = uploadError instanceof Error ? uploadError.message : String(uploadError)
      console.error('[SceneRender] Failed to upload job spec:', uploadError)
      
      // Check if it's a bucket not found error - means GCS isn't set up yet
      if (errorMessage.includes('bucket does not exist') || errorMessage.includes('notFound')) {
        console.log('[SceneRender] GCS bucket not configured - Cloud Run render infrastructure not deployed')
        return NextResponse.json({
          success: false,
          jobId,
          status: 'FAILED',
          error: 'Scene rendering infrastructure not yet deployed. Please contact support or check the deployment guide.',
          details: 'The GCS render bucket does not exist. Run: gsutil mb -l us-central1 gs://sceneflow-render-jobs',
        }, { status: 503 })
      }
      
      // For development/demo without GCS, return helpful message
      if (process.env.NODE_ENV === 'development' || !process.env.GCS_RENDER_BUCKET) {
        console.log('[SceneRender] Development mode: returning setup instructions')
        return NextResponse.json({
          success: false,
          jobId,
          status: 'FAILED',
          error: 'Scene rendering requires Cloud Run infrastructure',
          details: 'Set GCS_RENDER_BUCKET environment variable and create the bucket in GCP',
        }, { status: 503 })
      }
      
      throw uploadError
    }
    
    // Trigger Cloud Run Job
    try {
      await triggerCloudRunJob(jobId, jobSpecPath, sceneId)
      console.log(`[SceneRender] Cloud Run job triggered for: ${jobSpecPath}`)
      
      // Update status to PROCESSING
      setJobStatus(jobId, {
        status: 'PROCESSING',
        progress: 10,
        createdAt: new Date().toISOString(),
      })
    } catch (triggerError) {
      console.error('[SceneRender] Failed to trigger Cloud Run job:', triggerError)
      
      // If Cloud Run isn't configured, still return success but with QUEUED status
      if (!isCloudRunJobsEnabled()) {
        console.log('[SceneRender] Cloud Run not configured - job spec uploaded but not triggered')
        return NextResponse.json({
          success: true,
          jobId,
          status: 'QUEUED',
          message: 'Job spec uploaded. Cloud Run not configured - set GCP_PROJECT_ID and CLOUD_RUN_JOB_NAME environment variables.',
          estimatedDuration: totalDuration,
          warning: 'Cloud Run trigger skipped - job will not process automatically',
        })
      }
      
      // Update job status to failed
      setJobStatus(jobId, {
        status: 'FAILED',
        progress: 0,
        error: triggerError instanceof Error ? triggerError.message : 'Failed to trigger render job',
        createdAt: new Date().toISOString(),
      })
      
      throw triggerError
    }
    
    return NextResponse.json({
      success: true,
      jobId,
      status: 'PROCESSING',
      message: 'Scene render job started successfully',
      estimatedDuration: totalDuration,
    })
    
  } catch (error) {
    console.error('[SceneRender] Error creating render job:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to create render job',
        details: String(error),
      },
      { status: 500 }
    )
  }
}

/**
 * GET - Check status of a render job
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sceneId: string }> }
) {
  try {
    const { sceneId } = await params
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')
    
    if (!jobId) {
      return NextResponse.json(
        { error: 'jobId query parameter required' },
        { status: 400 }
      )
    }
    
    // Check in-memory store
    const jobStatus = getJobStatus(jobId)
    
    if (!jobStatus) {
      // Job not found in memory - could be expired or from before restart
      return NextResponse.json({
        success: true,
        jobId,
        status: 'FAILED',
        progress: 0,
        error: 'Job not found or expired',
      })
    }
    
    // Convert gs:// URL to signed HTTPS URL if needed
    let downloadUrl = jobStatus.downloadUrl
    if (downloadUrl && downloadUrl.startsWith('gs://')) {
      console.log(`[SceneRender] Converting gs:// URL to signed URL for job ${jobId}`)
      try {
        const signedUrl = await getSignedDownloadUrl(jobId)
        if (signedUrl) {
          downloadUrl = signedUrl
        }
      } catch (error) {
        console.error(`[SceneRender] Failed to generate signed URL:`, error)
      }
    }
    
    return NextResponse.json({
      success: true,
      jobId,
      status: jobStatus.status,
      progress: jobStatus.progress,
      downloadUrl: downloadUrl,
      error: jobStatus.error,
      createdAt: jobStatus.createdAt,
    })
    
  } catch (error) {
    console.error('[SceneRender] Error checking job status:', error)
    return NextResponse.json(
      { error: 'Failed to check job status' },
      { status: 500 }
    )
  }
}
