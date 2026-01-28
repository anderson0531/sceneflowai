/**
 * Scene Animatic Render API
 * 
 * Renders a single scene as an animatic (Ken Burns keyframes + audio) to MP4.
 * Creates/updates a ProductionStream entry for the scene.
 * 
 * This is different from /api/export/screening-room which renders the entire project.
 * Scene animatics are used for:
 * 1. Per-scene production streams in Final Cut
 * 2. Quick scene previews for review
 * 3. Lower-cost alternative to AI video generation
 * 
 * @see /types/productionStreams.ts for stream types
 * @see /lib/video/CloudRunJobsService.ts for render execution
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { uploadJobSpec, getOutputPath } from '@/lib/gcs/renderStorage'
import { triggerCloudRunJob, isCloudRunJobsEnabled } from '@/lib/video/CloudRunJobsService'
import { RenderJobSpec, RenderSegment, RenderAudioClip, KenBurnsSettings } from '@/lib/video/renderTypes'
import RenderJob from '@/models/RenderJob'
import { v4 as uuidv4 } from 'uuid'
import type { 
  AnimaticRenderSettings,
  KenBurnsIntensity,
} from '@/components/vision/scene-production/types'
import { calculateSourceHash } from '@/types/productionStreams'

// ============================================================================
// Types
// ============================================================================

export interface SceneAnimaticRequest {
  projectId: string
  projectTitle?: string
  sceneId: string
  sceneNumber: number
  language: string
  resolution: '720p' | '1080p' | '4K'
  /** Keyframe segments with image URLs and timing */
  segments: Array<{
    segmentId: string
    imageUrl: string
    startTime: number
    duration: number
  }>
  /** Audio clips with timing */
  audioClips: Array<{
    url: string
    startTime: number
    duration: number
    volume?: number
    type?: 'narration' | 'dialogue' | 'music' | 'sfx'
  }>
  /** Animatic render settings */
  settings: AnimaticRenderSettings
}

export interface SceneAnimaticResponse {
  success: boolean
  jobId: string
  streamId: string
  status: 'queued' | 'error'
  message?: string
  estimatedDuration?: number
  sourceHash?: string
}

// ============================================================================
// Ken Burns Configuration
// ============================================================================

function getKenBurnsSettings(intensity: KenBurnsIntensity): KenBurnsSettings {
  switch (intensity) {
    case 'off':
      return { zoomStart: 1.0, zoomEnd: 1.0, panX: 0, panY: 0 }
    case 'subtle':
      return { zoomStart: 1.0, zoomEnd: 1.05, panX: 0, panY: 0 }
    case 'medium':
      return { zoomStart: 1.0, zoomEnd: 1.10, panX: 0, panY: 0 }
    case 'dramatic':
      return { zoomStart: 1.0, zoomEnd: 1.20, panX: 0, panY: 0 }
    default:
      return { zoomStart: 1.0, zoomEnd: 1.05, panX: 0, panY: 0 }
  }
}

// ============================================================================
// Build Render Job Spec
// ============================================================================

function buildSceneAnimaticJobSpec(
  jobId: string,
  request: SceneAnimaticRequest
): RenderJobSpec {
  const kenBurns = getKenBurnsSettings(request.settings.kenBurnsIntensity)
  
  // Build render segments with Ken Burns
  const renderSegments: RenderSegment[] = request.segments.map((seg, index) => ({
    segmentId: seg.segmentId,
    imageUrl: seg.imageUrl,
    startTime: seg.startTime,
    duration: seg.duration,
    kenBurns: {
      ...kenBurns,
      // Alternate pan direction for variety
      panX: index % 2 === 0 ? 0 : (index % 4 < 2 ? 1 : -1) * 0.1,
      panY: index % 3 === 0 ? 0 : (index % 3 === 1 ? 1 : -1) * 0.1,
    },
  }))
  
  // Build audio clips
  const renderAudioClips: RenderAudioClip[] = request.audioClips.map(clip => ({
    url: clip.url,
    startTime: clip.startTime,
    duration: clip.duration,
    volume: clip.volume ?? 1.0,
    type: clip.type,
  }))
  
  // Calculate total duration
  const totalDuration = renderSegments.reduce((max, seg) => 
    Math.max(max, seg.startTime + seg.duration), 0
  )
  
  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://sceneflowai.studio'}/api/export/render-callback`
  
  return {
    jobId,
    projectId: request.projectId,
    sceneId: request.sceneId,
    projectTitle: request.projectTitle || `Scene ${request.sceneNumber}`,
    renderType: 'scene_animatic',
    streamType: 'animatic',
    resolution: request.resolution,
    fps: 24,
    segments: renderSegments,
    audioClips: renderAudioClips,
    outputPath: getOutputPath(jobId),
    callbackUrl,
    createdAt: new Date().toISOString(),
    language: request.language,
    includeSubtitles: request.settings.includeSubtitles,
    kenBurnsConfig: {
      intensity: request.settings.kenBurnsIntensity,
      transitionStyle: request.settings.transitionStyle,
      transitionDuration: request.settings.transitionDuration,
    },
  }
}

// ============================================================================
// API Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id || session?.user?.email
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      )
    }

    const body = await request.json() as SceneAnimaticRequest

    // Validate required fields
    if (!body.projectId) {
      return NextResponse.json(
        { error: 'Missing required field: projectId' },
        { status: 400 }
      )
    }

    if (!body.sceneId) {
      return NextResponse.json(
        { error: 'Missing required field: sceneId' },
        { status: 400 }
      )
    }

    if (!body.segments || body.segments.length === 0) {
      return NextResponse.json(
        { error: 'Missing required field: segments (must be a non-empty array)' },
        { status: 400 }
      )
    }

    // Validate all segments have image URLs
    const invalidSegments = body.segments.filter(s => !s.imageUrl)
    if (invalidSegments.length > 0) {
      return NextResponse.json(
        { error: `${invalidSegments.length} segment(s) missing imageUrl` },
        { status: 400 }
      )
    }

    // Check if Cloud Run is configured
    if (!isCloudRunJobsEnabled()) {
      return NextResponse.json(
        { 
          error: 'Cloud Run rendering not configured',
          code: 'RENDER_NOT_CONFIGURED',
          details: 'Set GCS_RENDER_BUCKET, CLOUD_RUN_JOB_NAME, and CLOUD_RUN_REGION environment variables'
        },
        { status: 503 }
      )
    }

    // Generate IDs
    const jobId = uuidv4()
    const streamId = `animatic-${body.language}-${Date.now()}`
    
    // Calculate source hash for staleness detection
    const audioUrls = body.audioClips.map(c => c.url).filter(Boolean)
    const sourceHash = calculateSourceHash(body.segments, audioUrls)

    console.log(`[Scene Animatic] Starting render for scene ${body.sceneId}`)
    console.log(`[Scene Animatic] Job ID: ${jobId}, Stream ID: ${streamId}`)
    console.log(`[Scene Animatic] Segments: ${body.segments.length}, Audio clips: ${body.audioClips.length}`)
    console.log(`[Scene Animatic] Settings: ${JSON.stringify(body.settings)}`)

    // Build job spec
    const jobSpec = buildSceneAnimaticJobSpec(jobId, body)

    // Upload job spec to GCS
    const specPath = await uploadJobSpec(jobSpec)
    console.log(`[Scene Animatic] Job spec uploaded to: ${specPath}`)

    // Calculate estimated duration (animatic is fast: ~1:1 ratio)
    const totalDuration = body.segments.reduce((max, seg) => 
      Math.max(max, seg.startTime + seg.duration), 0
    )
    const estimatedRenderTime = 10 + (totalDuration * 0.5) // 10s overhead + 0.5x duration

    // Create RenderJob record in database
    try {
      await RenderJob.create({
        id: jobId,
        project_id: body.projectId,
        scene_id: body.sceneId,
        user_id: userId,
        status: 'QUEUED',
        progress: 0,
        resolution: body.resolution,
        language: body.language,
        include_subtitles: body.settings.includeSubtitles,
        render_type: 'scene_animatic',
        stream_type: 'animatic',
        estimated_duration: totalDuration,
      })
      console.log(`[Scene Animatic] RenderJob record created: ${jobId}`)
    } catch (dbError) {
      // Non-blocking: continue even if DB insert fails
      // The render will still work, just won't have tracking
      console.error(`[Scene Animatic] Failed to create RenderJob record:`, dbError)
    }

    // Trigger Cloud Run Job
    try {
      await triggerCloudRunJob(jobId, specPath)
      console.log(`[Scene Animatic] Cloud Run job triggered: ${jobId}`)
    } catch (triggerError) {
      console.error(`[Scene Animatic] Failed to trigger Cloud Run job:`, triggerError)
      
      // Update job status to failed
      await RenderJob.update(
        { status: 'FAILED', error: String(triggerError) },
        { where: { id: jobId } }
      )
      
      return NextResponse.json(
        { 
          error: 'Failed to start render job',
          details: String(triggerError)
        },
        { status: 500 }
      )
    }

    // Return success response
    const response: SceneAnimaticResponse = {
      success: true,
      jobId,
      streamId,
      status: 'queued',
      message: 'Scene animatic render job queued',
      estimatedDuration: totalDuration,
      sourceHash,
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('[Scene Animatic] Unexpected error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// GET - Check if scene animatic rendering is available
// ============================================================================

export async function GET() {
  return NextResponse.json({
    available: isCloudRunJobsEnabled(),
    features: {
      kenBurns: ['off', 'subtle', 'medium', 'dramatic'],
      transitions: ['cut', 'crossfade', 'fade-to-black'],
      resolutions: ['720p', '1080p', '4K'],
      subtitles: false, // Not yet implemented
    },
  })
}
