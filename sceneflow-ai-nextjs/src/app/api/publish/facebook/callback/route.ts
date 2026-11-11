import { NextRequest, NextResponse } from 'next/server'
import { exchangeFacebookCode, saveFacebookTokens } from '@/lib/publish/facebookClient'
import { buildOAuthPopupHtmlResponse } from '@/lib/publish/oauthPopupResponse'

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
      return buildOAuthPopupHtmlResponse({ platform: 'facebook', status: 'error' })
    }
    return NextResponse.redirect(`${fallback}?facebook=error`)
  }
  if (!code || !stateRaw || !parsedState?.userId) {
    if (parsedState?.popup) {
      return buildOAuthPopupHtmlResponse({ platform: 'facebook', status: 'missing_code' })
    }
    return NextResponse.redirect(`${fallback}?facebook=missing_code`)
  }

  try {
    const tokens = await exchangeFacebookCode(code)
    await saveFacebookTokens(parsedState.userId, tokens)
    if (parsedState.popup) {
      return buildOAuthPopupHtmlResponse({ platform: 'facebook', status: 'connected' })
    }
    const returnTo = parsedState.returnTo || fallback
    const sep = returnTo.includes('?') ? '&' : '?'
    return NextResponse.redirect(`${returnTo}${sep}facebook=connected`)
  } catch (err) {
    console.error('[Facebook Callback]', err)
    if (parsedState?.popup) {
      return buildOAuthPopupHtmlResponse({ platform: 'facebook', status: 'callback_failed' })
    }
    return NextResponse.redirect(`${fallback}?facebook=callback_failed`)
  }
}
