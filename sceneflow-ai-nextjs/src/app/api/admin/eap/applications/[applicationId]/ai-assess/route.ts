import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/admin/requireAdmin'
import { getEapApplication, upsertEapReview } from '@/lib/early-access/applications'
import { assessEapApplication } from '@/lib/early-access/aiQualification'

export const runtime = 'nodejs'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  const admin = await requireAdminSession()
  if (!admin.authorized) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { applicationId } = await params
  const data = await getEapApplication(applicationId)
  if (!data) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 })
  }

  try {
    const aiAssessment = await assessEapApplication(data.application)
    const updated = await upsertEapReview(applicationId, {
      aiAssessment,
      status: data.review.status === 'new' ? 'in_review' : data.review.status,
      reviewer: admin.email || data.review.reviewer,
    })

    return NextResponse.json({ success: true, aiAssessment, ...updated })
  } catch (error: unknown) {
    console.error('[EAP AI Assess] Error:', error)
    const message = error instanceof Error ? error.message : 'AI assessment failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
