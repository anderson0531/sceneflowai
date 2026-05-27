import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { put } from '@vercel/blob'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export interface ShortFormClipSpec {
  id: string
  platform: 'youtube-shorts' | 'instagram-reels' | 'tiktok'
  startSec: number
  endSec: number
  aspect: '9:16'
  label: string
}

const PLATFORM_MAX: Record<string, number> = {
  'youtube-shorts': 60,
  'instagram-reels': 90,
  tiktok: 180,
}

function detectClipWindows(durationSec: number): Array<{ start: number; end: number }> {
  if (durationSec <= 0) {
    return [{ start: 0, end: 30 }]
  }
  const clipLen = Math.min(45, Math.max(15, durationSec * 0.15))
  const windows: Array<{ start: number; end: number }> = []
  let start = Math.min(5, durationSec * 0.05)
  while (start < durationSec - 10 && windows.length < 3) {
    const end = Math.min(start + clipLen, durationSec)
    windows.push({ start: Math.round(start), end: Math.round(end) })
    start += clipLen + 8
  }
  if (windows.length === 0) {
    windows.push({ start: 0, end: Math.min(30, durationSec) })
  }
  return windows
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as {
      projectId?: string
      videoUrl?: string
      durationSec?: number
      platforms?: Array<'youtube-shorts' | 'instagram-reels' | 'tiktok'>
    }

    const projectId = (body.projectId || '').trim()
    const videoUrl = (body.videoUrl || '').trim()
    const durationSec = body.durationSec || 120
    const platforms = body.platforms || ['youtube-shorts', 'instagram-reels', 'tiktok']

    if (!projectId || !videoUrl) {
      return NextResponse.json({ error: 'projectId and videoUrl required' }, { status: 400 })
    }

    const windows = detectClipWindows(durationSec)
    const clips: ShortFormClipSpec[] = []

    for (let i = 0; i < windows.length; i++) {
      const w = windows[i]
      const len = w.end - w.start
      for (const platform of platforms) {
        const max = PLATFORM_MAX[platform] || 60
        if (len > max) continue
        clips.push({
          id: `clip-${i + 1}-${platform}`,
          platform,
          startSec: w.start,
          endSec: w.end,
          aspect: '9:16',
          label: `Clip ${i + 1} · ${platform.replace('-', ' ')}`,
        })
      }
    }

    const manifest = {
      projectId,
      sourceVideoUrl: videoUrl,
      durationSec,
      clips,
      note:
        'Vertical reframe renders via Shotstack/cloud export in production. Clips define trim windows for 9:16 export.',
      generatedAt: new Date().toISOString(),
    }

    const blob = await put(
      `premiere/shorts/${projectId}/manifest-${Date.now()}.json`,
      JSON.stringify(manifest, null, 2),
      { access: 'public', contentType: 'application/json' }
    )

    return NextResponse.json({
      success: true,
      manifestUrl: blob.url,
      clips,
      platforms,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Short-form generation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
