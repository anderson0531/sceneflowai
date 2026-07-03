import { NextRequest, NextResponse } from 'next/server'
import '@/models'
import Notification from '@/models/Notification'
import { listNotificationsForUser } from '@/lib/jobs/jobService'
import { resolveUserId } from '@/lib/userHelper'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const userIdParam = req.nextUrl.searchParams.get('userId')
    const unreadOnly = req.nextUrl.searchParams.get('unreadOnly') === 'true'
    if (!userIdParam) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }
    
    try {
      const userId = await resolveUserId(userIdParam)
      const notifications = await listNotificationsForUser(userId, unreadOnly)
      return NextResponse.json({ notifications })
    } catch (err: any) {
      if (err?.message?.includes('User not found')) {
         return NextResponse.json({ notifications: [] })
      }
      throw err
    }
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId: userIdParam, notificationIds, markAllRead } = body
    if (!userIdParam) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    try {
      const userId = await resolveUserId(userIdParam)

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
       if (err?.message?.includes('User not found')) {
         return NextResponse.json({ success: true })
       }
       throw err
    }
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}
