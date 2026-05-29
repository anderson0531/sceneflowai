import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  createWhopCheckoutSession,
  handleDemoCheckout,
  isCheckoutConfigured,
  isValidCheckoutTier,
  shouldUseDemoCheckout,
} from '@/lib/billing/checkoutHelper'
import { isWhopPaymentEnabled } from '@/lib/billing/tierCatalog'
import {
  findApplicationByInviteToken,
  hashInviteToken,
  isInviteExpired,
} from '@/lib/early-access/invite'

export const runtime = 'nodejs'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const session = await getServerSession(authOptions as any)
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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

  if (review.inviteTokenHash !== hashInviteToken(token)) {
    return NextResponse.json({ error: 'Invalid invite token' }, { status: 400 })
  }

  if (application.email.trim().toLowerCase() !== session.user.email.trim().toLowerCase()) {
    return NextResponse.json(
      { error: 'Signed-in email must match the approved application email' },
      { status: 403 }
    )
  }

  const body = await request.json().catch(() => ({}))
  const tierName = typeof body.tierName === 'string' ? body.tierName : ''

  if (!tierName || !isValidCheckoutTier(tierName)) {
    return NextResponse.json(
      {
        error: 'Invalid tier',
        validTiers: ['explorer', 'starter', 'pro', 'studio'],
      },
      { status: 400 }
    )
  }

  const userId = session.user.id
  const userEmail = session.user.email

  if (!isWhopPaymentEnabled() || !isCheckoutConfigured()) {
    if (shouldUseDemoCheckout()) {
      const demo = await handleDemoCheckout(userId, tierName)
      return NextResponse.json(demo)
    }

    return NextResponse.json(
      {
        error: 'Payment processing not configured',
        message: 'Whop payment integration is not configured. Please contact support.',
      },
      { status: 500 }
    )
  }

  try {
    const checkout = await createWhopCheckoutSession(userId, tierName, userEmail, {
      application_id: application.applicationId,
      invite_token: token,
    })

    return NextResponse.json({
      success: true,
      sessionId: checkout.sessionId,
      planId: checkout.planId,
      tierName: checkout.tierName,
      returnUrl: checkout.returnUrl,
    })
  } catch (error: unknown) {
    console.error('[EAP Invite Checkout] Error:', error)
    const message = error instanceof Error ? error.message : 'Checkout failed'
    const status =
      message.includes('once per account') || message.includes('Invalid') ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
