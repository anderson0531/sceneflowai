import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/admin/requireAdmin'
import { updateEapScore } from '@/lib/early-access/applications'

export const runtime = 'nodejs'

function toBoundScore(value: unknown): number {
  const num = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(num)) return 0
  return Math.max(0, Math.min(5, Math.round(num)))
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  const admin = await requireAdminSession()
  if (!admin.authorized || !admin.email) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { applicationId } = await params
  const body = (await request.json()) as {
    agencyLead?: number
    seriesCreator?: number
    techEnthusiast?: number
    casualCreator?: number
  }

  const updated = await updateEapScore(
    applicationId,
    {
      agencyLead: toBoundScore(body.agencyLead),
      seriesCreator: toBoundScore(body.seriesCreator),
      techEnthusiast: toBoundScore(body.techEnthusiast),
      casualCreator: toBoundScore(body.casualCreator),
    },
    admin.email
  )

  if (!updated) return NextResponse.json({ error: 'Application not found' }, { status: 404 })
  return NextResponse.json({ success: true, ...updated })
}
