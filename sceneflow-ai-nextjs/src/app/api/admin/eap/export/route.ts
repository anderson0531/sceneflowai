import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/admin/requireAdmin'
import { listEapApplications } from '@/lib/early-access/applications'

export const runtime = 'nodejs'

function csvEscape(value: unknown): string {
  const text = value == null ? '' : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

export async function GET(request: NextRequest) {
  const admin = await requireAdminSession()
  if (!admin.authorized) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const params = request.nextUrl.searchParams
  const status = (params.get('status') || 'all') as any
  const search = params.get('search') || ''
  const format = params.get('format') || 'csv'

  const result = await listEapApplications({ status, search, limit: 1000, page: 1, sort: 'newest' })
  if (format === 'json') {
    return NextResponse.json({ success: true, exportedAt: new Date().toISOString(), items: result.items })
  }

  const header = [
    'applicationId',
    'submittedAt',
    'fullName',
    'email',
    'countryOfOrigin',
    'organizationName',
    'primaryRole',
    'distributionChannel',
    'status',
    'scoreTotal',
    'reviewer',
  ]
  const lines = [header.join(',')]
  for (const item of result.items) {
    lines.push(
      [
        csvEscape(item.application.applicationId),
        csvEscape(item.application.submittedAt),
        csvEscape(item.application.fullName),
        csvEscape(item.application.email),
        csvEscape(item.application.countryOfOrigin),
        csvEscape(item.application.organizationName),
        csvEscape(item.application.primaryRole),
        csvEscape(item.application.distributionChannel),
        csvEscape(item.review.status),
        csvEscape(item.review.score?.total ?? ''),
        csvEscape(item.review.reviewer || ''),
      ].join(',')
    )
  }

  return new NextResponse(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="eap-applications-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
