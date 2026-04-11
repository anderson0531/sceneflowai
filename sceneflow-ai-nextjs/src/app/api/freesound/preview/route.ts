import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { freesoundFetchPreviewMp3, getFreesoundApiKey } from '@/lib/freesound/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!getFreesoundApiKey()) {
      return NextResponse.json(
        { error: 'Freesound is not configured (missing FREESOUND_API_KEY).' },
        { status: 503 }
      )
    }

    const soundIdRaw = request.nextUrl.searchParams.get('soundId')
    const soundId = soundIdRaw ? parseInt(soundIdRaw, 10) : NaN
    if (!Number.isFinite(soundId) || soundId < 1) {
      return NextResponse.json({ error: 'Invalid soundId' }, { status: 400 })
    }

    const { buffer, contentType } = await freesoundFetchPreviewMp3(soundId)
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType.startsWith('audio/') ? contentType : 'audio/mpeg',
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Preview failed'
    console.error('[freesound/preview]', msg)
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
