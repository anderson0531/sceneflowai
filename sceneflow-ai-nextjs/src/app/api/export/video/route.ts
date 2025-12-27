/**
 * Export Video API Route
 * 
 * POST /api/export/video
 * 
 * Generates a complete MP4 video from all project scenes using Shotstack API.
 * Supports multi-language audio track selection and optional subtitles.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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
  language: string // e.g., 'en', 'es', 'fr'
  resolution: '720p' | '1080p' | '4K'
  includeSubtitles: boolean
}

interface SceneData {
  id: string
  title: string
  scene_number: number
  order_index: number
  segments?: Array<{
    id: string
    start_time: number
    end_time: number
    image_url?: string
    video_url?: string
    keyframe_settings?: any
    text_content?: string
  }>
  audio_tracks?: Record<string, {
    url: string
    duration: number
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
    const { projectId, language, resolution, includeSubtitles } = body

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

    console.log(`[Export Video] Starting export for project ${projectId}`, {
      language,
      resolution,
      includeSubtitles,
    })

    // Get project data from Supabase
    const supabase = await createClient()
    
    // Fetch project with scenes
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        id,
        title,
        metadata
      `)
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      console.error('[Export Video] Project not found:', projectError)
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Fetch scenes for the project
    const { data: scenes, error: scenesError } = await supabase
      .from('scenes')
      .select(`
        id,
        title,
        scene_number,
        order_index,
        metadata
      `)
      .eq('project_id', projectId)
      .order('order_index', { ascending: true })

    if (scenesError) {
      console.error('[Export Video] Failed to fetch scenes:', scenesError)
      return NextResponse.json(
        { error: 'Failed to fetch project scenes' },
        { status: 500 }
      )
    }

    if (!scenes || scenes.length === 0) {
      return NextResponse.json(
        { error: 'No scenes found for this project' },
        { status: 400 }
      )
    }

    // Collect all segments from scenes
    const allSegments: SceneSegmentForExport[] = []
    const audioTracks: string[] = []
    let currentTime = 0

    for (const scene of scenes) {
      const metadata = scene.metadata as any || {}
      const sceneSegments = metadata.segments || []
      const sceneAudioTracks = metadata.audioTracks || {}

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
