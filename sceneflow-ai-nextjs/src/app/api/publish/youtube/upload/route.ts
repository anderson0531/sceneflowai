import { NextRequest, NextResponse } from 'next/server'
import '@/models'
import {
  uploadVideoToYouTube,
  uploadAudioTrackToYouTube,
  loadYouTubeTokens,
  MlaNotAvailableError,
} from '@/lib/publish/youtubeClient'
import { resolveUserId } from '@/lib/userHelper'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export type AudioTrackUploadStatus = 'uploaded' | 'manual_required' | 'error'

export interface AudioTrackResult {
  languageCode: string
  status: AudioTrackUploadStatus
  audioUrl: string
  error?: string
}

export async function GET(req: NextRequest) {
  try {
    const userIdParam = req.nextUrl.searchParams.get('userId')
    if (!userIdParam) {
      return NextResponse.json({ connected: false })
    }
    const userId = await resolveUserId(userIdParam)
    const tokens = await loadYouTubeTokens(userId)
    return NextResponse.json({ connected: !!tokens?.access_token })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ connected: false, error: message })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      userId: userIdParam,
      videoUrl,
      title,
      description,
      privacyStatus = 'private',
      language = 'en',
      audioTracks = [],
    } = body as {
      userId?: string
      videoUrl?: string
      title?: string
      description?: string
      privacyStatus?: 'private' | 'unlisted' | 'public'
      language?: string
      audioTracks?: Array<{ languageCode: string; audioUrl: string }>
    }

    if (!userIdParam || !videoUrl || !title) {
      return NextResponse.json({ error: 'userId, videoUrl, and title are required' }, { status: 400 })
    }

    const userId = await resolveUserId(userIdParam)
    const result = await uploadVideoToYouTube(userId, {
      videoUrl,
      title,
      description: description || '',
      privacyStatus,
      language,
    })

    const trackResults: AudioTrackResult[] = []

    for (const track of audioTracks) {
      if (!track.languageCode || !track.audioUrl) continue
      try {
        await uploadAudioTrackToYouTube(userId, {
          videoId: result.videoId,
          languageCode: track.languageCode,
          audioUrl: track.audioUrl,
        })
        trackResults.push({
          languageCode: track.languageCode,
          status: 'uploaded',
          audioUrl: track.audioUrl,
        })
      } catch (err: unknown) {
        if (err instanceof MlaNotAvailableError) {
          trackResults.push({
            languageCode: track.languageCode,
            status: 'manual_required',
            audioUrl: track.audioUrl,
            error: err.message,
          })
        } else {
          trackResults.push({
            languageCode: track.languageCode,
            status: 'error',
            audioUrl: track.audioUrl,
            error: err instanceof Error ? err.message : 'Upload failed',
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      ...result,
      audioTracks: trackResults,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload failed'
    console.error('[YouTube Upload]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
