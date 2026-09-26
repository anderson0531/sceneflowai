import { NextRequest, NextResponse } from 'next/server'
import { getFacebookAuthUrl } from '@/lib/publish/facebookClient'
import { resolveUserId } from '@/lib/userHelper'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const userIdParam = req.nextUrl.searchParams.get('userId')
    const returnTo = req.nextUrl.searchParams.get('returnTo') || '/dashboard'
    if (!userIdParam) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }
    const userId = await resolveUserId(userIdParam)
    const state = Buffer.from(JSON.stringify({ userId, returnTo })).toString('base64url')
    const url = getFacebookAuthUrl(state)
    return NextResponse.redirect(url)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Auth failed'
    console.error('[Facebook Auth]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
