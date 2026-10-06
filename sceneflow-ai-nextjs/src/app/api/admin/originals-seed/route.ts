import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/admin/requireAdmin'
import { listOriginalsSeedRecords } from '@/lib/email/originalsSeed'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { authorized } = await requireAdminSession()
  if (!authorized) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const statusParam = request.nextUrl.searchParams.get('status') || 'all'
  const offset = Math.max(0, Number(request.nextUrl.searchParams.get('offset') || '0'))
  const limit = Math.min(200, Math.max(1, Number(request.nextUrl.searchParams.get('limit') || '50')))

  try {
    const records = await listOriginalsSeedRecords()
    const filtered =
      statusParam === 'pending' || statusParam === 'confirmed'
        ? records.filter((record) => record.status === statusParam)
        : records
    const items = filtered.slice(offset, offset + limit)
    const confirmed = records.filter((record) => record.status === 'confirmed').length

    return NextResponse.json({
      ok: true,
      counts: {
        total: records.length,
        pending: records.length - confirmed,
        confirmed,
      },
      status: statusParam,
      items,
      offset,
      limit,
      total: filtered.length,
    })
  } catch (error) {
    console.error('[admin/originals-seed] list failed', error)
    return NextResponse.json({ error: 'Could not load Seed applications.' }, { status: 502 })
  }
}
