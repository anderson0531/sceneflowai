import { NextRequest, NextResponse } from 'next/server'

export interface VideoStatusRequest {
  generationId: string
  userId: string
}

export interface VideoStatusResponse {
  success: boolean
  generationId?: string
  clips?: Array<{
    scene_number: number
    clip_id: string
    status: 'queued' | 'rendering' | 'done' | 'failed'
    progress?: number
    estimated_completion?: Date
    error?: string
    video_url?: string
    thumbnail_url?: string
  }>
  overallStatus?: 'queued' | 'rendering' | 'done' | 'failed'
  progress?: number
  estimated_completion?: Date
  error?: string
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: VideoStatusRequest = await request.json()
    const { generationId, userId } = body

    if (!generationId || !userId) {
      return NextResponse.json({
        success: false,
        error: 'Generation ID and user ID are required'
      }, { status: 400 })
    }

    // In production, this would query the database for actual status
    // For demo purposes, we'll simulate status updates
    
    // Simulate different stages of video generation
    const simulatedClips = await simulateVideoGenerationStatus(generationId)
    
    // Calculate overall status and progress
    const totalClips = simulatedClips.length
    const completedClips = simulatedClips.filter(clip => clip.status === 'done').length
    const failedClips = simulatedClips.filter(clip => clip.status === 'failed').length
    const inProgressClips = simulatedClips.filter(clip => clip.status === 'rendering').length
    
    let overallStatus: 'queued' | 'rendering' | 'done' | 'failed'
    let progress = 0
    let estimated_completion = null
    
    if (failedClips > 0 && completedClips === 0) {
      overallStatus = 'failed'
      progress = 0
    } else if (completedClips === totalClips) {
      overallStatus = 'done'
      progress = 100
    } else if (inProgressClips > 0 || completedClips > 0) {
      overallStatus = 'rendering'
      progress = Math.round((completedClips / totalClips) * 100)
      // Estimate completion time based on progress
      const estimatedTimePerClip = 30 // seconds
      const remainingClips = totalClips - completedClips
      const estimatedSeconds = remainingClips * estimatedTimePerClip
      estimated_completion = new Date(Date.now() + estimatedSeconds * 1000)
    } else {
      overallStatus = 'queued'
      progress = 0
    }

    return NextResponse.json({
      success: true,
      generationId,
      clips: simulatedClips,
      overallStatus,
      progress,
      estimated_completion
    })

  } catch (error) {
    console.error('Video status check error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}

// Simulate video generation status updates
async function simulateVideoGenerationStatus(generationId: string) {
  // In production, this would return actual status from the database
  // For demo purposes, we'll simulate realistic generation progress
  
  const baseTime = Date.now()
  const clips = []
  
  for (let i = 1; i <= 5; i++) { // Simulate 5 scenes
    const clipId = `clip_${generationId}_${i}`
    const startTime = baseTime + (i - 1) * 10000 // Stagger start times
    
    // Simulate different stages based on time
    const elapsed = Date.now() - startTime
    let status: 'queued' | 'rendering' | 'done' | 'failed'
    let progress = 0
    let estimated_completion = null
    let video_url = null
    let thumbnail_url = null
    let error = null
    
    if (elapsed < 0) {
      // Not started yet
      status = 'queued'
      progress = 0
    } else if (elapsed < 15000) {
      // Rendering phase
      status = 'rendering'
      progress = Math.min(90, Math.round((elapsed / 15000) * 90))
      estimated_completion = new Date(startTime + 15000)
    } else if (elapsed < 20000) {
      // Finalizing phase
      status = 'rendering'
      progress = Math.min(99, 90 + Math.round(((elapsed - 15000) / 5000) * 9))
      estimated_completion = new Date(startTime + 20000)
    } else {
      // Completed
      status = 'done'
      progress = 100
      video_url = `https://example.com/videos/${clipId}.mp4`
      thumbnail_url = `https://example.com/thumbnails/${clipId}.jpg`
    }
    
    // Simulate occasional failures
    if (i === 3 && elapsed > 10000 && elapsed < 15000) {
      status = 'failed'
      progress = 0
      error = 'Generation failed due to content policy violation'
    }
    
    clips.push({
      scene_number: i,
      clip_id: clipId,
      status,
      progress,
      estimated_completion,
      error,
      video_url,
      thumbnail_url
    })
  }
  
  return clips
}
