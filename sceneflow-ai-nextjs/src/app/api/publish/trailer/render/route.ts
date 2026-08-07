/**
 * Beat-woven 9:16 promo trailer render.
 *
 * Prefers per-beat videoUrl windows (and promo VO/music) over master-only stubs.
 *
 * POST /api/publish/trailer/render
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import type { PromoTrailerBeatPlan } from '@/types/publishingAssets'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

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
          audioVolume: 0.35,
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
            audioVolume: 0.35,
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
          volume: 1,
        },
      ]
    }
    if (body.musicAudioUrl) {
      audioTracks.music = [
        {
          id: 'promo-music',
          url: body.musicAudioUrl,
          startTime: 0,
          volume: 0.55,
          loop: true,
        },
      ]
    }

    let mp4Url = segments[0]?.videoUrl || fallbackVideoUrl
    let stitchSucceeded = false

    try {
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
            segmentAudioVolume: 0.35,
            narrationVolume: 1,
            musicVolume: 0.55,
          },
          segments,
          audioTracks,
          textOverlays: [],
        }),
      })

      if (stitchRes.ok) {
        const stitchData = await stitchRes.json()
        if (stitchData.jobId) {
          for (let i = 0; i < 24; i++) {
            await new Promise((r) => setTimeout(r, 5000))
            const pollRes = await fetch(
              `${new URL('/api/publish/stream/render', request.url).toString()}?jobId=${stitchData.jobId}`,
              { headers: { cookie: request.headers.get('cookie') || '' } }
            )
            if (!pollRes.ok) continue
            const pollData = await pollRes.json()
            if (pollData.status === 'COMPLETED') {
              mp4Url = pollData.downloadUrl || pollData.publicUrl || pollData.outputUrl || mp4Url
              stitchSucceeded = true
              break
            }
            if (pollData.status === 'FAILED' || pollData.status === 'error') break
          }
        } else if (stitchData.outputUrl || stitchData.publicUrl || stitchData.downloadUrl) {
          mp4Url =
            stitchData.outputUrl || stitchData.publicUrl || stitchData.downloadUrl || mp4Url
          stitchSucceeded = true
        }
      } else {
        console.warn('[Trailer Render] Stitch HTTP', stitchRes.status, await stitchRes.text())
      }
    } catch (stitchErr) {
      console.warn('[Trailer Render] Cloud stitch unavailable:', stitchErr)
    }

    if (!stitchSucceeded && clipSegments.length === 0 && fallbackVideoUrl) {
      // Last resort: master URL (legacy fallback) — only when no per-beat clips exist
      mp4Url = fallbackVideoUrl
    } else if (!stitchSucceeded && !mp4Url) {
      return NextResponse.json(
        { error: 'Trailer stitch failed and no playable clip URL is available' },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      mp4Url,
      durationSec,
      aspect: '9:16',
      beatCount: beatPlan.length,
      stitchSucceeded,
      usedPerBeatClips: clipSegments.length > 0,
    })
  } catch (error) {
    console.error('[Trailer Render] POST error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Trailer render failed' },
      { status: 500 }
    )
  }
}
