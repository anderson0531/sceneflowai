/**
 * Seed Subscription Tiers
 * 
 * Seeds all subscription tiers with proper configuration
 */

import { SubscriptionTier, sequelize } from '@/models';

const SUBSCRIPTION_TIERS = [
  {
    name: 'coffee_break' as const,
    display_name: 'Trial',
    monthly_price_usd: 15.00,
    annual_price_usd: 15.00,
    included_credits_monthly: 1200,
    storage_gb: 10,
    max_resolution: '720p' as const,
    ai_model_access: 'standard' as const,
    byok_access: false,
    processing_priority: 'standard' as const,
    collaboration_seats: 1,
    is_active: true,
    is_one_time: true,
    max_projects: 3,
    max_scenes_per_project: 20,
    features: [
      '1,200 credits (one-time)',
      'Credits never expire',
      '10 GB storage',
      '720p max resolution',
      'Standard AI models',
      'Email support'
    ]
  },
  {
    name: 'starter' as const,
    display_name: 'Starter',
    monthly_price_usd: 49.00,
    annual_price_usd: 470.00,
    included_credits_monthly: 4500,
    storage_gb: 25,
    max_resolution: '1080p' as const,
    ai_model_access: 'standard' as const,
    byok_access: false,
    processing_priority: 'standard' as const,
    collaboration_seats: 1,
    is_active: true,
    is_one_time: false,
    max_projects: 10,
    max_scenes_per_project: 50,
    features: [
      '4,500 credits/month',
      '25 GB storage',
      '1080p max resolution',
      'Standard AI models',
      'Priority email support'
    ]
  },
  {
    name: 'pro' as const,
    display_name: 'Pro',
    monthly_price_usd: 149.00,
    annual_price_usd: 1430.00,
    included_credits_monthly: 15000,
    storage_gb: 100,
    max_resolution: '4K' as const,
    ai_model_access: 'premium' as const,
    byok_access: true,
    processing_priority: 'priority' as const,
    collaboration_seats: 3,
    is_active: true,
    is_one_time: false,
    max_projects: null, // Unlimited
    max_scenes_per_project: null, // Unlimited
    features: [
      '15,000 credits/month',
      '100 GB storage',
      '4K max resolution',
      'Premium AI models (Veo 3.1 Max)',
      'Voice cloning (3 slots)',
      'BYOK support',
      'Priority processing',
      '3 collaboration seats',
      'Priority support'
    ]
  },
  {
    name: 'studio' as const,
    display_name: 'Studio',
    monthly_price_usd: 449.00,
    annual_price_usd: 4310.00,
    included_credits_monthly: 50000,
    storage_gb: 500,
    max_resolution: '4K+' as const,
    ai_model_access: 'premium_beta' as const,
    byok_access: true,
    processing_priority: 'high' as const,
    collaboration_seats: 10,
    is_active: true,
    is_one_time: false,
    max_projects: null,
    max_scenes_per_project: null,
    features: [
      '50,000 credits/month',
      '500 GB storage',
      '4K+ max resolution',
      'Premium + Beta AI models',
      'Voice cloning (10 slots)',
      'BYOK support',
      'High priority processing',
      '10 collaboration seats',
      'Dedicated support'
    ]
  },
  {
    name: 'enterprise' as const,
    display_name: 'Enterprise',
    monthly_price_usd: 999.00,
    annual_price_usd: 9590.00,
    included_credits_monthly: 200000,
    storage_gb: 2000,
    max_resolution: '4K+' as const,
    ai_model_access: 'custom' as const,
    byok_access: true,
    processing_priority: 'dedicated' as const,
    collaboration_seats: 50,
    is_active: true,
    is_one_time: false,
    max_projects: null,
    max_scenes_per_project: null,
    features: [
      '200,000 credits/month',
      '2 TB storage',
      '4K+ max resolution',
      'Custom AI models',
      'Unlimited voice cloning',
      'BYOK support',
      'Dedicated infrastructure',
      '50 collaboration seats',
      'Dedicated account manager',
      'SLA guarantee'
    ]
  }
];

export async function seedSubscriptionTiers(): Promise<{
  created: string[];
  existing: string[];
  errors: string[];
}> {
  const created: string[] = [];
  const existing: string[] = [];
  const errors: string[] = [];

  try {
    await sequelize.authenticate();
    console.log('[Seed Tiers] Database connection established');

    for (const tierData of SUBSCRIPTION_TIERS) {
      try {
        // Check if tier already exists
        const existingTier = await SubscriptionTier.findOne({
          where: { name: tierData.name }
        });

        if (existingTier) {
          console.log(`[Seed Tiers] ${tierData.display_name} tier already exists`);
          existing.push(tierData.name);
          continue;
        }

        // Create the tier
        await SubscriptionTier.create(tierData as any);
        console.log(`[Seed Tiers] Created ${tierData.display_name} tier`);
        created.push(tierData.name);
      } catch (err) {
        console.error(`[Seed Tiers] Error creating ${tierData.name}:`, err);
        errors.push(tierData.name);
      }
    }

    return { created, existing, errors };
  } catch (error) {
    console.error('[Seed Tiers] Database error:', error);
    throw error;
  }
}
