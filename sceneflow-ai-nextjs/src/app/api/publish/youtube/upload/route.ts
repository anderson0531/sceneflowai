import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import '@/models'
import { authOptions } from '@/lib/auth'
import {
  uploadVideoToYouTube,
  uploadAudioTrackToYouTube,
  setYouTubeVideoLocalizations,
  getYouTubeChannelProfile,
  disconnectYouTubeAccount,
  isYouTubeOAuthConfigured,
  youtubeRedirectUri,
  MlaNotAvailableError,
  type YouTubeVideoLocalizationEntry,
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

async function resolveSessionOrParamUserId(explicit?: string | null): Promise<string | null> {
  const trimmed = explicit?.trim()
  if (trimmed) {
    return resolveUserId(trimmed)
  }
  const session = await getServerSession(authOptions)
  const raw = session?.user?.id || session?.user?.email
  if (!raw) return null
  return resolveUserId(raw)
}

export async function GET(req: NextRequest) {
  try {
    const redirectUri = youtubeRedirectUri(req.nextUrl.origin)
    const userId = await resolveSessionOrParamUserId(req.nextUrl.searchParams.get('userId'))
    if (!userId) {
      const oauthConfigured = await isYouTubeOAuthConfigured()
      return NextResponse.json({ connected: false, oauthConfigured, redirectUri })
    }

    const [profileStatus, oauthConfigured] = await Promise.all([
      getYouTubeChannelProfile(userId),
      isYouTubeOAuthConfigured(userId),
    ])

    return NextResponse.json({
      connected: profileStatus.connected,
      needsReconnect: Boolean(profileStatus.needsReconnect),
      channel: profileStatus.channel ?? null,
      oauthConfigured,
      redirectUri,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const oauthConfigured = await isYouTubeOAuthConfigured().catch(() => false)
    return NextResponse.json({
      connected: false,
      oauthConfigured,
      redirectUri: youtubeRedirectUri(req.nextUrl.origin),
      error: message,
    })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await resolveSessionOrParamUserId(req.nextUrl.searchParams.get('userId'))
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    await disconnectYouTubeAccount(userId)
    return NextResponse.json({ success: true, connected: false })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to disconnect YouTube account'
    return NextResponse.json({ error: message }, { status: 500 })
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
      thumbnailUrl,
      tags,
      categoryId,
      madeForKids = false,
      localizations,
    } = body as {
      userId?: string
      videoUrl?: string
      title?: string
      description?: string
      privacyStatus?: 'private' | 'unlisted' | 'public'
      language?: string
      audioTracks?: Array<{ languageCode: string; audioUrl: string }>
      thumbnailUrl?: string
      tags?: string[]
      categoryId?: string
      madeForKids?: boolean
      localizations?: Record<string, YouTubeVideoLocalizationEntry>
    }

    const userId = await resolveSessionOrParamUserId(userIdParam)
    if (!userId || !videoUrl || !title?.trim()) {
      return NextResponse.json(
        { error: 'Authenticated user, videoUrl, and title are required' },
        { status: 400 }
      )
    }

    const result = await uploadVideoToYouTube(userId, {
      videoUrl,
      title,
      description: description || '',
      privacyStatus,
      language,
      thumbnailUrl,
      tags,
      categoryId,
      madeForKids,
    })

    let localizationsApplied: string[] = []
    let localizationsError: string | undefined
    if (localizations && Object.keys(localizations).length > 0) {
      try {
        const locRes = await setYouTubeVideoLocalizations(userId, {
          videoId: result.videoId,
          defaultLanguage: language,
          defaultTitle: title,
          defaultDescription: description || '',
          categoryId,
          tags,
          localizations,
        })
        localizationsApplied = locRes.appliedLanguages
      } catch (locErr: unknown) {
        localizationsError =
          locErr instanceof Error ? locErr.message : 'Failed to apply YouTube localizations'
        console.warn('[YouTube Upload] Localizations update warning:', locErr)
      }
    }

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
      localizationsApplied,
      ...(localizationsError ? { localizationsError } : {}),
      audioTracks: trackResults,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload failed'
    console.error('[YouTube Upload]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
