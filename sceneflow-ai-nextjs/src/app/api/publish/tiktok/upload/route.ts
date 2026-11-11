import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import '@/models'
import { authOptions } from '@/lib/auth'
import {
  disconnectTikTokTokens,
  loadTikTokTokens,
  tiktokConfigured,
  uploadVideoToTikTok,
} from '@/lib/publish/tiktokClient'
import { resolveUserId } from '@/lib/userHelper'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

async function getEffectiveUserId(req: NextRequest, bodyUserId?: string): Promise<string | null> {
  const raw = bodyUserId?.trim() || req.nextUrl.searchParams.get('userId')?.trim() || ''
  if (raw) return resolveUserId(raw)
  const session = await getServerSession(authOptions)
  const fromSession = session?.user?.id || session?.user?.email || ''
  return fromSession ? resolveUserId(fromSession) : null
}

export async function GET(req: NextRequest) {
  const oauthConfigured = tiktokConfigured()
  try {
    const userId = await getEffectiveUserId(req)
    if (!userId) return NextResponse.json({ connected: false, oauthConfigured })
    const tokens = await loadTikTokTokens(userId)
    return NextResponse.json({ connected: !!tokens?.access_token, oauthConfigured })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ connected: false, oauthConfigured, error: message })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req)
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    await disconnectTikTokTokens(userId)
    return NextResponse.json({ success: true, connected: false })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to disconnect TikTok'
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
      privacyStatus = 'private',
    } = body as {
      userId?: string
      videoUrl?: string
      title?: string
      privacyStatus?: 'private' | 'unlisted' | 'public'
    }

    if (!videoUrl || !title) {
      return NextResponse.json({ error: 'videoUrl and title are required' }, { status: 400 })
    }

    const userId = await getEffectiveUserId(req, userIdParam)
    if (!userId) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    }

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
