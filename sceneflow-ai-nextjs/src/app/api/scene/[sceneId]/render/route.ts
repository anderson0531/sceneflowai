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
import { uploadJobSpec, getOutputPath } from '@/lib/gcs/renderStorage'

// Environment configuration
const CALLBACK_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sceneflowai.studio'

// In-memory job status store (replace with database for production)
const jobStatusStore = new Map<string, {
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  progress: number
  downloadUrl?: string
  error?: string
  createdAt: string
}>()

/**
 * POST - Create a new scene render job
 */
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
    
    // Build video segments for job spec
    const videoSegments: SceneRenderVideoSegment[] = body.segments.map((seg, idx) => ({
      segmentId: seg.segmentId,
      sequenceIndex: seg.sequenceIndex,
      videoUrl: seg.videoUrl,
      startTime: seg.startTime,
      duration: seg.endTime - seg.startTime,
    }))
    
    // Build audio clips from selected tracks
    const audioClips: SceneRenderAudioClip[] = []
    
    // Add narration
    if (body.audioConfig.includeNarration && body.audioTracks.narration) {
      for (const track of body.audioTracks.narration) {
        audioClips.push({
          url: track.url,
          startTime: track.startTime,
          duration: track.duration,
          volume: 0.8,
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
          volume: 0.9,
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
          volume: 0.5,
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
          volume: 0.6,
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
    }
    
    console.log(`[SceneRender] Job spec created:`, {
      jobId,
      videoSegments: videoSegments.length,
      audioClips: audioClips.length,
      totalDuration,
      resolution: body.resolution,
    })
    
    // Store initial job status
    jobStatusStore.set(jobId, {
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
    
    // TODO: Trigger Cloud Run Job
    // For now, we'll just log and return queued status
    // The actual Cloud Run job triggering will be implemented when we update the FFmpeg container
    console.log(`[SceneRender] Ready to trigger Cloud Run job: ${jobSpecPath}`)
    
    return NextResponse.json({
      success: true,
      jobId,
      status: 'QUEUED',
      message: 'Scene render job queued successfully',
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
    const jobStatus = jobStatusStore.get(jobId)
    
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
    
    return NextResponse.json({
      success: true,
      jobId,
      status: jobStatus.status,
      progress: jobStatus.progress,
      downloadUrl: jobStatus.downloadUrl,
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
