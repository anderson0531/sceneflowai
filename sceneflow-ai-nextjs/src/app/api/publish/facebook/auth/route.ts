import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import '@/models'
import { authOptions } from '@/lib/auth'
import { sanitizeReturnTo } from '@/lib/navigation/sanitizeReturnTo'
import { getFacebookAuthUrl } from '@/lib/publish/facebookClient'
import { buildOAuthPopupHtmlResponse } from '@/lib/publish/oauthPopupResponse'
import { resolveUserId } from '@/lib/userHelper'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store' }

function returnPath(raw: string | null): string {
  const cleaned = sanitizeReturnTo(raw)
  return cleaned && cleaned.startsWith('/') ? cleaned : '/dashboard'
}

export async function GET(req: NextRequest) {
  const returnTo = returnPath(req.nextUrl.searchParams.get('returnTo'))
  const popup = req.nextUrl.searchParams.get('popup') === '1'
  try {
    let userIdRaw = req.nextUrl.searchParams.get('userId')?.trim() || ''
    if (!userIdRaw) {
      const session = await getServerSession(authOptions)
      userIdRaw = session?.user?.id || session?.user?.email || ''
    }
    if (!userIdRaw) {
      if (popup) {
        return buildOAuthPopupHtmlResponse({
          platform: 'facebook',
          status: 'error',
          message: 'Please sign in to SceneFlow first before authorizing Facebook.',
        })
      }
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    }
    const userId = await resolveUserId(userIdRaw)
    const state = Buffer.from(
      JSON.stringify({ userId, returnTo, ...(popup ? { popup: true } : {}) })
    ).toString('base64url')
    const url = getFacebookAuthUrl(state)
    return NextResponse.redirect(url, { headers: NO_STORE })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Auth failed'
    console.error('[Facebook Auth]', err)
    if (message.includes('not configured')) {
      if (popup) {
        return buildOAuthPopupHtmlResponse({
          platform: 'facebook',
          status: 'not_configured',
        })
      }
      const dest = new URL(returnTo, req.url)
      dest.searchParams.set('facebook', 'not_configured')
      return NextResponse.redirect(dest, { headers: NO_STORE })
    }
    if (popup) {
      return buildOAuthPopupHtmlResponse({
        platform: 'facebook',
        status: 'error',
        message,
      })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
