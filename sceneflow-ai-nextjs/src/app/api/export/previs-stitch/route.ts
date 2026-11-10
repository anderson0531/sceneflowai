import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { stitchPreVisClipsServer } from '@/lib/ffmpeg/stitchPreVisServer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as {
      urls?: unknown
      projectId?: string
      language?: string
      container?: 'mp4' | 'webm'
    }

    if (!Array.isArray(body?.urls) || body.urls.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 scene video URLs are required to stitch Pre-Vis' },
        { status: 400 }
      )
    }

    const urls = body.urls.filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
    if (urls.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 valid scene video URLs are required to stitch Pre-Vis' },
        { status: 400 }
      )
    }

    const result = await stitchPreVisClipsServer({
      urls,
      projectId: typeof body.projectId === 'string' ? body.projectId.trim() : undefined,
      language: typeof body.language === 'string' ? body.language.trim() : undefined,
      container: body.container === 'mp4' || body.container === 'webm' ? body.container : undefined,
    })

    return NextResponse.json({
      success: true,
      url: result.url,
      downloadUrl: result.downloadUrl,
      mimeType: result.mimeType,
      container: result.container,
      transcoded: result.transcoded,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to stitch Pre-Vis scenes'
    console.error('[PreVis Stitch API]', message)
    const status =
      message.includes('Untrusted or invalid') || message.includes('required to stitch')
        ? 400
        : 500
    return NextResponse.json({ error: message }, { status })
  }
}
