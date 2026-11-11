import { NextRequest, NextResponse } from 'next/server'
import { exchangeFacebookCode, saveFacebookTokens } from '@/lib/publish/facebookClient'
import {
  buildOAuthPopupHtmlResponse,
  isTrustedSceneFlowOrigin,
} from '@/lib/publish/oauthPopupResponse'

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
    dest.searchParams.set('facebook', status)
    return NextResponse.redirect(dest, { headers: { 'Cache-Control': 'no-store' } })
  }

  if (error) {
    if (parsedState?.popup) {
      return buildOAuthPopupHtmlResponse({
        platform: 'facebook',
        status: 'error',
        openerOrigin: parsedState.openerOrigin,
      })
    }
    return buildFallbackRedirect('error')
  }
  if (!code || !stateRaw || !parsedState?.userId) {
    if (parsedState?.popup) {
      return buildOAuthPopupHtmlResponse({
        platform: 'facebook',
        status: 'missing_code',
        openerOrigin: parsedState?.openerOrigin,
      })
    }
    return buildFallbackRedirect('missing_code')
  }

  try {
    const tokens = await exchangeFacebookCode(code)
    await saveFacebookTokens(parsedState.userId, tokens)
    if (parsedState.popup) {
      return buildOAuthPopupHtmlResponse({
        platform: 'facebook',
        status: 'connected',
        openerOrigin: parsedState.openerOrigin,
      })
    }
    return buildFallbackRedirect('connected')
  } catch (err) {
    console.error('[Facebook Callback]', err)
    if (parsedState?.popup) {
      return buildOAuthPopupHtmlResponse({
        platform: 'facebook',
        status: 'callback_failed',
        openerOrigin: parsedState.openerOrigin,
      })
    }
    return buildFallbackRedirect('callback_failed')
  }
}
