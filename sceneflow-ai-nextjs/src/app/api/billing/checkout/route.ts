import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  createWhopAddonCheckoutSession,
  createWhopCharterCheckoutSession,
  createWhopCheckoutSession,
  handleDemoCheckout,
  isCheckoutConfigured,
  isValidAddonPack,
  isValidCharterOffer,
  isValidCheckoutTier,
  shouldUseDemoCheckout,
} from '@/lib/billing/checkoutHelper'
import { ensureWhopRuntimeConfig } from '@/lib/billing/whopClient'
import {
  CHECKOUT_TIER_NAMES,
  isCharterWhopPlanConfigured,
  isWhopPaymentEnabled,
} from '@/lib/billing/tierCatalog'
import {
  isPrelaunchAccessModeEnabled,
  PRELAUNCH_CHECKOUT_BLOCKED_MESSAGE,
} from '@/lib/billing/prelaunchAccess'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as any)) as {
      user?: { id?: string; email?: string | null }
    } | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (isPrelaunchAccessModeEnabled()) {
      return NextResponse.json(
        {
          error: 'PRELAUNCH_ACCESS_ONLY',
          prelaunchOnly: true,
          message: PRELAUNCH_CHECKOUT_BLOCKED_MESSAGE,
        },
        { status: 403 }
      )
    }

    await ensureWhopRuntimeConfig()

    const body = await req.json()
    const rawTarget = (body?.charterOffer ||
      body?.addonPack ||
      body?.tierName ||
      body?.tier) as string | undefined

    const userId = session.user.id
    const userEmail = session.user.email

    if (rawTarget && isValidCharterOffer(rawTarget)) {
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

      // Graceful fallback to Pro ($149/mo) if WHOP_PLAN_FOUNDING_OPERATOR is not yet pasted into env
      if (!isCharterWhopPlanConfigured('founding_operator')) {
        const proFallback = await createWhopCheckoutSession(userId, 'pro', userEmail, {
          requested_charter_offer: rawTarget,
        })
        return NextResponse.json({
          success: true,
          sessionId: proFallback.sessionId,
          planId: proFallback.planId,
          tierName: proFallback.tierName,
          returnUrl: proFallback.returnUrl,
          purchaseUrl: proFallback.purchaseUrl,
          redirectUrl: proFallback.purchaseUrl,
          fallbackToPro: true,
        })
      }

      const charterCheckout = await createWhopCharterCheckoutSession(userId, rawTarget, userEmail)
      return NextResponse.json({
        success: true,
        sessionId: charterCheckout.sessionId,
        planId: charterCheckout.planId,
        tierName: charterCheckout.tierName,
        returnUrl: charterCheckout.returnUrl,
        purchaseUrl: charterCheckout.purchaseUrl,
        redirectUrl: charterCheckout.purchaseUrl,
      })
    }

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
