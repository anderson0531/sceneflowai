import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/admin/requireAdmin'
import { publishRate } from '@/lib/credits/rateCardStore'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await requireAdminSession()
  if (!session.authorized) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
  }

  const body = await req.json()
  if (!body.id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const published = await publishRate(String(body.id))
  return NextResponse.json({ published })
}
