import { NextRequest, NextResponse } from 'next/server'
import '@/models'
import Notification from '@/models/Notification'
import { listNotificationsForUser } from '@/lib/jobs/jobService'
import { getSessionUserId } from '@/lib/auth/sessionUser'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const unreadOnly = req.nextUrl.searchParams.get('unreadOnly') === 'true'

    // Session is authoritative — a client-supplied userId would expose another
    // account's notifications.
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ notifications: [] })
    }

    const notifications = await listNotificationsForUser(userId, unreadOnly)
    return NextResponse.json({ notifications })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { notificationIds, markAllRead } = body

    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    if (markAllRead) {
      await Notification.update({ read: true }, { where: { user_id: userId, read: false } })
      return NextResponse.json({ success: true })
    }

    if (Array.isArray(notificationIds) && notificationIds.length > 0) {
      await Notification.update(
        { read: true },
        { where: { user_id: userId, id: notificationIds } }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}
