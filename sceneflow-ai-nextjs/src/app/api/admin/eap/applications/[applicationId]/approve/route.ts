import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/admin/requireAdmin'
import { getEapApplication, upsertEapReview } from '@/lib/early-access/applications'
import { sendApplicationApprovedEmail } from '@/lib/email/templates/eap'
import {
  buildInviteUrl,
  generateInviteToken,
  getInviteExpiryDate,
  hashInviteToken,
  isInviteExpired,
} from '@/lib/early-access/invite'

export const runtime = 'nodejs'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  const admin = await requireAdminSession()
  if (!admin.authorized || !admin.email) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { applicationId } = await params
  const data = await getEapApplication(applicationId)
  if (!data) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 })
  }

  const { application, review } = data
  let inviteToken: string | null = null
  let inviteUrl: string | null = null
  let inviteExpiresAt = review.inviteExpiresAt || getInviteExpiryDate()
  let inviteSentAt = review.inviteSentAt
  let inviteTokenHash = review.inviteTokenHash

  const hasValidExistingInvite =
    review.inviteTokenHash && review.inviteSentAt && !isInviteExpired(review)

  if (hasValidExistingInvite) {
    return NextResponse.json({
      success: true,
      alreadySent: true,
      inviteSentAt: review.inviteSentAt,
      inviteExpiresAt: review.inviteExpiresAt,
      application,
      review,
    })
  }

  inviteToken = generateInviteToken()
  inviteTokenHash = hashInviteToken(inviteToken)
  inviteExpiresAt = getInviteExpiryDate()
  inviteUrl = buildInviteUrl(inviteToken)
  inviteSentAt = new Date().toISOString()

  const updated = await upsertEapReview(applicationId, {
    status: 'approved',
    reviewer: admin.email,
    inviteTokenHash,
    inviteExpiresAt,
    inviteSentAt,
    approvedTier: null,
  })

  if (!updated) {
    return NextResponse.json({ error: 'Failed to update review' }, { status: 500 })
  }

  try {
    await sendApplicationApprovedEmail(application.email, {
      fullName: application.fullName,
      inviteUrl,
      expiresAt: inviteExpiresAt,
    })
  } catch (error) {
    console.error('[EAP Approve] Invite email failed:', error)
    return NextResponse.json(
      { error: 'Approved but failed to send invite email. Retry approve to resend.' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    inviteSentAt,
    inviteExpiresAt,
    inviteUrl: process.env.NODE_ENV === 'development' ? inviteUrl : undefined,
    ...updated,
  })
}
