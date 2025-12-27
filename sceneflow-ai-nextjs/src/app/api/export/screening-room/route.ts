/**
 * Screening Room Export API Route
 * 
 * POST /api/export/screening-room
 * 
 * Generates an MP4 video from Screening Room scenes using Shotstack API.
 * This route is designed for the simpler scene format used in the Screening Room,
 * where each scene has a single image and audio tracks, rather than the
 * production segment format with video keyframes.
 * 
 * Scene data structure:
 * - imageUrl: The generated scene image
 * - narrationAudioUrl: Scene narration audio
 * - narration_audio: Alternative field for narration audio (multi-language object)
 * - dialogueAudio: Object with language codes as keys { en: [{ audioUrl, text }] }
 * - musicAudio: Background music URL
 * - duration: Scene duration in seconds
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

interface DialogueAudioEntry {
  audioUrl?: string
  audio_url?: string
  text?: string
  character?: string
  duration?: number
}

interface ScreeningRoomScene {
  id?: string
  sceneId?: string
  heading?: string | { text: string }
  imageUrl?: string
  image_url?: string
  narrationAudioUrl?: string
  narration_audio?: Record<string, string> // Multi-language: { en: 'url', es: 'url' }
  dialogueAudio?: Record<string, DialogueAudioEntry[]> // { en: [{ audioUrl, text }] }
  dialogue_audio?: Record<string, DialogueAudioEntry[]>
  musicAudio?: string
  music_audio?: string
  sfxAudio?: string[]
  sfx_audio?: string[]
  duration?: number
  narration?: string
  dialogue?: Array<{ character?: string; text?: string }>
}

interface ExportScreeningRoomRequest {
  projectId: string
  projectTitle?: string
  language: string // e.g., 'en', 'es', 'fr'
  resolution: '720p' | '1080p' | '4K'
  includeSubtitles: boolean
  scenes: ScreeningRoomScene[]
}

// Map resolution to Shotstack format
const RESOLUTION_MAP: Record<string, 'hd' | '1080' | '4k'> = {
  '720p': 'hd',
  '1080p': '1080',
  '4K': '4k',
}

// Default scene duration if not specified (in seconds)
const DEFAULT_SCENE_DURATION = 5

export async function POST(req: NextRequest) {
  try {
    const body: ExportScreeningRoomRequest = await req.json()
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

    console.log(`[Screening Room Export] Starting export for project ${projectId}`, {
      projectTitle,
      language,
      resolution,
      includeSubtitles,
      sceneCount: scenes.length,
    })

    // Collect segments and audio from scenes
    const segments: SceneSegmentForExport[] = []
    const audioTracks: string[] = []
    let currentTime = 0

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i]
      
      // Get image URL (try multiple possible field names)
      const imageUrl = scene.imageUrl || scene.image_url
      
      if (!imageUrl) {
        console.log(`[Screening Room Export] Scene ${i + 1} has no image, skipping`)
        continue
      }

      // Calculate scene duration
      // Priority: explicit duration > narration audio duration estimate > default
      let sceneDuration = scene.duration || DEFAULT_SCENE_DURATION
      
      // If duration is very short, use default
      if (sceneDuration < 1) {
        sceneDuration = DEFAULT_SCENE_DURATION
      }

      // Get narration audio URL for selected language
      let narrationUrl: string | null = null
      
      // Check multi-language narration audio object
      if (scene.narration_audio && typeof scene.narration_audio === 'object') {
        narrationUrl = scene.narration_audio[language] || scene.narration_audio['en'] || null
      }
      
      // Fallback to single narrationAudioUrl (typically English)
      if (!narrationUrl && scene.narrationAudioUrl) {
        narrationUrl = scene.narrationAudioUrl
      }

      // Get dialogue audio for selected language
      const dialogueAudio = scene.dialogueAudio || scene.dialogue_audio
      const dialogueEntries = dialogueAudio?.[language] || dialogueAudio?.['en'] || []
      
      // Collect all audio URLs for this scene
      if (narrationUrl) {
        audioTracks.push(narrationUrl)
      }
      
      for (const entry of dialogueEntries) {
        const dialogueUrl = entry.audioUrl || entry.audio_url
        if (dialogueUrl) {
          audioTracks.push(dialogueUrl)
        }
      }

      // Create segment for this scene
      segments.push({
        segmentId: scene.id || scene.sceneId || `scene-${i + 1}`,
        startTime: currentTime,
        endTime: currentTime + sceneDuration,
        activeAssetUrl: imageUrl,
        assetType: 'image',
        keyframeSettings: {
          // Ken Burns effect settings for static images
          scale: { start: 1.0, end: 1.1 },
          position: { 
            start: { x: 0, y: 0 }, 
            end: { x: 0.05, y: 0.05 } 
          },
        },
      })

      currentTime += sceneDuration
    }

    if (segments.length === 0) {
      return NextResponse.json(
        { error: 'No scenes with images found. Generate visuals for your scenes first.' },
        { status: 400 }
      )
    }

    console.log(`[Screening Room Export] Collected segments and audio`, {
      segmentCount: segments.length,
      audioTrackCount: audioTracks.length,
      totalDuration: currentTime,
    })

    // Build export options
    const exportOptions: ExportOptions = {
      resolution: RESOLUTION_MAP[resolution] || '1080',
      fps: 24,
      includeAudio: true,
      audioTracks: {
        narration: audioTracks[0], // Primary audio track
      },
    }

    // Build Shotstack edit JSON
    const edit = buildShotstackEdit(segments, exportOptions)

    console.log('[Screening Room Export] Built Shotstack edit:', {
      tracks: edit.timeline.tracks.length,
      visualClips: edit.timeline.tracks[0]?.clips.length || 0,
      resolution: edit.output.resolution,
      fps: edit.output.fps,
    })

    // Check if Shotstack API key is configured
    if (!process.env.SHOTSTACK_API_KEY) {
      console.log('[Screening Room Export] Preview mode - SHOTSTACK_API_KEY not configured')
      return NextResponse.json({
        success: true,
        preview: true,
        message: 'Shotstack API key not configured. Export preview generated.',
        edit,
        stats: {
          segmentCount: segments.length,
          totalDuration: currentTime,
          language,
          resolution,
        },
      })
    }

    // Submit render job to Shotstack
    const renderResponse = await submitRender(edit)

    console.log('[Screening Room Export] Render job submitted:', {
      renderId: renderResponse.response.id,
      message: renderResponse.message,
    })

    return NextResponse.json({
      success: true,
      renderId: renderResponse.response.id,
      message: 'Render job submitted successfully',
      estimatedDuration: currentTime,
      stats: {
        segmentCount: segments.length,
        totalDuration: currentTime,
        language,
        resolution,
      },
    })
  } catch (error: any) {
    console.error('[Screening Room Export] Error:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to export video',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
