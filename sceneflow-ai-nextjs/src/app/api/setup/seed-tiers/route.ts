/**
 * Seed Subscription Tiers API Route
 * 
 * POST /api/setup/seed-tiers
 * 
 * Seeds the subscription_tiers table with all available plans.
 * Safe to call multiple times - skips existing tiers.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { seedSubscriptionTiers } from '@/lib/database/seedSubscriptionTiers';
import { SubscriptionTier } from '@/models';

export async function POST(request: NextRequest) {
  try {
    // Check for setup token or admin auth
    const { searchParams } = new URL(request.url);
    const setupToken = searchParams.get('setup_token');
    const hasSetupToken = setupToken === 'initial_setup_2025';
    
    const session = await getServerSession(authOptions);
    const isAdmin = session?.user?.email?.endsWith('@sceneflow.ai') || 
                   session?.user?.email === 'brian@sceneflow.ai' ||
                   process.env.NODE_ENV === 'development';
    
    if (!isAdmin && !hasSetupToken) {
      return NextResponse.json(
        { error: 'Unauthorized - admin access required' },
        { status: 403 }
      );
    }

    console.log('[Seed Tiers] Starting seed...');
    
    const result = await seedSubscriptionTiers();

    return NextResponse.json({
      success: true,
      message: 'Subscription tiers seeded successfully',
      ...result,
    });
  } catch (error) {
    console.error('[Seed Tiers] Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to seed tiers',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/setup/seed-tiers
 * 
 * Returns current tier status
 */
export async function GET() {
  try {
    const tiers = await SubscriptionTier.findAll({
      order: [['monthly_price_usd', 'ASC']],
    });

    return NextResponse.json({
      count: tiers.length,
      tiers: tiers.map(tier => ({
        name: tier.name,
        display_name: tier.display_name,
        monthly_price_usd: Number(tier.monthly_price_usd),
        included_credits_monthly: Number(tier.included_credits_monthly),
        is_active: tier.is_active,
        hasVoiceCloning: tier.hasVoiceCloning(),
        voiceCloneSlots: tier.getVoiceCloneSlots(),
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to get tiers',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
