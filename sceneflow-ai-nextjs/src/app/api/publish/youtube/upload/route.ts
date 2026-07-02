import { NextRequest, NextResponse } from 'next/server'
import '@/models'
import { uploadVideoToYouTube, loadYouTubeTokens } from '@/lib/publish/youtubeClient'
import { resolveUserId } from '@/lib/userHelper'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const userIdParam = req.nextUrl.searchParams.get('userId')
    if (!userIdParam) {
      return NextResponse.json({ connected: false })
    }
    const userId = await resolveUserId(userIdParam)
    const tokens = await loadYouTubeTokens(userId)
    return NextResponse.json({ connected: !!tokens?.access_token })
  } catch (err: any) {
    return NextResponse.json({ connected: false, error: err?.message })
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
    } = body

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

    return NextResponse.json({ success: true, ...result })
  } catch (err: any) {
    console.error('[YouTube Upload]', err)
    return NextResponse.json({ error: err?.message || 'Upload failed' }, { status: 500 })
  }
}
