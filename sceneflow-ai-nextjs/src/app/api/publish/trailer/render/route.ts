/**
 * Beat-woven 9:16 promo trailer render.
 *
 * Starts the stitch and returns the job id. The browser polls job status.
 * Waiting here used to outlive the gateway and the finished file was lost.
 *
 * POST /api/publish/trailer/render
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PROMO_AUDIO_MIX } from '@/lib/publish/promoAudioMix'
import type { PromoTrailerBeatPlan } from '@/types/publishingAssets'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as {
      projectId?: string
      videoUrl?: string
      beatPlan?: PromoTrailerBeatPlan[]
      targetDurationSec?: number
      title?: string
      narrationAudioUrl?: string
      musicAudioUrl?: string
      promoSceneId?: string
    }

    const projectId = (body.projectId || '').trim()
    const fallbackVideoUrl = (body.videoUrl || '').trim()
    const beatPlan = body.beatPlan || []
    const targetDurationSec = body.targetDurationSec || 60

    if (!projectId || beatPlan.length === 0) {
      return NextResponse.json(
        { error: 'projectId and beatPlan are required' },
        { status: 400 }
      )
    }

    const clipSegments = beatPlan
      .map((beat, idx) => {
        const videoUrl = (beat.videoUrl || fallbackVideoUrl || '').trim()
        if (!videoUrl) return null
        const duration = beat.durationSec ?? beat.endSec - beat.startSec
        return {
          segmentId: `beat-${beat.beatId}-${idx}`,
          sequenceIndex: idx,
          videoUrl,
          startTime: beat.videoUrl ? 0 : beat.startSec,
          endTime: beat.videoUrl ? Math.max(0.5, duration) : beat.endSec,
          audioSource: 'original' as const,
          audioVolume: PROMO_AUDIO_MIX.clip,
          pauseDuration: 0,
        }
      })
      .filter(Boolean) as Array<{
      segmentId: string
      sequenceIndex: number
      videoUrl: string
      startTime: number
      endTime: number
      audioSource: 'original'
      audioVolume: number
      pauseDuration: number
    }>

    if (clipSegments.length === 0 && !fallbackVideoUrl) {
      return NextResponse.json(
        {
          error:
            'No usable video clips on the beat plan. Generate scene videos or a master stream first.',
        },
        { status: 400 }
      )
    }

    const segments =
      clipSegments.length > 0
        ? clipSegments
        : beatPlan.map((beat, idx) => ({
            segmentId: `beat-${beat.beatId}-${idx}`,
            sequenceIndex: idx,
            videoUrl: fallbackVideoUrl,
            startTime: beat.startSec,
            endTime: beat.endSec,
            audioSource: 'original' as const,
            audioVolume: PROMO_AUDIO_MIX.clip,
            pauseDuration: 0,
          }))

    const totalBeatSec = beatPlan.reduce(
      (sum, b) => sum + (b.durationSec ?? b.endSec - b.startSec),
      0
    )
    const durationSec = Math.min(targetDurationSec, Math.max(30, totalBeatSec))

    const audioTracks: Record<string, unknown> = {}
    if (body.narrationAudioUrl) {
      audioTracks.narration = [
        {
          id: 'promo-narration',
          url: body.narrationAudioUrl,
          startTime: 0,
          volume: PROMO_AUDIO_MIX.narration,
        },
      ]
    }
    if (body.musicAudioUrl) {
      audioTracks.music = [
        {
          id: 'promo-music',
          url: body.musicAudioUrl,
          startTime: 0,
          volume: PROMO_AUDIO_MIX.music,
          loop: true,
        },
      ]
    }

    const stitchRes = await fetch(new URL('/api/publish/stream/render', request.url).toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: request.headers.get('cookie') || '',
      },
      body: JSON.stringify({
        projectId,
        sceneId: body.promoSceneId || 'promo-trailer',
        sceneNumber: 0,
        resolution: '1080p',
        aspect: '9:16',
        audioConfig: {
          includeNarration: !!body.narrationAudioUrl,
          includeDialogue: false,
          includeMusic: !!body.musicAudioUrl,
          includeSfx: false,
          includeSegmentAudio: true,
          language: 'en',
          segmentAudioVolume: PROMO_AUDIO_MIX.clip,
          narrationVolume: PROMO_AUDIO_MIX.narration,
          musicVolume: PROMO_AUDIO_MIX.music,
        },
        segments,
        audioTracks,
        textOverlays: [],
      }),
    })

    const stitchText = await stitchRes.text()
    let stitchData: {
      jobId?: string
      error?: string
      downloadUrl?: string
      publicUrl?: string
      outputUrl?: string
      mp4Url?: string
    } = {}
    try {
      stitchData = stitchText ? JSON.parse(stitchText) : {}
    } catch {
      return NextResponse.json(
        { error: `Trailer render failed (${stitchRes.status})` },
        { status: stitchRes.ok ? 502 : stitchRes.status }
      )
    }

    if (!stitchRes.ok) {
      return NextResponse.json(
        { error: stitchData.error || `Trailer render failed (${stitchRes.status})` },
        { status: stitchRes.status }
      )
    }

    if (typeof stitchData.jobId === 'string' && stitchData.jobId.trim()) {
      return NextResponse.json({
        success: true,
        jobId: stitchData.jobId,
        status: 'PROCESSING',
        durationSec,
        aspect: '9:16',
        beatCount: beatPlan.length,
        usedPerBeatClips: clipSegments.length > 0,
      })
    }

    const immediate =
      stitchData.downloadUrl || stitchData.publicUrl || stitchData.outputUrl || stitchData.mp4Url
    if (typeof immediate === 'string' && immediate.startsWith('http')) {
      return NextResponse.json({
        success: true,
        mp4Url: immediate,
        status: 'COMPLETED',
        durationSec,
        aspect: '9:16',
        beatCount: beatPlan.length,
        usedPerBeatClips: clipSegments.length > 0,
      })
    }

    return NextResponse.json({ error: 'Trailer stitch did not start' }, { status: 502 })
  } catch (error) {
    console.error('[Trailer Render] POST error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Trailer render failed' },
      { status: 500 }
    )
  }
}
