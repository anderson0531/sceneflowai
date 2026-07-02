import { NextRequest, NextResponse } from 'next/server'
import { exchangeYouTubeCode, saveYouTubeTokens } from '@/lib/publish/youtubeClient'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const stateRaw = req.nextUrl.searchParams.get('state')
  const error = req.nextUrl.searchParams.get('error')

  const fallback = `${process.env.NEXT_PUBLIC_APP_URL || ''}/dashboard`

  if (error) {
    return NextResponse.redirect(`${fallback}?youtube=error`)
  }
  if (!code || !stateRaw) {
    return NextResponse.redirect(`${fallback}?youtube=missing_code`)
  }

  try {
    const state = JSON.parse(Buffer.from(stateRaw, 'base64url').toString('utf8')) as {
      userId: string
      returnTo?: string
    }
    const tokens = await exchangeYouTubeCode(code)
    await saveYouTubeTokens(state.userId, tokens)
    const returnTo = state.returnTo || fallback
    const sep = returnTo.includes('?') ? '&' : '?'
    return NextResponse.redirect(`${returnTo}${sep}youtube=connected`)
  } catch (err) {
    console.error('[YouTube Callback]', err)
    return NextResponse.redirect(`${fallback}?youtube=callback_failed`)
  }
}
