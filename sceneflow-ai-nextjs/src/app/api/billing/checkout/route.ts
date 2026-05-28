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

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const tierName = body?.tierName as string | undefined

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

    const checkout = await createWhopCheckoutSession(userId, tierName, userEmail)

    return NextResponse.json({
      success: true,
      sessionId: checkout.sessionId,
      planId: checkout.planId,
      tierName: checkout.tierName,
      returnUrl: checkout.returnUrl,
    })
  } catch (error: any) {
    console.error('[Billing Checkout] Error:', error)

    const status =
      error.message?.includes('once per account') ||
      error.message?.includes('Invalid')
        ? 400
        : 500

    return NextResponse.json(
      {
        error: 'Checkout failed',
        message: error.message || 'An unexpected error occurred',
      },
      { status }
    )
  }
}
