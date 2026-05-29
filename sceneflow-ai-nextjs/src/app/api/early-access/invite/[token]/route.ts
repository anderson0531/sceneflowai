import { NextRequest, NextResponse } from 'next/server'
import {
  findApplicationByInviteToken,
  isInviteExpired,
  isInviteRedeemed,
  maskEmail,
} from '@/lib/early-access/invite'

export const runtime = 'nodejs'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  if (!token || token.length < 16) {
    return NextResponse.json({ error: 'Invalid invite token' }, { status: 400 })
  }

  const data = await findApplicationByInviteToken(token)
  if (!data) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
  }

  const { application, review } = data

  if (review.status !== 'approved') {
    return NextResponse.json({ error: 'Invite is no longer valid' }, { status: 410 })
  }

  if (isInviteExpired(review)) {
    return NextResponse.json({ error: 'Invite has expired' }, { status: 410 })
  }

  return NextResponse.json({
    success: true,
    fullName: application.fullName,
    emailMasked: maskEmail(application.email),
    expiresAt: review.inviteExpiresAt,
    redeemed: isInviteRedeemed(review),
    activatedAt: review.activatedAt || null,
  })
}
