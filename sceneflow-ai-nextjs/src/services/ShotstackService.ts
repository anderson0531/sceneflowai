import { VideoStitchRequest } from '@/app/api/video/stitch/route'

export interface ShotstackClip {
  asset: {
    type: 'video' | 'image' | 'audio'
    src: string
  }
  start: number
  length: number
  fit?: 'cover' | 'contain' | 'crop' | 'none'
  scale?: number
  position?: 'center' | 'top' | 'bottom' | 'left' | 'right'
  offset?: {
    x: number
    y: number
  }
  transition?: {
    in?: string
    out?: string
  }
  effect?: string
  filter?: string
  opacity?: number
  transform?: {
    rotate?: {
      angle: number
    }
  }
}

export interface ShotstackTrack {
  clips: ShotstackClip[]
}

export interface ShotstackTimeline {
  soundtrack?: {
    src: string
    effect?: 'fadeIn' | 'fadeOut' | 'fadeInOut'
  }
  background?: string
  fonts?: Array<{
    src: string
  }>
  tracks: ShotstackTrack[]
}

export interface ShotstackOutput {
  format: 'mp4' | 'gif' | 'jpg' | 'png' | 'bmp' | 'mp3'
  resolution: 'sd' | 'hd' | 'fhd' | '4k'
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:5' | '4:3'
  fps?: 24 | 25 | 30 | 60 | 120
  scaleTo?: 'sd' | 'hd' | 'fhd' | '4k'
  quality?: 'low' | 'medium' | 'high'
  repeat?: boolean
  range?: {
    start: number
    length: number
  }
  poster?: {
    capture: number
  }
  thumbnail?: {
    capture: number
    scale: number
  }
  destinations?: Array<{
    provider: 's3' | 'youtube' | 'vimeo' | 'soundcloud'
    options?: any
  }>
}

export interface ShotstackEdit {
  timeline: ShotstackTimeline
  output: ShotstackOutput
  callback?: string
}

export class ShotstackService {
  private apiKey: string
  private apiUrl: string

  constructor() {
    this.apiKey = process.env.SHOTSTACK_API_KEY || ''
    this.apiUrl = process.env.SHOTSTACK_API_URL || 'https://api.shotstack.io/stage'
  }

  private mapClipsToTimeline(clips: VideoStitchRequest['clips']): ShotstackTimeline {
    let currentTime = 0
    const videoClips: ShotstackClip[] = clips
      .sort((a, b) => a.scene_number - b.scene_number)
      .map((clip) => {
        const videoClip: ShotstackClip = {
          asset: {
            type: 'video',
            src: clip.video_url,
          },
          start: currentTime,
          length: clip.duration,
          fit: 'cover',
          transition: {
            in: 'fade',
            out: 'fade'
          }
        }
        currentTime += clip.duration
        return videoClip
      })

    return {
      tracks: [
        { clips: videoClips }, // Video track
      ],
    }
  }

  async assembleVideo(
    clips: VideoStitchRequest['clips'],
    outputSettings: VideoStitchRequest['outputSettings']
  ): Promise<{ id: string; message: string; success: boolean }> {
    if (!this.apiKey) {
      throw new Error('SHOTSTACK_API_KEY is not configured')
    }

    const timeline = this.mapClipsToTimeline(clips)

    const resolutionMap: Record<string, 'sd' | 'hd' | 'fhd' | '4k'> = {
      '720p': 'hd',
      '1080p': 'fhd',
      '4k': '4k',
    }

    const edit: ShotstackEdit = {
      timeline,
      output: {
        format: 'mp4',
        resolution: resolutionMap[outputSettings.resolution] || 'sd',
        fps: parseInt(outputSettings.frameRate) as 24 | 30 | 60 || 30,
        quality: outputSettings.quality === 'ultra' ? 'high' : outputSettings.quality === 'high' ? 'medium' : 'low'
      },
    }

    try {
      const response = await fetch(`${this.apiUrl}/render`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify(edit),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Shotstack API error: ${response.status} ${errorText}`)
      }

      const data = await response.json()
      return data.response
    } catch (error) {
      console.error('Shotstack render failed:', error)
      throw error
    }
  }

  async getRenderStatus(renderId: string): Promise<{
    status: 'queued' | 'fetching' | 'rendering' | 'saving' | 'done' | 'failed'
    url?: string
    error?: string
    data?: any
  }> {
    if (!this.apiKey) {
      throw new Error('SHOTSTACK_API_KEY is not configured')
    }

    try {
      const response = await fetch(`${this.apiUrl}/render/${renderId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Shotstack API error: ${response.status} ${errorText}`)
      }

      const data = await response.json()
      const status = data.response.status
      
      return {
        status,
        url: data.response.url,
        error: data.response.error,
        data: data.response
      }
    } catch (error) {
      console.error('Shotstack status check failed:', error)
      throw error
    }
  }
}

export const shotstackService = new ShotstackService()
