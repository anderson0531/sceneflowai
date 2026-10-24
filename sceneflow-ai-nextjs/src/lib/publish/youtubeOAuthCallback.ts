import { NextRequest, NextResponse } from 'next/server'
import '@/models'
import { exchangeYouTubeCode, saveYouTubeTokens } from '@/lib/publish/youtubeClient'

interface YouTubeOAuthState {
  userId: string
  returnTo?: string
  redirectUri?: string
}

function parseOAuthState(stateRaw: string | null): YouTubeOAuthState | null {
  if (!stateRaw) return null
  try {
    return JSON.parse(Buffer.from(stateRaw, 'base64url').toString('utf8')) as YouTubeOAuthState
  } catch {
    return null
  }
}

function buildReturnRedirect(
  req: NextRequest,
  returnTo: string | undefined,
  status: string
): NextResponse {
  const fallback = `${process.env.NEXT_PUBLIC_APP_URL || ''}/dashboard`
  const target = returnTo || fallback
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
    return buildReturnRedirect(req, parsedState?.returnTo, 'error')
  }
  if (!code || !stateRaw || !parsedState?.userId) {
    return buildReturnRedirect(req, parsedState?.returnTo, 'missing_code')
  }

  try {
    const tokens = await exchangeYouTubeCode(
      code,
      parsedState.redirectUri || req.nextUrl.origin,
      parsedState.userId
    )
    await saveYouTubeTokens(parsedState.userId, tokens)
    return buildReturnRedirect(req, parsedState.returnTo, 'connected')
  } catch (err) {
    console.error('[YouTube Callback]', err)
    return buildReturnRedirect(req, parsedState.returnTo, 'callback_failed')
  }
}
