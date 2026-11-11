import { NextRequest, NextResponse } from 'next/server'
import '@/models'
import {
  buildOAuthPopupHtmlResponse,
  type SocialOAuthPopupStatus,
} from '@/lib/publish/oauthPopupResponse'
import { exchangeYouTubeCode, saveYouTubeTokens } from '@/lib/publish/youtubeClient'

interface YouTubeOAuthState {
  userId: string
  returnTo?: string
  redirectUri?: string
  popup?: boolean
}

function parseOAuthState(stateRaw: string | null): YouTubeOAuthState | null {
  if (!stateRaw) return null
  try {
    return JSON.parse(Buffer.from(stateRaw, 'base64url').toString('utf8')) as YouTubeOAuthState
  } catch {
    return null
  }
}

function buildReturnResponse(
  req: NextRequest,
  state: YouTubeOAuthState | null,
  status: SocialOAuthPopupStatus,
  message?: string
): NextResponse {
  if (state?.popup) {
    return buildOAuthPopupHtmlResponse({
      platform: 'youtube',
      status,
      message,
    })
  }
  const fallback = `${process.env.NEXT_PUBLIC_APP_URL || ''}/dashboard`
  const target = state?.returnTo || fallback
  if (target.startsWith('http://') || target.startsWith('https://')) {
    const dest = new URL(target)
    dest.searchParams.set('youtube', status)
    return NextResponse.redirect(dest, { headers: { 'Cache-Control': 'no-store' } })
  }
  const dest = new URL(target.startsWith('/') ? target : '/dashboard', req.url)
  dest.searchParams.set('youtube', status)
  return NextResponse.redirect(dest, { headers: { 'Cache-Control': 'no-store' } })
}

/** Shared by the registered callback and the older publish alias. */
export async function handleYouTubeOAuthCallback(req: NextRequest): Promise<NextResponse> {
  const code = req.nextUrl.searchParams.get('code')
  const stateRaw = req.nextUrl.searchParams.get('state')
  const error = req.nextUrl.searchParams.get('error')
  const parsedState = parseOAuthState(stateRaw)

  if (error) {
    return buildReturnResponse(
      req,
      parsedState,
      'error',
      error === 'access_denied'
        ? 'Google sign-in or YouTube permission was cancelled.'
        : `Google OAuth error: ${error}`
    )
  }
  if (!code || !stateRaw || !parsedState?.userId) {
    return buildReturnResponse(req, parsedState, 'missing_code')
  }

  try {
    const tokens = await exchangeYouTubeCode(
      code,
      parsedState.redirectUri || req.nextUrl.origin,
      parsedState.userId
    )
    await saveYouTubeTokens(parsedState.userId, tokens)
    return buildReturnResponse(req, parsedState, 'connected')
  } catch (err) {
    console.error('[YouTube Callback]', err)
    const msg = err instanceof Error ? err.message : 'Failed to verify authorization code'
    return buildReturnResponse(req, parsedState, 'callback_failed', msg)
  }
}
