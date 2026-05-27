import { User, SubscriptionTier, CreditLedger, Project, sequelize } from '@/models'
import { Op } from 'sequelize'
import { resolveUser } from '@/lib/userHelper'
import {
  getTierCredits,
  normalizeTierName,
  TIER_CATALOG,
} from '@/lib/billing/tierCatalog'

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
      const normalized = normalizeTierName(tierName) || tierName
      const purchased = user.one_time_tiers_purchased || []
      return !purchased.includes(normalized) && !purchased.includes('trial')
    } catch {
      return false
    }
  }

  /**
   * Grant Explorer one-time purchase (750 addon credits)
   */
  static async grantExplorerPurchase(userId: string): Promise<void> {
    return this.grantOneTimeTier(userId, 'explorer')
  }

  /**
   * Grant one-time tier credits from catalog
   */
  static async grantOneTimeTier(userId: string, tierName: string): Promise<void> {
    const normalizedTier = normalizeTierName(tierName)
    if (!normalizedTier || !TIER_CATALOG[normalizedTier].isOneTime) {
      throw new Error(`Invalid one-time tier: ${tierName}`)
    }

    const creditsToGrant = TIER_CATALOG[normalizedTier].credits
    const amountPaid = TIER_CATALOG[normalizedTier].priceUsd

    const resolvedUser = await resolveUser(userId)
    const userUuid = resolvedUser.id
    return await sequelize.transaction(async (tx) => {
      const user = await User.findByPk(userUuid, { transaction: tx, lock: tx.LOCK.UPDATE })
      if (!user) throw new Error('User not found')

      const purchased = user.one_time_tiers_purchased || []
      if (
        purchased.includes(normalizedTier) ||
        (normalizedTier === 'explorer' && purchased.includes('trial'))
      ) {
        throw new Error('One-time tier already purchased')
      }

      const prevAddonCredits = Number(user.addon_credits || 0)
      const prevTotalCredits = Number(user.credits || 0)

      user.addon_credits = prevAddonCredits + creditsToGrant
      user.credits = Number(user.addon_credits) + Number(user.subscription_credits_monthly || 0)
      user.one_time_tiers_purchased = [...purchased, normalizedTier]
      user.payment_provider = user.payment_provider || 'whop'

      await user.save({ transaction: tx })

      await CreditLedger.create({
        user_id: userUuid,
        delta_credits: creditsToGrant,
        prev_balance: prevTotalCredits,
        new_balance: Number(user.credits),
        reason: 'addon_purchase',
        credit_type: 'addon',
        ref: `${normalizedTier}_purchase`,
        meta: { tier: normalizedTier, amount_paid: amountPaid },
      } as any, { transaction: tx })
    })
  }

  /**
   * Add addon credits (credit packs)
   */
  static async addCredits(
    userId: string,
    amount: number,
    reason: string,
    ref: string
  ): Promise<void> {
    return this.purchaseAddonCredits(userId, amount, amount / 100)
  }

  /**
   * Activate or renew a subscription tier
   */
  static async activateSubscription(
    userId: string,
    tierName: string,
    options: {
      whopMembershipId?: string
      whopUserId?: string
      billingPeriodEnd?: Date
      source?: string
      grantCredits?: boolean
    } = {}
  ): Promise<void> {
    const normalizedTier = normalizeTierName(tierName)
    if (!normalizedTier || TIER_CATALOG[normalizedTier].isOneTime) {
      throw new Error(`Invalid subscription tier: ${tierName}`)
    }

    const tier = await SubscriptionTier.findOne({ where: { name: normalizedTier } })
    if (!tier) {
      throw new Error(`Subscription tier "${normalizedTier}" not found in database`)
    }

    const resolvedUser = await resolveUser(userId)
    const userUuid = resolvedUser.id
    const creditsToGrant =
      options.grantCredits === false ? 0 : getTierCredits(normalizedTier)

    return await sequelize.transaction(async (tx) => {
      const user = await User.findByPk(userUuid, { transaction: tx, lock: tx.LOCK.UPDATE })
      if (!user) throw new Error('User not found')

      const prevCredits = Number(user.credits || 0)
      const endDate = options.billingPeriodEnd || (() => {
        const date = new Date()
        date.setDate(date.getDate() + 30)
        return date
      })()

      user.subscription_tier_id = tier.id
      user.subscription_status = 'active'
      user.subscription_start_date = user.subscription_start_date || new Date()
      user.subscription_end_date = endDate
      user.payment_provider = 'whop'

      if (options.whopMembershipId) {
        user.whop_membership_id = options.whopMembershipId
      }
      if (options.whopUserId) {
        user.whop_user_id = options.whopUserId
      }

      if (creditsToGrant > 0) {
        user.subscription_credits_monthly = creditsToGrant
        user.subscription_credits_expires_at = endDate
        const addonCredits = Number(user.addon_credits || 0)
        user.credits = addonCredits + creditsToGrant

        await CreditLedger.create({
          user_id: userUuid,
          delta_credits: creditsToGrant,
          prev_balance: prevCredits,
          new_balance: Number(user.credits),
          reason: 'subscription_allocation',
          credit_type: 'subscription',
          ref: `whop_${normalizedTier}_${Date.now()}`,
          meta: {
            tier: normalizedTier,
            source: options.source || 'whop_webhook',
            expires_at: endDate.toISOString(),
          },
        } as any, { transaction: tx })
      }

      await user.save({ transaction: tx })
    })
  }

  /**
   * Grant subscription credits (used by webhook renewals)
   */
  static async grantSubscriptionCredits(userId: string, credits: number): Promise<void> {
    const subscription = await this.getUserSubscription(userId)
    const tierName = subscription.tier?.name
    if (!tierName) {
      throw new Error('No subscription tier found for user')
    }
    await this.activateSubscription(userId, tierName, {
      source: 'subscription_renewal',
      grantCredits: true,
    })
  }

  /**
   * Deactivate subscription after cancellation or failed renewal
   */
  static async deactivateSubscription(
    userId: string,
    reason: string = 'membership_invalid'
  ): Promise<void> {
    const resolvedUser = await resolveUser(userId)
    const userUuid = resolvedUser.id

    return await sequelize.transaction(async (tx) => {
      const user = await User.findByPk(userUuid, { transaction: tx, lock: tx.LOCK.UPDATE })
      if (!user) throw new Error('User not found')

      user.subscription_status = 'cancelled'
      await user.save({ transaction: tx })

      await CreditLedger.create({
        user_id: userUuid,
        delta_credits: 0,
        prev_balance: Number(user.credits || 0),
        new_balance: Number(user.credits || 0),
        reason: 'adjustment',
        credit_type: 'subscription',
        ref: `subscription_deactivated_${Date.now()}`,
        meta: { reason },
      } as any, { transaction: tx })
    })
  }

  /**
   * Record a refund — flag account; full credit clawback handled manually if needed
   */
  static async recordRefund(userId: string, paymentId: string): Promise<void> {
    const resolvedUser = await resolveUser(userId)
    const userUuid = resolvedUser.id

    await CreditLedger.create({
      user_id: userUuid,
      delta_credits: 0,
      prev_balance: 0,
      new_balance: 0,
      reason: 'adjustment',
      credit_type: 'addon',
      ref: `refund_${paymentId}`,
      meta: { payment_id: paymentId, action: 'refund_recorded' },
    } as any)
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
