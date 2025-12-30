/**
 * Seed Subscription Tiers
 * 
 * Seeds all subscription tiers with proper configuration
 */

import { SubscriptionTier, sequelize } from '@/models';

const SUBSCRIPTION_TIERS = [
  {
    name: 'trial' as const,
    display_name: 'Trial',
    monthly_price_usd: 4.99,
    annual_price_usd: 4.99,
    included_credits_monthly: 1500,
    storage_gb: 1,
    max_resolution: '1080p' as const,
    ai_model_access: 'standard' as const,
    byok_access: false,
    processing_priority: 'standard' as const,
    collaboration_seats: 0,
    is_active: true,
    is_one_time: true,
    max_projects: 1,
    max_scenes_per_project: 5,
    features: [
      '1,500 credits (one-time)',
      'Credits never expire',
      '1 GB storage',
      '1080p max resolution',
      'Veo 3.1 Fast',
      'Email support'
    ]
  },
  {
    name: 'starter' as const,
    display_name: 'Starter',
    monthly_price_usd: 49.00,
    annual_price_usd: 470.00,
    included_credits_monthly: 4500,
    storage_gb: 5,
    max_resolution: '1080p' as const,
    ai_model_access: 'standard' as const,
    byok_access: false,
    processing_priority: 'standard' as const,
    collaboration_seats: 2,
    is_active: true,
    is_one_time: false,
    max_projects: 5,
    max_scenes_per_project: 15,
    features: [
      '4,500 credits/month',
      '5 GB storage',
      '1080p max resolution',
      'Veo 3.1 Fast',
      '1 voice clone',
      'Priority email support'
    ]
  },
  {
    name: 'pro' as const,
    display_name: 'Pro',
    monthly_price_usd: 149.00,
    annual_price_usd: 1430.00,
    included_credits_monthly: 15000,
    storage_gb: 25,
    max_resolution: '4K' as const,
    ai_model_access: 'premium' as const,
    byok_access: true,
    processing_priority: 'priority' as const,
    collaboration_seats: 10,
    is_active: true,
    is_one_time: false,
    max_projects: 20,
    max_scenes_per_project: 50,
    features: [
      '15,000 credits/month',
      '25 GB storage',
      '4K max resolution (Veo 3.1 Quality)',
      '5 voice clones',
      'BYOK support',
      'Priority processing',
      '10 collaboration seats',
      'Priority support'
    ]
  },
  {
    name: 'studio' as const,
    display_name: 'Studio',
    monthly_price_usd: 599.00,
    annual_price_usd: 5750.00,
    included_credits_monthly: 75000,
    storage_gb: 100,
    max_resolution: '4K+' as const,
    ai_model_access: 'premium_beta' as const,
    byok_access: true,
    processing_priority: 'high' as const,
    collaboration_seats: 50,
    is_active: true,
    is_one_time: false,
    max_projects: 100,
    max_scenes_per_project: 200,
    features: [
      '75,000 credits/month',
      '100 GB storage',
      '4K+ max resolution',
      'Premium + Beta AI models',
      '25 voice clones',
      'BYOK support',
      'High priority processing',
      '50 collaboration seats',
      'Dedicated support'
    ]
  },
  {
    name: 'enterprise' as const,
    display_name: 'Enterprise',
    monthly_price_usd: 0.00, // Custom pricing
    annual_price_usd: 0.00, // Custom pricing
    included_credits_monthly: 200000,
    storage_gb: 10000, // Essentially unlimited
    max_resolution: '4K+' as const,
    ai_model_access: 'custom' as const,
    byok_access: true,
    processing_priority: 'dedicated' as const,
    collaboration_seats: 1000, // Unlimited
    is_active: true,
    is_one_time: false,
    max_projects: null, // Unlimited
    max_scenes_per_project: null, // Unlimited
    features: [
      '200,000+ credits/month (custom)',
      'Unlimited storage',
      '4K+ max resolution',
      'Custom AI models',
      'Unlimited voice clones',
      'BYOK support',
      'Dedicated infrastructure',
      'Unlimited collaboration seats',
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
