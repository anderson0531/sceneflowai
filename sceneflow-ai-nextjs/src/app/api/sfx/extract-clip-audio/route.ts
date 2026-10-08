import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { extractShotClipAudio } from '@/lib/sfx/extractShotClipAudio'

export const runtime = 'nodejs'
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
      beatId?: string
    }
    if (!body.projectId?.trim() || !body.videoUrl?.trim()) {
      return NextResponse.json({ error: 'projectId and videoUrl are required' }, { status: 400 })
    }

    const extracted = await extractShotClipAudio({
      projectId: body.projectId.trim(),
      videoUrl: body.videoUrl.trim(),
      beatId: body.beatId?.trim(),
    })
    return NextResponse.json({
      url: extracted.url,
      beatId: body.beatId?.trim(),
      sourceUrl: body.videoUrl.trim(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Clip audio extract failed'
    console.error('[Shot clip audio]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
