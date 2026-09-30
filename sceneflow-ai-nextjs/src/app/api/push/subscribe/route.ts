import { NextRequest, NextResponse } from 'next/server'
import { getSessionUserId } from '@/lib/auth/sessionUser'
import { savePushSubscription, vapidConfig } from '@/lib/notifications/webPush'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    if (!vapidConfig()) {
      return NextResponse.json({ error: 'Push is not configured' }, { status: 404 })
    }

    const body = (await req.json()) as {
      endpoint?: string
      keys?: { p256dh?: string; auth?: string }
    }
    const endpoint = body.endpoint?.trim()
    const p256dh = body.keys?.p256dh?.trim()
    const auth = body.keys?.auth?.trim()
    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: 'Invalid push subscription' }, { status: 400 })
    }

    await savePushSubscription({ userId, endpoint, p256dh, auth })
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save subscription'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
