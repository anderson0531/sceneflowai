/**
 * Export Video API Route
 * 
 * POST /api/export/video
 * 
 * Generates a complete MP4 video from all project scenes using Shotstack API.
 * Supports multi-language audio track selection and optional subtitles.
 * 
 * NOTE: Project/scene data is passed from the client since we use client-side
 * state management rather than server-side database queries.
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

interface ExportVideoRequest {
  projectId: string
  projectTitle?: string
  language: string // e.g., 'en', 'es', 'fr'
  resolution: '720p' | '1080p' | '4K'
  includeSubtitles: boolean
  // Scene data passed from client
  scenes: Array<{
    id: string
    title?: string
    segments?: Array<{
      id?: string
      segmentId?: string
      startTime?: number
      endTime?: number
      start_time?: number
      end_time?: number
      activeAssetUrl?: string
      image_url?: string
      video_url?: string
      keyframeSettings?: any
      keyframe_settings?: any
      assetType?: 'video' | 'image'
      text_content?: string
    }>
    audioTracks?: Record<string, {
      url: string
      duration?: number
    }>
  }>
}

// Map resolution to Shotstack format
const RESOLUTION_MAP: Record<string, 'hd' | '1080' | '4k'> = {
  '720p': 'hd',
  '1080p': '1080',
  '4K': '4k',
}

export async function POST(req: NextRequest) {
  try {
    const body: ExportVideoRequest = await req.json()
    const { projectId, projectTitle, language, resolution, includeSubtitles, scenes } = body

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing required field: projectId' },
        { status: 400 }
      )
    }

    if (!language) {
      return NextResponse.json(
        { error: 'Missing required field: language' },
        { status: 400 }
      )
    }

    if (!scenes || scenes.length === 0) {
      return NextResponse.json(
        { error: 'No scenes provided for export' },
        { status: 400 }
      )
    }

    console.log(`[Export Video] Starting export for project ${projectId}`, {
      projectTitle,
      language,
      resolution,
      includeSubtitles,
      sceneCount: scenes.length,
    })

    // Collect all segments from scenes
    const allSegments: SceneSegmentForExport[] = []
    const audioTracks: string[] = []
    let currentTime = 0

    for (const scene of scenes) {
      const sceneSegments = scene.segments || []
      const sceneAudioTracks = scene.audioTracks || {}

      // Get audio track for selected language
      if (sceneAudioTracks[language]?.url) {
        audioTracks.push(sceneAudioTracks[language].url)
      }

      // Process segments
      for (const segment of sceneSegments) {
        if (!segment.activeAssetUrl && !segment.image_url && !segment.video_url) {
          continue // Skip segments without assets
        }

        const duration = (segment.endTime || segment.end_time || 4) - (segment.startTime || segment.start_time || 0)
        
        allSegments.push({
          segmentId: segment.id || segment.segmentId,
          startTime: currentTime,
          endTime: currentTime + duration,
          activeAssetUrl: segment.activeAssetUrl || segment.image_url || segment.video_url,
          keyframeSettings: segment.keyframeSettings || segment.keyframe_settings,
          assetType: segment.assetType || (segment.video_url ? 'video' : 'image'),
        })

        currentTime += duration
      }
    }

    if (allSegments.length === 0) {
      return NextResponse.json(
        { error: 'No segments with generated assets found. Generate visuals for your scenes first.' },
        { status: 400 }
      )
    }

    console.log(`[Export Video] Collected segments and audio`, {
      segmentCount: allSegments.length,
      audioTrackCount: audioTracks.length,
      totalDuration: currentTime,
    })

    // Build export options
    const exportOptions: ExportOptions = {
      resolution: RESOLUTION_MAP[resolution] || '1080',
      fps: 24,
      includeAudio: true,
      audioTracks: {
        narration: audioTracks[0], // Primary narration track
        // Additional tracks could be concatenated or mixed
      },
    }

    // Build Shotstack edit JSON
    const edit = buildShotstackEdit(allSegments, exportOptions)

    console.log('[Export Video] Built Shotstack edit:', {
      tracks: edit.timeline.tracks.length,
      visualClips: edit.timeline.tracks[0]?.clips.length || 0,
      resolution: edit.output.resolution,
      fps: edit.output.fps,
    })

    // Check if Shotstack API key is configured
    if (!process.env.SHOTSTACK_API_KEY) {
      console.log('[Export Video] Preview mode - SHOTSTACK_API_KEY not configured')
      return NextResponse.json({
        success: true,
        preview: true,
        message: 'Shotstack API key not configured. Export preview generated.',
        edit,
        stats: {
          segmentCount: allSegments.length,
          totalDuration: currentTime,
          language,
          resolution,
        },
      })
    }

    // Submit render job to Shotstack
    const renderResponse = await submitRender(edit)

    console.log('[Export Video] Render job submitted:', {
      renderId: renderResponse.response.id,
      message: renderResponse.message,
    })

    return NextResponse.json({
      success: true,
      renderId: renderResponse.response.id,
      message: 'Render job submitted successfully',
      estimatedDuration: currentTime,
      stats: {
        segmentCount: allSegments.length,
        totalDuration: currentTime,
        language,
        resolution,
      },
    })
  } catch (error: any) {
    console.error('[Export Video] Error:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to export video',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
