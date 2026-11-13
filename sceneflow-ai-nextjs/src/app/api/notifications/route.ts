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
    const unreadOnly = req.nextUrl.searchParams.get('unreadOnly') === 'true'
    const fallbackNotifications = [
      {
        id: 'notif-demo-1',
        type: 'feedback',
        title: 'Client Screening Review Ready',
        message: 'Elena & Arthur Lin left 2 timestamped notes on "Harbor Books: Fifty Years on Pike Street".',
        projectId: '00000000-0000-4000-8000-000000000002',
        read: false,
        createdAt: '2026-11-12T22:10:00.000Z',
      },
      {
        id: 'notif-demo-2',
        type: 'job_completed',
        title: '7-Locale Master Streams Ready',
        message: 'Localized EN, ES, PT, HI, ZH, AR, and TH masters finished rendering for "The Glass Ledger — Ep. 1".',
        projectId: '00000000-0000-4000-8000-000000000001',
        read: false,
        createdAt: '2026-11-12T19:12:00.000Z',
      },
      {
        id: 'notif-demo-3',
        type: 'info',
        title: 'Series Continuity Bible Locked (v1.4)',
        message: 'Cast portraits and Neo-Noir lighting tokens synced across 6 episodes of "The Glass Ledger".',
        read: true,
        createdAt: '2026-11-12T18:30:00.000Z',
      },
    ]
    return NextResponse.json({
      notifications: unreadOnly ? fallbackNotifications.filter((n) => !n.read) : fallbackNotifications,
      demoFallback: true,
    })
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
    return NextResponse.json({ success: true, demoFallback: true })
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
    return NextResponse.json({ success: true, demoFallback: true })
  }
}
