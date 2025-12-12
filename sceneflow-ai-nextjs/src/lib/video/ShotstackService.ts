/**
 * Shotstack Video Export Service
 * 
 * Converts SceneFlow animatic data to Shotstack Edit JSON format
 * and handles video rendering API calls.
 * 
 * @see https://shotstack.io/docs/api/
 */

import { KeyframePanDirection, SegmentKeyframeSettings } from '@/components/vision/scene-production/types'

// Shotstack API Configuration
const SHOTSTACK_API_BASE = process.env.SHOTSTACK_ENV === 'production'
  ? 'https://api.shotstack.io/v1'
  : 'https://api.shotstack.io/stage'

const SHOTSTACK_API_KEY = process.env.SHOTSTACK_API_KEY || ''

// Shotstack Types
export interface ShotstackAsset {
  type: 'video' | 'image' | 'audio' | 'html'
  src: string
}

export interface ShotstackClip {
  asset: ShotstackAsset
  start: number
  length: number
  fit?: 'crop' | 'cover' | 'contain'
  scale?: number
  position?: 'center' | 'top' | 'topRight' | 'right' | 'bottomRight' | 'bottom' | 'bottomLeft' | 'left' | 'topLeft'
  effect?: string // Ken Burns effects: zoomIn, zoomOut, slideLeft, slideRight, etc.
  transition?: {
    in?: string
    out?: string
  }
}

export interface ShotstackTrack {
  clips: ShotstackClip[]
}

export interface ShotstackTimeline {
  background?: string
  tracks: ShotstackTrack[]
}

export interface ShotstackOutput {
  format: 'mp4' | 'gif' | 'jpg' | 'png'
  resolution: 'sd' | 'hd' | '1080' | '4k'
  fps?: number
  quality?: 'low' | 'medium' | 'high'
}

export interface ShotstackEdit {
  timeline: ShotstackTimeline
  output: ShotstackOutput
}

export interface ShotstackRenderResponse {
  success: boolean
  message: string
  response: {
    id: string
    message: string
  }
}

export interface ShotstackStatusResponse {
  success: boolean
  message: string
  response: {
    id: string
    status: 'queued' | 'fetching' | 'rendering' | 'saving' | 'done' | 'failed'
    url?: string
    error?: string
    poster?: string
    thumbnail?: string
  }
}

// Ken Burns Direction to Shotstack Effect Mapping
const KEYFRAME_TO_SHOTSTACK_EFFECT: Record<KeyframePanDirection, string> = {
  'none': 'zoomIn',        // Default subtle zoom
  'in': 'zoomIn',
  'out': 'zoomOut',
  'left': 'slideLeft',
  'right': 'slideRight',
  'up': 'slideUp',
  'down': 'slideDown',
  'up-left': 'slideLeft',   // Combine would need custom transform
  'up-right': 'slideRight',
  'down-left': 'slideLeft',
  'down-right': 'slideRight',
}

export interface SceneSegmentForExport {
  segmentId: string
  startTime: number
  endTime: number
  activeAssetUrl?: string | null
  keyframeSettings?: SegmentKeyframeSettings
  assetType?: 'video' | 'image' | null
}

export interface ExportOptions {
  resolution: 'hd' | '1080' | '4k'
  fps: number
  includeAudio: boolean
  audioTracks?: {
    narration?: string
    music?: string
    dialogue?: string[]
  }
}

/**
 * Convert SceneFlow keyframe settings to Shotstack effect string
 */
export function getEffectFromKeyframes(keyframes?: SegmentKeyframeSettings): string {
  if (!keyframes) return 'zoomIn' // Default effect
  
  if (keyframes.useAutoDetect) {
    // For auto-detect, use zoom based on zoom values
    if (keyframes.zoomEnd > keyframes.zoomStart) {
      return 'zoomIn'
    } else if (keyframes.zoomEnd < keyframes.zoomStart) {
      return 'zoomOut'
    }
    return 'zoomIn'
  }
  
  // Use direction preset if available
  if (keyframes.direction && keyframes.direction !== 'none') {
    return KEYFRAME_TO_SHOTSTACK_EFFECT[keyframes.direction] || 'zoomIn'
  }
  
  // Default to zoom based on zoom values
  if (keyframes.zoomEnd > keyframes.zoomStart) {
    return 'zoomIn'
  } else if (keyframes.zoomEnd < keyframes.zoomStart) {
    return 'zoomOut'
  }
  
  return 'zoomIn'
}

/**
 * Build Shotstack Edit JSON from segments and audio
 */
export function buildShotstackEdit(
  segments: SceneSegmentForExport[],
  options: ExportOptions
): ShotstackEdit {
  // Build visual track clips
  const visualClips: ShotstackClip[] = segments
    .filter(seg => seg.activeAssetUrl)
    .map(seg => {
      const duration = seg.endTime - seg.startTime
      const effect = getEffectFromKeyframes(seg.keyframeSettings)
      const isVideo = seg.assetType === 'video'
      
      return {
        asset: {
          type: isVideo ? 'video' : 'image',
          src: seg.activeAssetUrl!,
        },
        start: seg.startTime,
        length: duration,
        fit: 'cover',
        effect: isVideo ? undefined : effect, // Ken Burns only for images
        transition: {
          in: 'fade',
          out: 'fade',
        },
      } as ShotstackClip
    })

  // Build tracks array (visual first, then audio)
  const tracks: ShotstackTrack[] = [{ clips: visualClips }]

  // Add audio tracks if provided
  if (options.includeAudio && options.audioTracks) {
    // Narration track
    if (options.audioTracks.narration) {
      tracks.push({
        clips: [{
          asset: { type: 'audio', src: options.audioTracks.narration },
          start: 0,
          length: segments[segments.length - 1]?.endTime || 0,
        }],
      })
    }

    // Music track
    if (options.audioTracks.music) {
      tracks.push({
        clips: [{
          asset: { type: 'audio', src: options.audioTracks.music },
          start: 0,
          length: segments[segments.length - 1]?.endTime || 0,
        }],
      })
    }

    // Dialogue tracks
    if (options.audioTracks.dialogue?.length) {
      options.audioTracks.dialogue.forEach(url => {
        tracks.push({
          clips: [{
            asset: { type: 'audio', src: url },
            start: 0, // Would need proper timing per dialogue clip
            length: 5, // Placeholder duration
          }],
        })
      })
    }
  }

  return {
    timeline: {
      background: '#000000',
      tracks,
    },
    output: {
      format: 'mp4',
      resolution: options.resolution,
      fps: options.fps,
      quality: 'high',
    },
  }
}

/**
 * Submit render job to Shotstack API
 */
export async function submitRender(edit: ShotstackEdit): Promise<ShotstackRenderResponse> {
  if (!SHOTSTACK_API_KEY) {
    throw new Error('SHOTSTACK_API_KEY not configured')
  }

  const response = await fetch(`${SHOTSTACK_API_BASE}/render`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': SHOTSTACK_API_KEY,
    },
    body: JSON.stringify(edit),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Shotstack render failed: ${error}`)
  }

  return response.json()
}

/**
 * Check render status
 */
export async function getRenderStatus(renderId: string): Promise<ShotstackStatusResponse> {
  if (!SHOTSTACK_API_KEY) {
    throw new Error('SHOTSTACK_API_KEY not configured')
  }

  const response = await fetch(`${SHOTSTACK_API_BASE}/render/${renderId}`, {
    method: 'GET',
    headers: {
      'x-api-key': SHOTSTACK_API_KEY,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Shotstack status check failed: ${error}`)
  }

  return response.json()
}
