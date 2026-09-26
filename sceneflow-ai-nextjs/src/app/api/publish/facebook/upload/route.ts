import { NextRequest, NextResponse } from 'next/server'
import '@/models'
import {
  listFacebookPages,
  loadFacebookTokens,
  selectFacebookPage,
  uploadVideoToFacebook,
} from '@/lib/publish/facebookClient'
import { resolveUserId } from '@/lib/userHelper'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(req: NextRequest) {
  try {
    const userIdParam = req.nextUrl.searchParams.get('userId')
    if (!userIdParam) return NextResponse.json({ connected: false, pages: [] })
    const userId = await resolveUserId(userIdParam)
    const tokens = await loadFacebookTokens(userId)
    if (!tokens?.access_token) return NextResponse.json({ connected: false, pages: [] })
    const pages = await listFacebookPages(userId)
    return NextResponse.json({
      connected: true,
      pageId: tokens.pageId || null,
      pageName: tokens.pageName || null,
      pages: pages.map((page) => ({ id: page.id, name: page.name })),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ connected: false, pages: [], error: message })
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

    if (!userIdParam) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }
    const userId = await resolveUserId(userIdParam)

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
