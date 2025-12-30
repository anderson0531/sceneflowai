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
    try {
      const resolvedUser = await resolveUser(userId)
      let user: any
      
      try {
        // Try to include subscription tier (may fail if table doesn't exist)
        user = await User.findByPk(resolvedUser.id, {
          include: [
            {
              model: SubscriptionTier,
              as: 'subscriptionTier',
              required: false, // LEFT JOIN
            },
          ],
        })
      } catch (error: any) {
        // If subscription_tiers table doesn't exist, query user without include
        if (error.message?.includes('subscription_tiers') || error.message?.includes('does not exist')) {
          console.warn('[SubscriptionService] subscription_tiers table not found, returning default subscription')
          user = await User.findByPk(resolvedUser.id)
        } else {
          throw error
        }
      }

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
    } catch (error: any) {
      console.error('[SubscriptionService] getUserSubscription error:', error)
      // Return default subscription if table doesn't exist
      return {
        tier: null,
        status: null,
        startDate: null,
        endDate: null,
        monthlyCredits: 0,
        creditsExpiresAt: null,
      }
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
        ref: `trial_purchase`,
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

  // ============================================================================
  // Voice Cloning Quota Methods
  // ============================================================================

  /**
   * Voice quota result type
   */
  static VoiceQuotaResult = {} as {
    used: number
    max: number
    available: number
    canCreate: boolean
    lockedSlots: number
    tierName: string | null
  }

  /**
   * Get user's voice clone quota based on subscription tier
   * Pro: 3 slots, Studio: 10 slots, Enterprise: 999 (unlimited)
   */
  static async getVoiceQuota(userId: string): Promise<{
    used: number
    max: number
    available: number
    canCreate: boolean
    lockedSlots: number
    tierName: string | null
  }> {
    const { UserVoiceClone } = await import('@/models/UserVoiceClone')
    const resolvedUser = await resolveUser(userId)
    const subscription = await this.getUserSubscription(resolvedUser.id)
    const tier = subscription.tier
    
    // Tier voice slot limits
    const VOICE_SLOT_LIMITS: Record<string, number> = {
      'free': 0,
      'pro': 3,
      'studio': 10,
      'enterprise': 999, // Effectively unlimited
    }
    
    const tierName = tier?.name?.toLowerCase() || null
    const maxSlots = tier ? (VOICE_SLOT_LIMITS[tierName || ''] ?? 0) : 0
    
    // Count active (non-archived) voice clones
    const activeClones = await UserVoiceClone.count({
      where: {
        user_id: resolvedUser.id,
        archived_at: null,
      },
    })
    
    // Count locked slots (archived but not yet cleaned up, still counting against quota)
    const lockedClones = await UserVoiceClone.count({
      where: {
        user_id: resolvedUser.id,
        is_locked: true,
      },
    })
    
    const used = activeClones
    const available = Math.max(0, maxSlots - used)
    
    return {
      used,
      max: maxSlots,
      available,
      canCreate: available > 0,
      lockedSlots: lockedClones,
      tierName,
    }
  }

  /**
   * Check if user has access to voice cloning feature
   * Requires Pro or Studio subscription
   */
  static async canAccessVoiceCloning(userId: string): Promise<{
    allowed: boolean
    reason?: string
    tierRequired?: string
  }> {
    const resolvedUser = await resolveUser(userId)
    const subscription = await this.getUserSubscription(resolvedUser.id)
    const tier = subscription.tier
    
    // Must have active subscription
    if (subscription.status !== 'active') {
      return {
        allowed: false,
        reason: 'Active subscription required',
        tierRequired: 'pro',
      }
    }
    
    // Check tier allows voice cloning
    const tierName = tier?.name?.toLowerCase() || ''
    const voiceCloningTiers = ['pro', 'studio', 'enterprise']
    
    if (!voiceCloningTiers.includes(tierName)) {
      return {
        allowed: false,
        reason: 'Voice cloning requires Pro or Studio subscription',
        tierRequired: 'pro',
      }
    }
    
    // Also check if feature is explicitly in the tier's features array
    const hasFeature = tier?.features?.includes('voice_cloning') ?? 
                       tier?.features?.includes('voice-cloning') ??
                       voiceCloningTiers.includes(tierName)
    
    if (!hasFeature) {
      return {
        allowed: false,
        reason: 'Voice cloning not available on your plan',
        tierRequired: 'pro',
      }
    }
    
    return { allowed: true }
  }

  /**
   * Check if user can create a new voice clone (has quota available)
   */
  static async canCreateVoiceClone(userId: string): Promise<{
    allowed: boolean
    reason?: string
    quota?: {
      used: number
      max: number
      available: number
    }
  }> {
    // First check feature access
    const accessCheck = await this.canAccessVoiceCloning(userId)
    if (!accessCheck.allowed) {
      return {
        allowed: false,
        reason: accessCheck.reason,
      }
    }
    
    // Then check quota
    const quota = await this.getVoiceQuota(userId)
    
    if (!quota.canCreate) {
      return {
        allowed: false,
        reason: `Voice clone limit reached (${quota.used}/${quota.max}). Delete an existing clone or upgrade your plan.`,
        quota: {
          used: quota.used,
          max: quota.max,
          available: quota.available,
        },
      }
    }
    
    return {
      allowed: true,
      quota: {
        used: quota.used,
        max: quota.max,
        available: quota.available,
      },
    }
  }
}
