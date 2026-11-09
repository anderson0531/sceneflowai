import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/admin/requireAdmin'
import {
  listSupportErrorReports,
  updateSupportErrorReportStatus,
  type SupportReportStatus,
} from '@/lib/support/generationErrorReport'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const admin = await requireAdminSession()
  if (!admin.authorized) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const limitParam = Number(request.nextUrl.searchParams.get('limit') || '50')
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 50
  const reports = await listSupportErrorReports(limit)

  return NextResponse.json({
    success: true,
    reports,
  })
}

export async function PATCH(request: NextRequest) {
  const admin = await requireAdminSession()
  if (!admin.authorized) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    ticketId?: string
    status?: SupportReportStatus
  }
  const ticketId = body.ticketId?.trim()
  const status: SupportReportStatus = body.status === 'resolved' ? 'resolved' : 'open'

  if (!ticketId) {
    return NextResponse.json({ error: 'ticketId is required' }, { status: 400 })
  }

  const updated = await updateSupportErrorReportStatus(ticketId, status, admin.email || undefined)
  if (!updated) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  return NextResponse.json({
    success: true,
    report: updated,
  })
}
