import { User, SubscriptionTier, CreditLedger, Project, sequelize } from '@/models'
import { Op } from 'sequelize'
import { resolveUser } from '@/lib/userHelper'

export interface SubscriptionDetails {
  tier: SubscriptionTier | null
  status: 'active' | 'cancelled' | 'expired' | 'trial' | null
  startDate: Date | null
  endDate: Date | null
  monthlyCredits: number
  creditsExpiresAt: Date | null
}

export class SubscriptionService {
  /**
   * Get user's current subscription details
   */
  static async getUserSubscription(userId: string): Promise<SubscriptionDetails> {
    const resolvedUser = await resolveUser(userId)
    const user = await User.findByPk(resolvedUser.id, {
      include: [
        {
          model: SubscriptionTier,
          as: 'subscriptionTier',
        },
      ],
    })

    if (!user) {
      throw new Error('User not found')
    }

    return {
      tier: (user as any).subscriptionTier || null,
      status: user.subscription_status,
      startDate: user.subscription_start_date || null,
      endDate: user.subscription_end_date || null,
      monthlyCredits: Number(user.subscription_credits_monthly || 0),
      creditsExpiresAt: user.subscription_credits_expires_at || null,
    }
  }

  /**
   * Allocate monthly credits to a user
   */
  static async allocateMonthlyCredits(userId: string): Promise<void> {
    const resolvedUser = await resolveUser(userId)
    const userUuid = resolvedUser.id
    return await sequelize.transaction(async (tx) => {
      const user = await User.findByPk(userUuid, { transaction: tx, lock: tx.LOCK.UPDATE })
      
      if (!user) {
        throw new Error('User not found')
      }

      if (user.subscription_status !== 'active') {
        throw new Error('User does not have an active subscription')
      }

      const tier = await SubscriptionTier.findByPk(user.subscription_tier_id || '', {
        transaction: tx,
      })

      if (!tier) {
        throw new Error('Subscription tier not found')
      }

      const creditsToAllocate = Number(tier.included_credits_monthly)
      
      if (creditsToAllocate <= 0) {
        return // No credits to allocate
      }

      // Calculate expiry date (end of current month)
      const now = new Date()
      const expiryDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

      // Get current subscription credits (to track previous balance)
      const prevSubscriptionCredits = Number(user.subscription_credits_monthly || 0)

      // Update user's subscription credits
      user.subscription_credits_monthly = creditsToAllocate
      user.subscription_credits_expires_at = expiryDate

      // Update total credits (add to existing subscription credits if any remain, otherwise replace)
      const currentTotalCredits = Number(user.credits || 0)
      const addonCredits = Number(user.addon_credits || 0)
      
      // New total = addon credits + new subscription credits
      user.credits = addonCredits + creditsToAllocate

      await user.save({ transaction: tx })

      // Log the allocation in credit ledger
      await CreditLedger.create(
        {
          user_id: userUuid,
          delta_credits: creditsToAllocate,
          prev_balance: currentTotalCredits,
          new_balance: Number(user.credits),
          reason: 'subscription_allocation',
          credit_type: 'subscription',
          ref: `subscription_month_${now.getFullYear()}_${now.getMonth() + 1}`,
          meta: {
            tier_id: tier.id,
            tier_name: tier.name,
            allocated_credits: creditsToAllocate,
            expires_at: expiryDate.toISOString(),
          },
        } as any,
        { transaction: tx }
      )
    })
  }

  /**
   * Expire subscription credits at month end
   */
  static async expireSubscriptionCredits(userId: string): Promise<void> {
    const resolvedUser = await resolveUser(userId)
    const userUuid = resolvedUser.id
    return await sequelize.transaction(async (tx) => {
      const user = await User.findByPk(userUuid, { transaction: tx, lock: tx.LOCK.UPDATE })
      
      if (!user) {
        throw new Error('User not found')
      }

      const subscriptionCredits = Number(user.subscription_credits_monthly || 0)
      
      if (subscriptionCredits <= 0) {
        return // No credits to expire
      }

      const addonCredits = Number(user.addon_credits || 0)
      const prevTotalCredits = Number(user.credits || 0)
      
      // Remove expired subscription credits
      user.subscription_credits_monthly = 0
      user.subscription_credits_expires_at = null
      user.credits = addonCredits // Only addon credits remain

      await user.save({ transaction: tx })

      // Log the expiry in credit ledger
      await CreditLedger.create(
        {
          user_id: userUuid,
          delta_credits: -subscriptionCredits,
          prev_balance: prevTotalCredits,
          new_balance: Number(user.credits),
          reason: 'subscription_expiry',
          credit_type: 'subscription',
          ref: `subscription_expiry_${new Date().toISOString().split('T')[0]}`,
          meta: {
            expired_credits: subscriptionCredits,
            remaining_addon_credits: addonCredits,
          },
        } as any,
        { transaction: tx }
      )
    })
  }

  /**
   * Purchase add-on credit pack
   */
  static async purchaseAddonCredits(
    userId: string,
    packSize: number,
    amountPaid: number
  ): Promise<void> {
    const resolvedUser = await resolveUser(userId)
    const userUuid = resolvedUser.id
    return await sequelize.transaction(async (tx) => {
      const user = await User.findByPk(userUuid, { transaction: tx, lock: tx.LOCK.UPDATE })
      
      if (!user) {
        throw new Error('User not found')
      }

      const prevAddonCredits = Number(user.addon_credits || 0)
      const prevTotalCredits = Number(user.credits || 0)
      
      // Add credits to addon_credits
      user.addon_credits = prevAddonCredits + packSize
      
      // Update total credits
      user.credits = Number(user.addon_credits) + Number(user.subscription_credits_monthly || 0)

      await user.save({ transaction: tx })

      // Log the purchase in credit ledger
      await CreditLedger.create(
        {
          user_id: userUuid,
          delta_credits: packSize,
          prev_balance: prevTotalCredits,
          new_balance: Number(user.credits),
          reason: 'addon_purchase',
          credit_type: 'addon',
          ref: `addon_purchase_${Date.now()}`,
          meta: {
            pack_size: packSize,
            amount_paid_usd: amountPaid,
          },
        } as any,
        { transaction: tx }
      )
    })
  }

  /**
   * Check if user has access to a feature
   */
  static async hasFeatureAccess(userId: string, feature: string): Promise<boolean> {
    const resolvedUser = await resolveUser(userId)
    const user = await User.findByPk(resolvedUser.id, {
      include: [
        {
          model: SubscriptionTier,
          as: 'subscriptionTier',
        },
      ],
    })

    if (!user || user.subscription_status !== 'active') {
      return false
    }

    const tier = (user as any).subscriptionTier as SubscriptionTier | null

    if (!tier) {
      return false
    }

    // Check if feature is in tier's features array
    return tier.features.includes(feature)
  }

  /**
   * Check storage quota
   */
  static async checkStorageQuota(
    userId: string,
    additionalGB: number
  ): Promise<boolean> {
    const resolvedUser = await resolveUser(userId)
    const user = await User.findByPk(resolvedUser.id, {
      include: [
        {
          model: SubscriptionTier,
          as: 'subscriptionTier',
        },
      ],
    })

    if (!user) {
      throw new Error('User not found')
    }

    const tier = (user as any).subscriptionTier as SubscriptionTier | null

    if (!tier) {
      // No tier = no storage quota
      return false
    }

    const currentUsage = Number(user.storage_used_gb || 0)
    const quota = tier.storage_gb

    return currentUsage + additionalGB <= quota
  }

  /**
   * Update user storage usage
   */
  static async updateStorageUsage(
    userId: string,
    additionalGB: number
  ): Promise<void> {
    const user = await resolveUser(userId)

    if (!user) {
      throw new Error('User not found')
    }

    const currentUsage = Number(user.storage_used_gb || 0)
    user.storage_used_gb = currentUsage + additionalGB

    await user.save()
  }

  /**
   * Check if user can purchase one-time tier
   */
  static async canPurchaseOneTimeTier(userId: string, tierName: string): Promise<boolean> {
    try {
      const user = await resolveUser(userId)
    
      const purchased = user.one_time_tiers_purchased || []
      return !purchased.includes(tierName)
    } catch {
      return false
    }
  }

  /**
   * Grant one-time tier credits (1,000 addon credits)
   */
  static async grantOneTimeTier(userId: string, tierName: string): Promise<void> {
    const resolvedUser = await resolveUser(userId)
    const userUuid = resolvedUser.id
    return await sequelize.transaction(async (tx) => {
      const user = await User.findByPk(userUuid, { transaction: tx, lock: tx.LOCK.UPDATE })
      if (!user) throw new Error('User not found')
      
      // Check if already purchased
      const purchased = user.one_time_tiers_purchased || []
      if (purchased.includes(tierName)) {
        throw new Error('One-time tier already purchased')
      }
      
      // Add 1,000 addon credits (never expire)
      const prevAddonCredits = Number(user.addon_credits || 0)
      const prevTotalCredits = Number(user.credits || 0)
      
      user.addon_credits = prevAddonCredits + 1000
      
      // Update total credits
      user.credits = Number(user.addon_credits) + Number(user.subscription_credits_monthly || 0)
      
      // Mark tier as purchased
      user.one_time_tiers_purchased = [...purchased, tierName]
      
      await user.save({ transaction: tx })
      
      // Log credit grant
      await CreditLedger.create({
        user_id: userUuid,
        delta_credits: 1000,
        prev_balance: prevTotalCredits,
        new_balance: Number(user.credits),
        reason: 'addon_purchase',
        credit_type: 'addon',
        ref: `coffee_break_purchase`,
        meta: { tier: tierName, amount_paid: 5.00 }
      } as any, { transaction: tx })
    })
  }

  /**
   * Check project limits for user's tier
   */
  static async checkProjectLimits(userId: string): Promise<{ 
    canCreateProject: boolean
    currentProjects: number
    maxProjects: number | null
  }> {
    const subscription = await this.getUserSubscription(userId)
    const tier = subscription.tier
    
    if (!tier?.max_projects) {
      return { canCreateProject: true, currentProjects: 0, maxProjects: null }
    }
    
    const resolvedUser = await resolveUser(userId)
    const userUuid = resolvedUser.id
    const currentProjects = await Project.count({ 
      where: { 
        user_id: userUuid, 
        status: { [Op.in]: ['draft', 'in_progress'] } 
      } 
    })
    
    return {
      canCreateProject: currentProjects < tier.max_projects,
      currentProjects,
      maxProjects: tier.max_projects
    }
  }

  /**
   * Check scene limits for user's tier within a project
   */
  static async checkSceneLimits(userId: string, projectId: string): Promise<{
    canAddScene: boolean
    currentScenes: number
    maxScenes: number | null
  }> {
    const subscription = await this.getUserSubscription(userId)
    const tier = subscription.tier
    
    if (!tier?.max_scenes_per_project) {
      return { canAddScene: true, currentScenes: 0, maxScenes: null }
    }
    
    // Note: projectId should already be a UUID, but we resolve user to ensure consistency
    const resolvedUser = await resolveUser(userId)
    const project = await Project.findByPk(projectId)
    if (!project) throw new Error('Project not found')
    // Verify project belongs to user
    if (project.user_id !== resolvedUser.id) {
      throw new Error('Project does not belong to user')
    }
    
    // Scenes are stored in metadata.script.scenes or metadata.visionPhase.scenes
    const scenes = project.metadata?.script?.scenes || 
                   project.metadata?.visionPhase?.scenes || 
                   []
    const currentScenes = Array.isArray(scenes) ? scenes.length : 0
    
    return {
      canAddScene: currentScenes < tier.max_scenes_per_project,
      currentScenes,
      maxScenes: tier.max_scenes_per_project
    }
  }
}
