import { SubscriptionTier, sequelize } from '../models'

export async function seedTrialTier() {
  try {
    await sequelize.authenticate()
    console.log('Database connection established.')
    
    // Check if Trial tier already exists
    const existing = await SubscriptionTier.findOne({ where: { name: 'trial' } })
    if (existing) {
      console.log('Trial tier already exists. Skipping seed.')
      return
    }
    
    const trialTier = {
      name: 'trial' as const,
      display_name: 'Trial',
      monthly_price_usd: 5.00,
      annual_price_usd: 5.00, // Same as monthly (one-time)
      included_credits_monthly: 0, // No monthly credits
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
        '1,000 credits (one-time)',
        'Credits never expire',
        '$10 value for $5',
        '10 GB storage',
        '720p max resolution',
        'Standard AI models',
        '3 active projects max',
        '20 scenes per project',
        'Email support'
      ]
    }
    
    await SubscriptionTier.create(trialTier as any)
    
    console.log('Successfully seeded Trial tier.')
  } catch (error) {
    console.error('Error seeding Trial tier:', error)
    throw error
  }
}

// Run if called directly
if (require.main === module) {
  seedTrialTier()
    .then(() => {
      console.log('Seed completed successfully.')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Seed failed:', error)
      process.exit(1)
    })
}
