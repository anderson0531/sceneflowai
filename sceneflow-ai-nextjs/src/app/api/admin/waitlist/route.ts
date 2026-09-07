import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/admin/requireAdmin'
import {
  countWaitlistRecords,
  filterWaitlistRecords,
  listWaitlistRecords,
  paginateWaitlistRecords,
  type WaitlistListFilter,
} from '@/lib/email/waitlistAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const FILTERS = new Set<WaitlistListFilter>([
  'all',
  'pending',
  'confirmed',
  'notified',
  'unsubscribed',
])

export async function GET(request: NextRequest) {
  const { authorized } = await requireAdminSession()
  if (!authorized) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const statusParam = request.nextUrl.searchParams.get('status') || 'all'
  const status = FILTERS.has(statusParam as WaitlistListFilter)
    ? (statusParam as WaitlistListFilter)
    : 'all'
  const offset = Number(request.nextUrl.searchParams.get('offset') || '0')
  const limit = Number(request.nextUrl.searchParams.get('limit') || '50')

  try {
    const records = await listWaitlistRecords()
    const filtered = filterWaitlistRecords(records, status)
    const page = paginateWaitlistRecords(filtered, offset, limit)

    return NextResponse.json({
      ok: true,
      counts: countWaitlistRecords(records),
      status,
      ...page,
    })
  } catch (error) {
    console.error('[admin/waitlist] list failed', error)
    return NextResponse.json({ error: 'Could not load the waitlist.' }, { status: 502 })
  }
}
