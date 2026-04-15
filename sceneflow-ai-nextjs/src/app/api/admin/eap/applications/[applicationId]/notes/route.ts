import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/admin/requireAdmin'
import { addEapReviewNote } from '@/lib/early-access/applications'

export const runtime = 'nodejs'

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  const admin = await requireAdminSession()
  if (!admin.authorized || !admin.email) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { applicationId } = await params
  const body = (await request.json()) as { body?: string }
  const noteBody = normalizeText(body.body)
  if (!noteBody) {
    return NextResponse.json({ error: 'Note body is required' }, { status: 400 })
  }

  const updated = await addEapReviewNote(applicationId, noteBody, admin.email)
  if (!updated) return NextResponse.json({ error: 'Application not found' }, { status: 404 })

  return NextResponse.json({ success: true, ...updated })
}
