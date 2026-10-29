import { NextRequest, NextResponse } from 'next/server'
import '@/models'
import Notification, { type NotificationType } from '@/models/Notification'
import { listNotificationsForUser, notifyUser } from '@/lib/jobs/jobService'
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

export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await req.json()
    const title = String(body?.title || '').trim()
    const message = String(body?.message || '').trim()
    if (!title || !message) {
      return NextResponse.json(
        { error: 'title and message are required' },
        { status: 400 }
      )
    }

    const allowedTypes: NotificationType[] = [
      'job_completed',
      'job_failed',
      'job_progress',
      'info',
      'feedback',
    ]
    const type: NotificationType = allowedTypes.includes(body?.type)
      ? body.type
      : 'job_progress'

    await notifyUser({
      userId,
      projectId: typeof body?.projectId === 'string' ? body.projectId : undefined,
      jobId: typeof body?.jobId === 'string' ? body.jobId : undefined,
      type,
      title,
      message,
      metadata:
        body?.metadata && typeof body.metadata === 'object'
          ? (body.metadata as Record<string, unknown>)
          : undefined,
    })

    return NextResponse.json({ success: true })
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
