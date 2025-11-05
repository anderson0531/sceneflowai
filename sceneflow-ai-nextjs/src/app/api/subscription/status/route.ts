import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AuthService } from '@/services/AuthService'
import { SubscriptionService } from '@/services/SubscriptionService'
import { CreditService } from '@/services/CreditService'

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
      },
    })
  } catch (error) {
    console.error('[Subscription Status API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch subscription status' },
      { status: 500 }
    )
  }
}
