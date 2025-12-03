import { NextRequest, NextResponse } from 'next/server'
import { shotstackService } from '@/services/ShotstackService'

export interface VideoStitchRequest {
  generationId: string
  userId: string
  clips: Array<{
    scene_number: number
    clip_id: string
    video_url: string
    duration: number
  }>
  outputSettings: {
    format: 'mp4' | 'mov' | 'webm'
    quality: 'standard' | 'high' | 'ultra'
    frameRate: '24' | '30' | '60'
    resolution: '720p' | '1080p' | '4k'
  }
}

export interface VideoStitchResponse {
  success: boolean
  stitchId?: string
  status?: 'queued' | 'processing' | 'completed' | 'failed'
  progress?: number
  estimated_completion?: Date
  final_video_url?: string
  thumbnail_url?: string
  error?: string
  metadata?: {
    totalDuration: number
    totalClips: number
    outputFormat: string
    outputQuality: string
    stitchStartedAt: Date
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: VideoStitchRequest = await request.json()
    const { generationId, userId, clips, outputSettings } = body

    if (!generationId || !userId || !clips || clips.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Generation ID, user ID, and clips are required'
      }, { status: 400 })
    }

    // Validate that all clips are completed
    const incompleteClips = clips.filter(clip => !clip.video_url)
    if (incompleteClips.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Cannot stitch video: some clips are not yet completed',
        incompleteClips: incompleteClips.map(clip => clip.scene_number)
      }, { status: 400 })
    }

    // Call Shotstack service to assemble video
    const result = await shotstackService.assembleVideo(body)

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to start video rendering'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      stitchId: result.renderId,
      status: 'queued',
      message: result.message,
      metadata: {
        totalDuration: clips.reduce((sum, clip) => sum + clip.duration, 0),
        totalClips: clips.length,
        outputFormat: outputSettings.format,
        outputQuality: outputSettings.quality,
        stitchStartedAt: new Date()
      }
    })

  } catch (error) {
    console.error('Video stitching error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}

// GET endpoint to check stitching status
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const stitchId = searchParams.get('stitchId')
    const userId = searchParams.get('userId')

    if (!stitchId || !userId) {
      return NextResponse.json({
        success: false,
        error: 'Stitch ID and user ID are required'
      }, { status: 400 })
    }

    // Check status with Shotstack
    const status = await shotstackService.getRenderStatus(stitchId)
    
    let mappedStatus = 'queued';
    if (status.status === 'rendering' || status.status === 'saving') {
      mappedStatus = 'processing';
    } else if (status.status === 'done') {
      mappedStatus = 'completed';
    } else if (status.status === 'failed') {
      mappedStatus = 'failed';
    }

    return NextResponse.json({
      success: true,
      stitchId,
      status: mappedStatus,
      progress: status.status === 'done' ? 100 : (status.status === 'rendering' || status.status === 'saving' ? 50 : 0),
      final_video_url: status.url,
      thumbnail_url: status.poster,
      error: status.error
    })

  } catch (error) {
    console.error('Stitching status check error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}
