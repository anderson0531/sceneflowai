import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  createWhopAddonCheckoutSession,
  createWhopCheckoutSession,
  handleDemoCheckout,
  isCheckoutConfigured,
  isValidAddonPack,
  isValidCheckoutTier,
  shouldUseDemoCheckout,
} from '@/lib/billing/checkoutHelper'
import { ensureWhopRuntimeConfig } from '@/lib/billing/whopClient'
import { CHECKOUT_TIER_NAMES, isWhopPaymentEnabled } from '@/lib/billing/tierCatalog'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await ensureWhopRuntimeConfig()

    const body = await req.json()
    const rawTarget = (body?.addonPack || body?.tierName || body?.tier) as string | undefined

    const userId = session.user.id
    const userEmail = session.user.email

    if (rawTarget && isValidAddonPack(rawTarget)) {
      if (!isWhopPaymentEnabled() || !isCheckoutConfigured()) {
        if (shouldUseDemoCheckout()) {
          const demo = await handleDemoCheckout(userId, rawTarget)
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

      const addonCheckout = await createWhopAddonCheckoutSession(userId, rawTarget, userEmail)
      return NextResponse.json({
        success: true,
        sessionId: addonCheckout.sessionId,
        planId: addonCheckout.planId,
        tierName: addonCheckout.tierName,
        returnUrl: addonCheckout.returnUrl,
        purchaseUrl: addonCheckout.purchaseUrl,
        redirectUrl: addonCheckout.purchaseUrl,
      })
    }

    const tierName = rawTarget
    if (!tierName || !isValidCheckoutTier(tierName)) {
      return NextResponse.json(
        {
          error: 'Invalid tier',
          validTiers: CHECKOUT_TIER_NAMES,
          validAddonPacks: ['addon_25', 'addon_100', 'addon_250'],
        },
        { status: 400 }
      )
    }

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
      purchaseUrl: checkout.purchaseUrl,
      redirectUrl: checkout.purchaseUrl,
    })
  } catch (error: any) {
    console.error('[Billing Checkout] Error:', error)

    const status = error.message?.includes('require an active monthly subscription')
      ? 403
      : error.message?.includes('once per account') || error.message?.includes('Invalid')
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
