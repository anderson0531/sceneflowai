/**
 * Test Plan Switch API Route (Development/Testing Only)
 * 
 * POST /api/admin/test/switch-plan
 * 
 * Allows switching subscription plans without Paddle payment for testing.
 * This endpoint should be disabled or removed in production.
 * 
 * Request body:
 * {
 *   "tierName": "pro" | "studio" | "starter" | "coffee_break" | "enterprise",
 *   "grantCredits": true  // optional, whether to grant tier's monthly credits
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { User, SubscriptionTier, CreditLedger, sequelize } from '@/models';
import { resolveUser } from '@/lib/userHelper';

// Valid tier names
const VALID_TIERS = ['coffee_break', 'starter', 'pro', 'studio', 'enterprise'] as const;
type TierName = typeof VALID_TIERS[number];

// Credit amounts per tier
const TIER_CREDITS: Record<TierName, number> = {
  coffee_break: 1200,
  starter: 4500,
  pro: 15000,
  studio: 50000,
  enterprise: 200000,
};

interface SwitchPlanRequest {
  tierName: TierName;
  grantCredits?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    // Check if this feature is enabled (only in development or with test flag)
    const isTestMode = process.env.ENABLE_TEST_PLAN_SWITCH === 'true' || 
                       process.env.NODE_ENV === 'development';
    
    if (!isTestMode) {
      return NextResponse.json(
        { error: 'Test plan switching is disabled in production' },
        { status: 403 }
      );
    }

    // Get authenticated user
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - must be logged in' },
        { status: 401 }
      );
    }

    const sessionUserId = session.user.id;
    const body = await request.json() as SwitchPlanRequest;
    const { tierName, grantCredits = true } = body;

    // Validate tier name
    if (!tierName || !VALID_TIERS.includes(tierName)) {
      return NextResponse.json(
        { 
          error: 'Invalid tier name',
          validTiers: VALID_TIERS,
        },
        { status: 400 }
      );
    }

    console.log(`[Test Plan Switch] Starting - session user: ${sessionUserId}, tier: ${tierName}`);

    // Resolve user (handles email-as-ID from session)
    let resolvedUser;
    try {
      resolvedUser = await resolveUser(sessionUserId);
      console.log(`[Test Plan Switch] Resolved user: ${resolvedUser.id}`);
    } catch (resolveError) {
      console.error('[Test Plan Switch] Failed to resolve user:', resolveError);
      return NextResponse.json(
        { error: 'Failed to resolve user', details: resolveError instanceof Error ? resolveError.message : 'Unknown' },
        { status: 500 }
      );
    }
    const userId = resolvedUser.id;

    console.log(`[Test Plan Switch] User ${userId} switching to ${tierName}`);

    // Find the subscription tier
    const tier = await SubscriptionTier.findOne({
      where: { name: tierName },
    });

    if (!tier) {
      return NextResponse.json(
        { error: `Subscription tier "${tierName}" not found in database` },
        { status: 404 }
      );
    }

    // Update user's subscription in a transaction
    const result = await sequelize.transaction(async (tx) => {
      const user = await User.findByPk(userId, { 
        transaction: tx, 
        lock: tx.LOCK.UPDATE 
      });

      if (!user) {
        throw new Error('User not found');
      }

      const prevTierId = user.subscription_tier_id;
      const prevCredits = Number(user.credits || 0);

      // Update subscription fields
      user.subscription_tier_id = tier.id;
      user.subscription_status = 'active';
      user.subscription_start_date = new Date();
      
      // Set end date to 30 days from now (for testing)
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);
      user.subscription_end_date = endDate;

      // Optionally grant credits
      let creditsGranted = 0;
      if (grantCredits) {
        creditsGranted = TIER_CREDITS[tierName] || Number(tier.included_credits_monthly) || 0;
        
        // Set subscription credits
        user.subscription_credits_monthly = creditsGranted;
        
        // Set expiration to end of billing period
        user.subscription_credits_expires_at = endDate;
        
        // Update total credits (keep addon credits, replace subscription credits)
        const addonCredits = Number(user.addon_credits || 0);
        user.credits = addonCredits + creditsGranted;

        // Log credit grant
        await CreditLedger.create({
          user_id: userId,
          delta_credits: creditsGranted,
          prev_balance: prevCredits,
          new_balance: Number(user.credits),
          reason: 'adjustment',
          credit_type: 'subscription',
          ref: `test_plan_switch_${tierName}`,
          meta: { 
            tier: tierName, 
            test_mode: true,
            previous_tier_id: prevTierId,
            type: 'subscription_allocation',
          } as any,
        }, { transaction: tx });
      }

      await user.save({ transaction: tx });

      return {
        userId,
        previousTierId: prevTierId,
        newTier: {
          id: tier.id,
          name: tier.name,
          display_name: tier.display_name,
        },
        subscription: {
          status: user.subscription_status,
          startDate: user.subscription_start_date,
          endDate: user.subscription_end_date,
        },
        credits: {
          granted: creditsGranted,
          subscriptionCredits: Number(user.subscription_credits_monthly),
          addonCredits: Number(user.addon_credits || 0),
          totalCredits: Number(user.credits),
        },
      };
    });

    console.log(`[Test Plan Switch] Successfully switched user ${userId} to ${tierName}`);

    return NextResponse.json({
      success: true,
      message: `Successfully switched to ${tier.display_name} plan`,
      ...result,
    });
  } catch (error) {
    console.error('[Test Plan Switch] Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to switch plan',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/test/switch-plan
 * 
 * Returns available tiers and current user's subscription status
 */
export async function GET(request: NextRequest) {
  try {
    // Check if this feature is enabled
    const isTestMode = process.env.ENABLE_TEST_PLAN_SWITCH === 'true' || 
                       process.env.NODE_ENV === 'development';
    
    if (!isTestMode) {
      return NextResponse.json(
        { error: 'Test plan switching is disabled in production' },
        { status: 403 }
      );
    }

    // Get authenticated user
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - must be logged in' },
        { status: 401 }
      );
    }

    const sessionUserId = session.user.id;

    // Resolve user (handles email-as-ID from session)
    const resolvedUser = await resolveUser(sessionUserId);
    const userId = resolvedUser.id;

    // Get available tiers
    const tiers = await SubscriptionTier.findAll({
      where: { is_active: true },
      order: [['monthly_price_usd', 'ASC']],
    });

    // Get user's current subscription with tier included
    const user = await User.findByPk(userId, {
      include: [{
        model: SubscriptionTier,
        as: 'subscriptionTier',
        required: false,
      }],
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const currentTier = (user as any).subscriptionTier;

    return NextResponse.json({
      testModeEnabled: true,
      currentSubscription: {
        tier: currentTier ? {
          id: currentTier.id,
          name: currentTier.name,
          display_name: currentTier.display_name,
        } : null,
        status: user.subscription_status,
        startDate: user.subscription_start_date,
        endDate: user.subscription_end_date,
        credits: {
          subscription: Number(user.subscription_credits_monthly || 0),
          addon: Number(user.addon_credits || 0),
          total: Number(user.credits || 0),
        },
      },
      availableTiers: tiers.map(tier => ({
        name: tier.name,
        display_name: tier.display_name,
        monthly_price_usd: Number(tier.monthly_price_usd),
        included_credits_monthly: Number(tier.included_credits_monthly),
        storage_gb: tier.storage_gb,
        features: tier.features,
        hasVoiceCloning: tier.hasVoiceCloning(),
        voiceCloneSlots: tier.getVoiceCloneSlots(),
      })),
    });
  } catch (error) {
    console.error('[Test Plan Switch] GET Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get subscription info',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
