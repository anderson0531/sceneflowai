import { NextRequest, NextResponse } from 'next/server'
import '@/models'
import { loadTikTokTokens, uploadVideoToTikTok } from '@/lib/publish/tiktokClient'
import { resolveUserId } from '@/lib/userHelper'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(req: NextRequest) {
  try {
    const userIdParam = req.nextUrl.searchParams.get('userId')
    if (!userIdParam) return NextResponse.json({ connected: false })
    const userId = await resolveUserId(userIdParam)
    const tokens = await loadTikTokTokens(userId)
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
      privacyStatus = 'private',
    } = body as {
      userId?: string
      videoUrl?: string
      title?: string
      privacyStatus?: 'private' | 'unlisted' | 'public'
    }

    if (!userIdParam || !videoUrl || !title) {
      return NextResponse.json({ error: 'userId, videoUrl, and title are required' }, { status: 400 })
    }

    const userId = await resolveUserId(userIdParam)
    const result = await uploadVideoToTikTok(userId, { videoUrl, title, privacyStatus })
    return NextResponse.json({
      success: true,
      ...result,
      note:
        result.privacyLevel === 'SELF_ONLY'
          ? 'Posted as private. Unaudited TikTok apps cannot publish publicly.'
          : undefined,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload failed'
    console.error('[TikTok Upload]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
