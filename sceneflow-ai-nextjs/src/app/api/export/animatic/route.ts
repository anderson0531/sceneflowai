/**
 * Export Animatic API Route
 * 
 * POST /api/export/animatic
 * 
 * Generates an MP4 video from scene segments using Shotstack API.
 * Applies Ken Burns animations based on keyframe settings.
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  buildShotstackEdit,
  submitRender,
  ExportOptions,
  SceneSegmentForExport,
} from '@/lib/video/ShotstackService'

export const maxDuration = 60
export const runtime = 'nodejs'

interface ExportAnimaticRequest {
  projectId: string
  sceneId: string
  segments: SceneSegmentForExport[]
  options?: Partial<ExportOptions>
  audioTracks?: {
    narration?: string
    music?: string
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: ExportAnimaticRequest = await req.json()
    const { projectId, sceneId, segments, options, audioTracks } = body

    if (!projectId || !sceneId) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId and sceneId' },
        { status: 400 }
      )
    }

    if (!segments || segments.length === 0) {
      return NextResponse.json(
        { error: 'No segments provided for export' },
        { status: 400 }
      )
    }

    // Filter segments with valid assets
    const validSegments = segments.filter(seg => seg.activeAssetUrl)
    
    if (validSegments.length === 0) {
      return NextResponse.json(
        { error: 'No segments have generated assets. Generate segment visuals first.' },
        { status: 400 }
      )
    }

    console.log(`[Export Animatic] Starting export for scene ${sceneId}`, {
      totalSegments: segments.length,
      validSegments: validSegments.length,
    })

    // Build export options with defaults
    const exportOptions: ExportOptions = {
      resolution: options?.resolution || '1080',
      fps: options?.fps || 24,
      includeAudio: options?.includeAudio ?? true,
      audioTracks: audioTracks,
    }

    // Build Shotstack edit JSON
    const edit = buildShotstackEdit(validSegments, exportOptions)

    console.log('[Export Animatic] Built Shotstack edit:', {
      tracks: edit.timeline.tracks.length,
      visualClips: edit.timeline.tracks[0]?.clips.length || 0,
      resolution: edit.output.resolution,
      fps: edit.output.fps,
    })

    // Check if Shotstack API key is configured
    if (!process.env.SHOTSTACK_API_KEY) {
      // Return preview mode response without actually rendering
      console.log('[Export Animatic] Preview mode - SHOTSTACK_API_KEY not configured')
      return NextResponse.json({
        success: true,
        preview: true,
        message: 'Shotstack API key not configured. Export preview generated.',
        edit,
        segments: validSegments.map(seg => ({
          segmentId: seg.segmentId,
          duration: seg.endTime - seg.startTime,
          hasAsset: !!seg.activeAssetUrl,
          effect: seg.keyframeSettings?.direction || 'auto',
        })),
      })
    }

    // Submit render job to Shotstack
    const renderResponse = await submitRender(edit)

    console.log('[Export Animatic] Render job submitted:', {
      renderId: renderResponse.response.id,
      message: renderResponse.message,
    })

    return NextResponse.json({
      success: true,
      renderId: renderResponse.response.id,
      message: 'Render job submitted successfully',
      estimatedDuration: validSegments.reduce((acc, seg) => acc + (seg.endTime - seg.startTime), 0),
    })
  } catch (error: any) {
    console.error('[Export Animatic] Error:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to export animatic',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
