/**
 * Seed Subscription Tiers
 *
 * Seeds all subscription tiers from tierCatalog (single source of truth).
 */

import { SubscriptionTier, sequelize } from '@/models'
import { getSubscriptionTierSeedRows } from '@/lib/billing/tierCatalog'

const SUBSCRIPTION_TIERS = getSubscriptionTierSeedRows()

export async function seedSubscriptionTiers(): Promise<{
  created: string[]
  existing: string[]
  errors: string[]
}> {
  const created: string[] = []
  const existing: string[] = []
  const errors: string[] = []

  try {
    await sequelize.authenticate()
    console.log('[Seed Tiers] Database connection established')

    for (const tierData of SUBSCRIPTION_TIERS) {
      try {
        const existingTier = await SubscriptionTier.findOne({
          where: { name: tierData.name },
        })

        if (existingTier) {
          console.log(`[Seed Tiers] ${tierData.display_name} tier already exists`)
          existing.push(tierData.name)
          continue
        }

        await SubscriptionTier.create(tierData as any)
        console.log(`[Seed Tiers] Created ${tierData.display_name} tier`)
        created.push(tierData.name)
      } catch (err) {
        console.error(`[Seed Tiers] Error creating ${tierData.name}:`, err)
        errors.push(tierData.name)
      }
    }

    return { created, existing, errors }
  } catch (error) {
    console.error('[Seed Tiers] Database error:', error)
    throw error
  }
}
