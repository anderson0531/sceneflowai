import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import { AuthService } from '../../../../services/AuthService'
import { SubscriptionService } from '../../../../services/SubscriptionService'
import { CreditService } from '../../../../services/CreditService'
import { resolveUser } from '@/lib/userHelper'
import { SANDBOX_CREDITS } from '@/lib/demo/uiSandboxProject'
import { reconcileWhopUserPayments } from '@/lib/billing/whopReconcile'

/**
 * GET /api/subscription/status
 * Get user's subscription details and credit breakdown
 */
export async function GET(req: NextRequest) {
  try {
    // Get user ID from session or token
    let userId: string | null = null

    try {
      const session: any = await getServerSession(authOptions as any)
      if (session && session.user) {
        userId = session.user.id || null
      }
    } catch {}

    if (!userId) {
      const auth = req.headers.get('authorization') || ''
      const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
      if (token) {
        const vr = await AuthService.verifyToken(token)
        if (vr.success && vr.user) {
          userId = vr.user.id
        }
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let user = await resolveUser(userId)

    const shouldReconcile = req.nextUrl.searchParams.get('reconcile') === '1'
    if (shouldReconcile) {
      const reconciled = await reconcileWhopUserPayments({
        id: user.id,
        email: user.email,
        whop_user_id: user.whop_user_id,
      })
      if (reconciled.fulfilledPayments.length > 0) {
        user = await resolveUser(userId)
      }
    }

    const subscription = await SubscriptionService.getUserSubscription(userId)
    const credits = await CreditService.getCreditBreakdown(userId)

    return NextResponse.json({
      success: true,
      subscription: {
        tier: subscription.tier ? {
          id: subscription.tier.id,
          name: subscription.tier.name,
          display_name: subscription.tier.display_name,
          monthly_price_usd: Number(subscription.tier.monthly_price_usd),
          annual_price_usd: Number(subscription.tier.annual_price_usd),
          included_credits_monthly: Number(subscription.tier.included_credits_monthly),
          storage_gb: subscription.tier.storage_gb,
          max_resolution: subscription.tier.max_resolution,
          ai_model_access: subscription.tier.ai_model_access,
          byok_access: subscription.tier.byok_access,
          processing_priority: subscription.tier.processing_priority,
          collaboration_seats: subscription.tier.collaboration_seats,
          features: subscription.tier.features,
        } : null,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        monthlyCredits: subscription.monthlyCredits,
        creditsExpiresAt: subscription.creditsExpiresAt,
      },
      credits: {
        subscription_credits: credits.subscription_credits,
        subscription_expires_at: credits.subscription_expires_at,
        addon_credits: credits.addon_credits,
        total_credits: credits.total_credits,
        pack_expires_at: credits.pack_expires_at,
      },
      one_time_tiers_purchased: user.one_time_tiers_purchased || [],
    })
  } catch (error) {
    console.error('[Subscription Status API] Error:', error)
    return NextResponse.json({
      success: true,
      subscription: {
        tier: null,
        status: null,
        startDate: null,
        endDate: null,
        monthlyCredits: 0,
        creditsExpiresAt: null,
      },
      credits: {
        subscription_credits: 0,
        subscription_expires_at: null,
        addon_credits: 0,
        total_credits: 0,
        pack_expires_at: null,
      },
      one_time_tiers_purchased: [],
      databaseUnavailable: true,
    })
  }
}
