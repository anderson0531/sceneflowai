/**
 * Cloud Run Jobs Service
 * 
 * Triggers Google Cloud Run Jobs for video rendering.
 * Uses the Cloud Run Jobs REST API to start render jobs asynchronously.
 * 
 * Architecture:
 * 1. API receives render request
 * 2. Job spec is uploaded to GCS
 * 3. This service triggers a Cloud Run Job with the job spec path
 * 4. Cloud Run Job runs FFmpeg and uploads result to GCS
 * 5. Job status is updated via callback or database
 */

import { v4 as uuidv4 } from 'uuid'
import {
  RenderJobSpec,
  RenderSegment,
  RenderAudioClip,
  CreateRenderJobRequest,
  CreateRenderJobResponse,
  RENDER_DEFAULTS,
} from './renderTypes'
import {
  uploadJobSpec,
  getOutputPath,
  getRenderBucket,
} from '../gcs/renderStorage'

// Environment configuration
const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID || ''
const GCP_REGION = process.env.GCP_REGION || process.env.CLOUD_RUN_REGION || 'us-central1'
const CLOUD_RUN_JOB_NAME = process.env.CLOUD_RUN_JOB_NAME || process.env.CLOUD_RUN_RENDER_JOB || 'sceneflow-ffmpeg-renderer'
const CALLBACK_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sceneflowai.studio'

/**
 * Get access token for Google Cloud API calls
 * Uses Application Default Credentials or service account
 */
async function getAccessToken(): Promise<string> {
  // Check for service account JSON in environment
  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  
  if (credentialsJson) {
    try {
      const credentials = JSON.parse(credentialsJson)
      // Use service account to get access token via OAuth2
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
      console.error('[CloudRunJobs] Failed to get access token from service account:', error)
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
  const crypto = await import('crypto')
  
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

/**
 * Convert screening room scenes to render segments and audio clips
 */
function buildRenderSpec(
  request: CreateRenderJobRequest,
  jobId: string
): { segments: RenderSegment[]; audioClips: RenderAudioClip[] } {
  const segments: RenderSegment[] = []
  const audioClips: RenderAudioClip[] = []
  let currentTime = 0
  
  for (let i = 0; i < request.scenes.length; i++) {
    const scene = request.scenes[i]
    const imageUrl = scene.imageUrl
    
    if (!imageUrl) {
      console.log(`[CloudRunJobs] Scene ${i + 1} has no image, skipping`)
      continue
    }
    
    // Calculate scene duration
    let sceneDuration = scene.duration || RENDER_DEFAULTS.defaultSceneDuration
    if (sceneDuration < 1) {
      sceneDuration = RENDER_DEFAULTS.defaultSceneDuration
    }
    
    const sceneStartTime = currentTime
    let audioOffsetInScene = 0
    
    // Add video segment
    segments.push({
      segmentId: scene.id || `scene-${i + 1}`,
      imageUrl,
      startTime: sceneStartTime,
      duration: sceneDuration,
      kenBurns: {
        zoomStart: 1.0,
        zoomEnd: 1.08,
        panX: (i % 3 - 1) * 0.3, // Alternate pan direction: -0.3, 0, 0.3
        panY: 0,
      },
    })
    
    // Get narration audio URL for selected language
    let narrationUrl: string | null = null
    
    if (scene.narration_audio && typeof scene.narration_audio === 'object') {
      narrationUrl = scene.narration_audio[request.language] || 
                     scene.narration_audio['en'] || 
                     null
    }
    
    if (!narrationUrl && scene.narrationAudioUrl) {
      narrationUrl = scene.narrationAudioUrl
    }
    
    // Add narration audio clip
    if (narrationUrl) {
      const narrationDuration = sceneDuration * 0.6
      audioClips.push({
        url: narrationUrl,
        startTime: sceneStartTime + audioOffsetInScene,
        duration: narrationDuration,
        type: 'narration',
        volume: 1.0,
      })
      audioOffsetInScene += narrationDuration + 0.3
    }
    
    // Get dialogue audio for selected language
    const dialogueAudio = scene.dialogueAudio || scene.dialogue_audio
    const dialogueEntries = dialogueAudio?.[request.language] || 
                           dialogueAudio?.['en'] || 
                           []
    
    // Add dialogue audio clips
    for (const entry of dialogueEntries) {
      const dialogueUrl = entry.audioUrl || entry.audio_url
      if (dialogueUrl) {
        const dialogueDuration = entry.duration || 3
        audioClips.push({
          url: dialogueUrl,
          startTime: sceneStartTime + audioOffsetInScene,
          duration: dialogueDuration,
          type: 'dialogue',
          volume: 1.0,
        })
        audioOffsetInScene += dialogueDuration + 0.2
      }
    }
    
    currentTime += sceneDuration
  }
  
  return { segments, audioClips }
}

/**
 * Create and trigger a new render job
 * 
 * @param request - The render job request from the API
 * @returns Response with job ID and status
 */
export async function createRenderJob(
  request: CreateRenderJobRequest
): Promise<CreateRenderJobResponse> {
  const jobId = uuidv4()
  
  console.log(`[CloudRunJobs] Creating render job: ${jobId}`)
  console.log(`[CloudRunJobs] Project: ${request.projectId}`)
  console.log(`[CloudRunJobs] Resolution: ${request.resolution}`)
  console.log(`[CloudRunJobs] Scenes: ${request.scenes.length}`)
  
  try {
    // Build render spec from scenes
    const { segments, audioClips } = buildRenderSpec(request, jobId)
    
    if (segments.length === 0) {
      return {
        success: false,
        jobId,
        status: 'FAILED',
        message: 'No scenes with images found. Generate visuals first.',
      }
    }
    
    // Calculate estimated duration
    const estimatedDuration = segments.reduce((sum, seg) => sum + seg.duration, 0)
    
    // Build job spec
    const jobSpec: RenderJobSpec = {
      jobId,
      projectId: request.projectId,
      projectTitle: request.projectTitle || 'Untitled Project',
      resolution: request.resolution,
      fps: RENDER_DEFAULTS.fps,
      segments,
      audioClips,
      outputPath: getOutputPath(jobId),
      callbackUrl: `${CALLBACK_BASE_URL}/api/export/video/callback`,
      createdAt: new Date().toISOString(),
      language: request.language,
      includeSubtitles: request.includeSubtitles,
    }
    
    console.log(`[CloudRunJobs] Job spec created:`, {
      jobId,
      segments: segments.length,
      audioClips: audioClips.length,
      estimatedDuration,
    })
    
    // Upload job spec to GCS
    const jobSpecPath = await uploadJobSpec(jobSpec)
    console.log(`[CloudRunJobs] Job spec uploaded: ${jobSpecPath}`)
    
    // Trigger Cloud Run Job
    await triggerCloudRunJob(jobId, jobSpecPath)
    
    return {
      success: true,
      jobId,
      status: 'QUEUED',
      message: 'Render job queued successfully',
      estimatedDuration,
    }
    
  } catch (error) {
    console.error(`[CloudRunJobs] Failed to create render job:`, error)
    return {
      success: false,
      jobId,
      status: 'FAILED',
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Trigger a Cloud Run Job execution via REST API
 * 
 * @param jobId - The render job ID
 * @param jobSpecPath - GCS path to job spec JSON
 */
async function triggerCloudRunJob(jobId: string, jobSpecPath: string): Promise<void> {
  // Check if we're in development/preview mode or missing config
  if (!GCP_PROJECT_ID || !CLOUD_RUN_JOB_NAME) {
    console.log(`[CloudRunJobs] Skipping Cloud Run trigger (missing configuration)`)
    console.log(`[CloudRunJobs] Would trigger job with:`)
    console.log(`  - JOB_ID: ${jobId}`)
    console.log(`  - JOB_SPEC_PATH: ${jobSpecPath}`)
    console.log(`  - GCP_PROJECT_ID: ${GCP_PROJECT_ID || '(not set)'}`)
    console.log(`  - CLOUD_RUN_JOB_NAME: ${CLOUD_RUN_JOB_NAME || '(not set)'}`)
    return
  }
  
  const jobName = `projects/${GCP_PROJECT_ID}/locations/${GCP_REGION}/jobs/${CLOUD_RUN_JOB_NAME}`
  const apiUrl = `https://run.googleapis.com/v2/${jobName}:run`
  
  console.log(`[CloudRunJobs] Triggering Cloud Run Job via REST API`)
  console.log(`[CloudRunJobs] Job: ${jobName}`)
  console.log(`[CloudRunJobs] URL: ${apiUrl}`)
  
  // Get access token
  const accessToken = await getAccessToken()
  
  // Build the request body with environment overrides
  const requestBody = {
    overrides: {
      containerOverrides: [
        {
          env: [
            { name: 'JOB_ID', value: jobId },
            { name: 'JOB_SPEC_PATH', value: jobSpecPath },
            { name: 'GCS_BUCKET', value: getRenderBucket() },
            { name: 'CALLBACK_URL', value: `${CALLBACK_BASE_URL}/api/export/render-callback` },
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
    console.error(`[CloudRunJobs] Failed to trigger job:`, errorText)
    throw new Error(`Cloud Run API error: ${response.status} - ${errorText}`)
  }
  
  const result = await response.json()
  console.log(`[CloudRunJobs] Job triggered successfully:`, result.name || result.metadata?.name)
}

/**
 * Check if Cloud Run Jobs is available
 */
export function isCloudRunJobsEnabled(): boolean {
  return Boolean(GCP_PROJECT_ID && CLOUD_RUN_JOB_NAME)
}

/**
 * Get Cloud Run configuration for debugging
 */
export function getCloudRunConfig() {
  return {
    projectId: GCP_PROJECT_ID,
    region: GCP_REGION,
    jobName: CLOUD_RUN_JOB_NAME,
    callbackUrl: `${CALLBACK_BASE_URL}/api/export/video/callback`,
    bucket: getRenderBucket(),
    enabled: isCloudRunJobsEnabled(),
  }
}

// ============================================================================
// Scene-Level Render Functions (for Director's Console "Render Scene" feature)
// ============================================================================

import type {
  SceneRenderJobSpec,
  SceneRenderVideoSegment,
  SceneRenderAudioClip,
  CreateSceneRenderJobRequest,
} from './renderTypes'

/**
 * Create and trigger a scene render job (video concatenation with audio mixing)
 * 
 * This differs from project render (Ken Burns on images) by:
 * - Using existing MP4 segment videos
 * - Concatenating videos instead of applying Ken Burns
 * - Mixing multiple audio track types
 */
export async function createSceneRenderJob(
  request: CreateSceneRenderJobRequest
): Promise<CreateRenderJobResponse> {
  const jobId = uuidv4()
  
  console.log(`[CloudRunJobs] Creating scene render job: ${jobId}`)
  console.log(`[CloudRunJobs] Scene: ${request.sceneId}`)
  console.log(`[CloudRunJobs] Resolution: ${request.resolution}`)
  console.log(`[CloudRunJobs] Segments: ${request.segments.length}`)
  
  try {
    // Build video segments from request
    const videoSegments: SceneRenderVideoSegment[] = request.segments.map((seg) => ({
      segmentId: seg.segmentId,
      sequenceIndex: seg.sequenceIndex,
      videoUrl: seg.videoUrl,
      startTime: seg.startTime,
      duration: seg.endTime - seg.startTime,
    }))
    
    if (videoSegments.length === 0) {
      return {
        success: false,
        jobId,
        status: 'FAILED',
        message: 'No video segments provided',
      }
    }
    
    // Build audio clips from audio tracks
    const audioClips: SceneRenderAudioClip[] = []
    
    if (request.audioConfig.includeNarration && request.audioTracks.narration) {
      for (const track of request.audioTracks.narration) {
        audioClips.push({
          url: track.url,
          startTime: track.startTime,
          duration: track.duration,
          volume: 0.8,
          type: 'narration',
        })
      }
    }
    
    if (request.audioConfig.includeDialogue && request.audioTracks.dialogue) {
      for (const track of request.audioTracks.dialogue) {
        audioClips.push({
          url: track.url,
          startTime: track.startTime,
          duration: track.duration,
          volume: 0.9,
          type: 'dialogue',
          character: track.character,
        })
      }
    }
    
    if (request.audioConfig.includeMusic && request.audioTracks.music) {
      for (const track of request.audioTracks.music) {
        audioClips.push({
          url: track.url,
          startTime: track.startTime,
          duration: track.duration,
          volume: 0.5,
          type: 'music',
        })
      }
    }
    
    if (request.audioConfig.includeSfx && request.audioTracks.sfx) {
      for (const track of request.audioTracks.sfx) {
        audioClips.push({
          url: track.url,
          startTime: track.startTime,
          duration: track.duration,
          volume: 0.6,
          type: 'sfx',
        })
      }
    }
    
    // Calculate estimated duration
    const estimatedDuration = videoSegments.reduce((sum, seg) => sum + seg.duration, 0)
    
    // Build scene render job spec
    const jobSpec: SceneRenderJobSpec = {
      jobId,
      projectId: request.projectId,
      sceneId: request.sceneId,
      sceneNumber: request.sceneNumber,
      resolution: request.resolution,
      fps: RENDER_DEFAULTS.fps,
      videoSegments,
      audioClips,
      outputPath: getOutputPath(jobId),
      callbackUrl: `${CALLBACK_BASE_URL}/api/scene/${request.sceneId}/render/callback`,
      createdAt: new Date().toISOString(),
      renderMode: 'concatenate',
      language: request.audioConfig.language,
    }
    
    console.log(`[CloudRunJobs] Scene job spec created:`, {
      jobId,
      segments: videoSegments.length,
      audioClips: audioClips.length,
      estimatedDuration,
    })
    
    // Upload job spec to GCS
    const jobSpecPath = await uploadJobSpec(jobSpec as never)
    console.log(`[CloudRunJobs] Scene job spec uploaded: ${jobSpecPath}`)
    
    // Trigger Cloud Run Job with scene render mode
    await triggerSceneRenderJob(jobId, jobSpecPath)
    
    return {
      success: true,
      jobId,
      status: 'QUEUED',
      message: 'Scene render job queued successfully',
      estimatedDuration,
    }
    
  } catch (error) {
    console.error(`[CloudRunJobs] Failed to create scene render job:`, error)
    return {
      success: false,
      jobId,
      status: 'FAILED',
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Trigger a Cloud Run Job for scene rendering (video concatenation mode)
 */
async function triggerSceneRenderJob(jobId: string, jobSpecPath: string): Promise<void> {
  // Check if we're in development/preview mode or missing config
  if (!GCP_PROJECT_ID || !CLOUD_RUN_JOB_NAME) {
    console.log(`[CloudRunJobs] Skipping Cloud Run trigger (missing configuration)`)
    console.log(`[CloudRunJobs] Would trigger scene render job with:`)
    console.log(`  - JOB_ID: ${jobId}`)
    console.log(`  - JOB_SPEC_PATH: ${jobSpecPath}`)
    console.log(`  - RENDER_MODE: concatenate`)
    return
  }
  
  const jobName = `projects/${GCP_PROJECT_ID}/locations/${GCP_REGION}/jobs/${CLOUD_RUN_JOB_NAME}`
  const apiUrl = `https://run.googleapis.com/v2/${jobName}:run`
  
  console.log(`[CloudRunJobs] Triggering scene render Cloud Run Job`)
  console.log(`[CloudRunJobs] Job: ${jobName}`)
  
  // Get access token
  const accessToken = await getAccessToken()
  
  // Build the request body with environment overrides
  // Include RENDER_MODE=concatenate to tell the FFmpeg renderer to concatenate videos
  const requestBody = {
    overrides: {
      containerOverrides: [
        {
          env: [
            { name: 'JOB_ID', value: jobId },
            { name: 'JOB_SPEC_PATH', value: jobSpecPath },
            { name: 'GCS_BUCKET', value: getRenderBucket() },
            { name: 'RENDER_MODE', value: 'concatenate' },
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
    console.error(`[CloudRunJobs] Failed to trigger scene render job:`, errorText)
    throw new Error(`Cloud Run API error: ${response.status} - ${errorText}`)
  }
  
  const result = await response.json()
  console.log(`[CloudRunJobs] Scene render job triggered:`, result.name || result.metadata?.name)
}
