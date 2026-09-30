import { NextResponse } from 'next/server'
import { getSessionUserId } from '@/lib/auth/sessionUser'
import { vapidConfig } from '@/lib/notifications/webPush'

export const dynamic = 'force-dynamic'

export async function GET() {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ enabled: false })
  }
  const config = vapidConfig()
  if (!config) {
    return NextResponse.json({ enabled: false })
  }
  return NextResponse.json({ enabled: true, publicKey: config.publicKey })
}
