import { NextRequest, NextResponse } from 'next/server'
import {
  buildOAuthPopupHtmlResponse,
  isTrustedSceneFlowOrigin,
} from '@/lib/publish/oauthPopupResponse'
import { exchangeTikTokCode, saveTikTokTokens } from '@/lib/publish/tiktokClient'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const stateRaw = req.nextUrl.searchParams.get('state')
  const error = req.nextUrl.searchParams.get('error')

  let parsedState: {
    userId?: string
    returnTo?: string
    openerOrigin?: string
    popup?: boolean
  } | null = null
  if (stateRaw) {
    try {
      parsedState = JSON.parse(Buffer.from(stateRaw, 'base64url').toString('utf8'))
    } catch {
      parsedState = null
    }
  }

  const baseOrigin = isTrustedSceneFlowOrigin(parsedState?.openerOrigin)
    ? parsedState!.openerOrigin!
    : req.url
  const buildFallbackRedirect = (status: string) => {
    const target = parsedState?.returnTo || '/dashboard'
    const dest = new URL(target.startsWith('/') ? target : '/dashboard', baseOrigin)
    dest.searchParams.set('tiktok', status)
    return NextResponse.redirect(dest, { headers: { 'Cache-Control': 'no-store' } })
  }

  if (error) {
    if (parsedState?.popup) {
      return buildOAuthPopupHtmlResponse({
        platform: 'tiktok',
        status: 'error',
        openerOrigin: parsedState.openerOrigin,
      })
    }
    return buildFallbackRedirect('error')
  }
  if (!code || !stateRaw || !parsedState?.userId) {
    if (parsedState?.popup) {
      return buildOAuthPopupHtmlResponse({
        platform: 'tiktok',
        status: 'missing_code',
        openerOrigin: parsedState?.openerOrigin,
      })
    }
    return buildFallbackRedirect('missing_code')
  }

  try {
    const tokens = await exchangeTikTokCode(code)
    await saveTikTokTokens(parsedState.userId, tokens)
    if (parsedState.popup) {
      return buildOAuthPopupHtmlResponse({
        platform: 'tiktok',
        status: 'connected',
        openerOrigin: parsedState.openerOrigin,
      })
    }
    return buildFallbackRedirect('connected')
  } catch (err) {
    console.error('[TikTok Callback]', err)
    if (parsedState?.popup) {
      return buildOAuthPopupHtmlResponse({
        platform: 'tiktok',
        status: 'callback_failed',
        openerOrigin: parsedState.openerOrigin,
      })
    }
    return buildFallbackRedirect('callback_failed')
  }
}
