import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import '@/models'
import { authOptions } from '@/lib/auth'
import {
  disconnectFacebookTokens,
  facebookConfigured,
  listFacebookPages,
  loadFacebookTokens,
  selectFacebookPage,
  uploadVideoToFacebook,
} from '@/lib/publish/facebookClient'
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
  const oauthConfigured = facebookConfigured()
  try {
    const userId = await getEffectiveUserId(req)
    if (!userId) return NextResponse.json({ connected: false, oauthConfigured, pages: [] })
    const tokens = await loadFacebookTokens(userId)
    if (!tokens?.access_token) {
      return NextResponse.json({ connected: false, oauthConfigured, pages: [] })
    }
    const pages = await listFacebookPages(userId)
    return NextResponse.json({
      connected: true,
      oauthConfigured,
      pageId: tokens.pageId || null,
      pageName: tokens.pageName || null,
      pages: pages.map((page) => ({ id: page.id, name: page.name })),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ connected: false, oauthConfigured, pages: [], error: message })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req)
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    await disconnectFacebookTokens(userId)
    return NextResponse.json({ success: true, connected: false })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to disconnect Facebook'
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
      description,
      pageId,
      privacyStatus = 'private',
      selectPageOnly,
    } = body as {
      userId?: string
      videoUrl?: string
      title?: string
      description?: string
      pageId?: string
      privacyStatus?: 'private' | 'unlisted' | 'public'
      selectPageOnly?: boolean
    }

    const userId = await getEffectiveUserId(req, userIdParam)
    if (!userId) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    }

    if (selectPageOnly) {
      if (!pageId) return NextResponse.json({ error: 'pageId is required' }, { status: 400 })
      const tokens = await selectFacebookPage(userId, pageId)
      return NextResponse.json({ success: true, pageId: tokens.pageId, pageName: tokens.pageName })
    }

    if (!videoUrl || !title) {
      return NextResponse.json({ error: 'videoUrl and title are required' }, { status: 400 })
    }

    const result = await uploadVideoToFacebook(userId, {
      videoUrl,
      title,
      description,
      pageId,
      privacyStatus,
    })
    return NextResponse.json({ success: true, ...result })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload failed'
    console.error('[Facebook Upload]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
