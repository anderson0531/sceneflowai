import { RateCard, sequelize } from '../models'

export async function seedRateCards() {
  try {
    await sequelize.authenticate()
    console.log('Database connection established.')
    
    // Check if rates already exist
    const existingCount = await RateCard.count()
    if (existingCount > 0) {
      console.log(`Rate cards already exist (${existingCount}). Skipping seed.`)
      return
    }
    
    const rates = [
      // TTS Rates
      {
        service_category: 'tts' as const,
        service_name: 'Standard Voice',
        quality_tier: 'standard' as const,
        credits_per_unit: 4, // per 100 chars
        byok_credits_per_unit: 1,
        unit_description: 'per 100 characters',
        provider_cost_usd: 0.0001,
        is_active: true,
        effective_from: new Date()
      },
      {
        service_category: 'tts' as const,
        service_name: 'Ultra-Realistic',
        quality_tier: 'premium' as const,
        credits_per_unit: 10,
        byok_credits_per_unit: 2,
        unit_description: 'per 100 characters',
        provider_cost_usd: 0.0003,
        is_active: true,
        effective_from: new Date()
      },
      
      // Image Generation Rates
      {
        service_category: 'image_gen' as const,
        service_name: 'Standard Image',
        quality_tier: 'standard' as const,
        credits_per_unit: 10,
        byok_credits_per_unit: 2,
        unit_description: 'per image',
        provider_cost_usd: 0.02,
        is_active: true,
        effective_from: new Date()
      },
      {
        service_category: 'image_gen' as const,
        service_name: 'Premium Image',
        quality_tier: 'premium' as const,
        credits_per_unit: 30,
        byok_credits_per_unit: 6,
        unit_description: 'per image',
        provider_cost_usd: 0.08,
        is_active: true,
        effective_from: new Date()
      },
      
      // Video Generation Rates
      {
        service_category: 'video_gen' as const,
        service_name: '720p',
        quality_tier: 'standard' as const,
        credits_per_unit: 20,
        byok_credits_per_unit: 4,
        unit_description: 'per second',
        provider_cost_usd: 0.05,
        is_active: true,
        effective_from: new Date()
      },
      {
        service_category: 'video_gen' as const,
        service_name: '1080p',
        quality_tier: 'premium' as const,
        credits_per_unit: 35,
        byok_credits_per_unit: 7,
        unit_description: 'per second',
        provider_cost_usd: 0.10,
        is_active: true,
        effective_from: new Date()
      }
    ]
    
    for (const rate of rates) {
      await RateCard.create(rate as any)
    }
    
    console.log(`Successfully seeded ${rates.length} rate cards.`)
  } catch (error) {
    console.error('Error seeding rate cards:', error)
    throw error
  }
}

// Run if called directly
if (require.main === module) {
  seedRateCards()
    .then(() => {
      console.log('Seed completed successfully.')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Seed failed:', error)
      process.exit(1)
    })
}
