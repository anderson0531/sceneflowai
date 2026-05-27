import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { SubscriptionService } from '../../../../services/SubscriptionService'
import {
  createWhopCheckoutSession,
  handleDemoCheckout,
  isCheckoutConfigured,
} from '@/lib/billing/checkoutHelper'

/** @deprecated Use POST /api/billing/checkout with tierName=explorer */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const userEmail = session.user.email
    const tierName = 'explorer'

    const canPurchase = await SubscriptionService.canPurchaseOneTimeTier(userId, tierName)
    if (!canPurchase) {
      return NextResponse.json({
        error: 'Already purchased',
        message: 'Explorer can only be purchased once per account',
      }, { status: 400 })
    }

    if (!isCheckoutConfigured()) {
      if (process.env.NODE_ENV === 'development' || process.env.DEMO_MODE === 'true') {
        const demo = await handleDemoCheckout(userId, tierName)
        return NextResponse.json(demo)
      }

      return NextResponse.json({
        error: 'Payment processing not configured',
        message: 'Whop payment integration is not configured. Please contact support.',
      }, { status: 500 })
    }

    const checkout = await createWhopCheckoutSession(userId, tierName, userEmail)
    return NextResponse.json({
      success: true,
      sessionId: checkout.sessionId,
      planId: checkout.planId,
      tierName: checkout.tierName,
      returnUrl: checkout.returnUrl,
    })
  } catch (error: any) {
    console.error('[Explorer Purchase] Error:', error)
    return NextResponse.json({
      error: 'Purchase failed',
      message: error.message || 'An unexpected error occurred',
    }, { status: 500 })
  }
}
