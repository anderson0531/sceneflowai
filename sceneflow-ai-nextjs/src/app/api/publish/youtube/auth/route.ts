import { NextRequest, NextResponse } from 'next/server'
import { sanitizeReturnTo } from '@/lib/navigation/sanitizeReturnTo'
import { getYouTubeAuthUrl } from '@/lib/publish/youtubeClient'
import { resolveUserId } from '@/lib/userHelper'

export const dynamic = 'force-dynamic'

function returnPath(raw: string | null): string {
  const cleaned = sanitizeReturnTo(raw)
  return cleaned && cleaned.startsWith('/') ? cleaned : '/dashboard'
}

export async function GET(req: NextRequest) {
  const returnTo = returnPath(req.nextUrl.searchParams.get('returnTo'))
  try {
    const userIdParam = req.nextUrl.searchParams.get('userId')
    if (!userIdParam) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }
    const userId = await resolveUserId(userIdParam)
    const state = Buffer.from(JSON.stringify({ userId, returnTo })).toString('base64url')
    const url = getYouTubeAuthUrl(state)
    return NextResponse.redirect(url)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Auth failed'
    console.error('[YouTube Auth]', err)
    if (message.includes('not configured')) {
      const dest = new URL(returnTo, req.url)
      dest.searchParams.set('youtube', 'not_configured')
      return NextResponse.redirect(dest)
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
