import { NextRequest, NextResponse } from 'next/server'
import { buildOAuthPopupHtmlResponse } from '@/lib/publish/oauthPopupResponse'
import { exchangeTikTokCode, saveTikTokTokens } from '@/lib/publish/tiktokClient'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const stateRaw = req.nextUrl.searchParams.get('state')
  const error = req.nextUrl.searchParams.get('error')
  const fallback = `${process.env.NEXT_PUBLIC_APP_URL || ''}/dashboard`

  let parsedState: { userId?: string; returnTo?: string; popup?: boolean } | null = null
  if (stateRaw) {
    try {
      parsedState = JSON.parse(Buffer.from(stateRaw, 'base64url').toString('utf8'))
    } catch {
      parsedState = null
    }
  }

  if (error) {
    if (parsedState?.popup) {
      return buildOAuthPopupHtmlResponse({ platform: 'tiktok', status: 'error' })
    }
    return NextResponse.redirect(`${fallback}?tiktok=error`)
  }
  if (!code || !stateRaw || !parsedState?.userId) {
    if (parsedState?.popup) {
      return buildOAuthPopupHtmlResponse({ platform: 'tiktok', status: 'missing_code' })
    }
    return NextResponse.redirect(`${fallback}?tiktok=missing_code`)
  }

  try {
    const tokens = await exchangeTikTokCode(code)
    await saveTikTokTokens(parsedState.userId, tokens)
    if (parsedState.popup) {
      return buildOAuthPopupHtmlResponse({ platform: 'tiktok', status: 'connected' })
    }
    const returnTo = parsedState.returnTo || fallback
    const sep = returnTo.includes('?') ? '&' : '?'
    return NextResponse.redirect(`${returnTo}${sep}tiktok=connected`)
  } catch (err) {
    console.error('[TikTok Callback]', err)
    if (parsedState?.popup) {
      return buildOAuthPopupHtmlResponse({ platform: 'tiktok', status: 'callback_failed' })
    }
    return NextResponse.redirect(`${fallback}?tiktok=callback_failed`)
  }
}
