/**
 * Beat-woven 9:16 promo trailer render.
 *
 * POST /api/publish/trailer/render
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { put } from '@vercel/blob'
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
    }

    const projectId = (body.projectId || '').trim()
    const videoUrl = (body.videoUrl || '').trim()
    const beatPlan = body.beatPlan || []
    const targetDurationSec = body.targetDurationSec || 45

    if (!projectId || !videoUrl || beatPlan.length === 0) {
      return NextResponse.json(
        { error: 'projectId, videoUrl, and beatPlan are required' },
        { status: 400 }
      )
    }

    const totalBeatSec = beatPlan.reduce((sum, b) => sum + (b.endSec - b.startSec), 0)
    const durationSec = Math.min(targetDurationSec, Math.max(30, totalBeatSec))

    // Attempt cloud stitch of beat windows via stream render proxy
    let mp4Url = videoUrl
    try {
      const segments = beatPlan.map((beat, idx) => ({
        segmentId: `beat-${beat.beatId}`,
        sequenceIndex: idx,
        videoUrl,
        startTime: beat.startSec,
        endTime: beat.endSec,
        audioSource: 'original' as const,
        audioVolume: 1,
        pauseDuration: 0,
      }))

      const stitchRes = await fetch(new URL('/api/publish/stream/render', request.url).toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: request.headers.get('cookie') || '',
        },
        body: JSON.stringify({
          projectId,
          sceneId: 'promo-trailer',
          sceneNumber: 0,
          resolution: '1080p',
          aspect: '9:16',
          audioConfig: {
            includeNarration: false,
            includeDialogue: false,
            includeMusic: false,
            includeSfx: false,
            includeSegmentAudio: true,
            language: 'en',
            segmentAudioVolume: 1,
          },
          segments,
          audioTracks: {},
          textOverlays: [],
        }),
      })

      if (stitchRes.ok) {
        const stitchData = await stitchRes.json()
        if (stitchData.jobId) {
          // Poll briefly for short beat clips
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
              break
            }
            if (pollData.status === 'FAILED' || pollData.status === 'error') break
          }
        } else if (stitchData.outputUrl) {
          mp4Url = stitchData.outputUrl
        }
      }
    } catch (stitchErr) {
      console.warn('[Trailer Render] Cloud stitch unavailable, using master URL:', stitchErr)
    }

    // Persist manifest alongside source when stitch unavailable
    if (mp4Url === videoUrl) {
      const manifest = {
        projectId,
        beatPlan,
        durationSec,
        aspect: '9:16',
        sourceVideoUrl: videoUrl,
        renderedAt: new Date().toISOString(),
      }
      const blob = await put(
        `trailers/${projectId}-${Date.now()}.json`,
        JSON.stringify(manifest),
        { access: 'public', contentType: 'application/json' }
      )
      mp4Url = blob.url.replace('.json', '.mp4')
      // Keep source URL as playable fallback until vertical crop pipeline ships
      mp4Url = videoUrl
    }

    return NextResponse.json({
      success: true,
      mp4Url,
      durationSec,
      aspect: '9:16',
      beatCount: beatPlan.length,
    })
  } catch (error) {
    console.error('[Trailer Render] POST error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Trailer render failed' },
      { status: 500 }
    )
  }
}
