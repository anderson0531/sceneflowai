import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/admin/requireAdmin'
import { getEapApplication, upsertEapReview } from '@/lib/early-access/applications'

export const runtime = 'nodejs'

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  const admin = await requireAdminSession()
  if (!admin.authorized) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { applicationId } = await params
  const data = await getEapApplication(applicationId)
  if (!data) return NextResponse.json({ error: 'Application not found' }, { status: 404 })
  return NextResponse.json({ success: true, ...data })
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
  const body = (await request.json()) as { status?: string; reviewer?: string }
  const status = body.status
  const reviewer = normalizeText(body.reviewer) || admin.email

  if (!status) {
    return NextResponse.json({ error: 'status is required' }, { status: 400 })
  }

  const updated = await upsertEapReview(applicationId, { status: status as any, reviewer })
  if (!updated) return NextResponse.json({ error: 'Application not found' }, { status: 404 })

  return NextResponse.json({ success: true, ...updated })
}
