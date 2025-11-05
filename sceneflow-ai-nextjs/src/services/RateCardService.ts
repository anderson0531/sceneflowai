import { RateCard } from '@/models'
import { Op } from 'sequelize'
import { migrateRateCard } from '@/lib/database/migrateRateCard'

// Cache to prevent multiple concurrent migrations
let rateCardMigrationInProgress = false
let rateCardMigrationCompleted = false

/**
 * Helper to ensure rate_cards table exists with ENUM types
 */
async function ensureRateCardMigrationRan(): Promise<void> {
  // If migration already completed, skip
  if (rateCardMigrationCompleted) return
  
  // If migration is in progress, wait for it
  if (rateCardMigrationInProgress) {
    // Wait up to 10 seconds for migration to complete
    for (let i = 0; i < 100; i++) {
      await new Promise(resolve => setTimeout(resolve, 100))
      if (rateCardMigrationCompleted) return
    }
    // Don't throw error, just log warning
    console.warn('[RateCardService] Rate card migration timeout')
    return
  }

  // Run migration
  rateCardMigrationInProgress = true
  try {
    console.log('[RateCardService] Auto-running rate_cards migration...')
    await migrateRateCard()
    rateCardMigrationCompleted = true
    console.log('[RateCardService] Rate card migration completed successfully')
  } catch (error: any) {
    rateCardMigrationInProgress = false
    // If table already exists, mark as completed
    if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
      rateCardMigrationCompleted = true
      return
    }
    console.error('[RateCardService] Rate card migration failed:', error)
    // Don't throw - let the code continue and handle gracefully
  } finally {
    rateCardMigrationInProgress = false
  }
}

export class RateCardService {
  /**
   * Get current active rate for a service
   */
  static async getRate(
    category: RateCard['service_category'],
    serviceName: string
  ): Promise<RateCard | null> {
    // Ensure migration is run before querying
    await ensureRateCardMigrationRan()
    
    const now = new Date()
    
    return await RateCard.findOne({
      where: {
        service_category: category,
        service_name: serviceName,
        is_active: true,
        effective_from: { [Op.lte]: now },
        [Op.or]: [
          { effective_to: null },
          { effective_to: { [Op.gte]: now } },
        ],
      },
      order: [['effective_from', 'DESC']],
    })
  }

  /**
   * Calculate credits needed for an action
   */
  static async calculateCredits(
    category: RateCard['service_category'],
    serviceName: string,
    units: number,
    hasBYOK: boolean = false
  ): Promise<number> {
    const rate = await this.getRate(category, serviceName)
    
    if (!rate) {
      throw new Error(`Rate not found for ${category}/${serviceName}`)
    }

    const creditsPerUnit = hasBYOK ? rate.byok_credits_per_unit : rate.credits_per_unit
    
    return Math.ceil(creditsPerUnit * units)
  }

  /**
   * Get all active rates (for display)
   */
  static async getAllActiveRates(): Promise<RateCard[]> {
    // Ensure migration is run before querying
    await ensureRateCardMigrationRan()
    
    const now = new Date()
    
    return await RateCard.findAll({
      where: {
        is_active: true,
        effective_from: { [Op.lte]: now },
        [Op.or]: [
          { effective_to: null },
          { effective_to: { [Op.gte]: now } },
        ],
      },
      order: [
        ['service_category', 'ASC'],
        ['quality_tier', 'ASC'],
        ['service_name', 'ASC'],
      ],
    })
  }

  /**
   * Get rates by category
   */
  static async getRatesByCategory(
    category: RateCard['service_category']
  ): Promise<RateCard[]> {
    // Ensure migration is run before querying
    await ensureRateCardMigrationRan()
    
    const now = new Date()
    
    return await RateCard.findAll({
      where: {
        service_category: category,
        is_active: true,
        effective_from: { [Op.lte]: now },
        [Op.or]: [
          { effective_to: null },
          { effective_to: { [Op.gte]: now } },
        ],
      },
      order: [['quality_tier', 'ASC']],
    })
  }

  /**
   * Admin: Update rate card
   */
  static async updateRate(
    id: string,
    updates: Partial<RateCard>
  ): Promise<void> {
    const rate = await RateCard.findByPk(id)
    
    if (!rate) {
      throw new Error(`Rate card not found: ${id}`)
    }

    await rate.update(updates)
  }

  /**
   * Admin: Create new rate card
   */
  static async createRate(
    data: Omit<RateCard, 'id' | 'created_at' | 'updated_at'>
  ): Promise<RateCard> {
    return await RateCard.create(data)
  }

  /**
   * Admin: Deactivate old rates when creating new ones
   */
  static async deactivateOldRates(
    category: RateCard['service_category'],
    serviceName: string
  ): Promise<void> {
    const now = new Date()
    
    await RateCard.update(
      { effective_to: now },
      {
        where: {
          service_category: category,
          service_name: serviceName,
          is_active: true,
          effective_to: null,
        },
      }
    )
  }
}
