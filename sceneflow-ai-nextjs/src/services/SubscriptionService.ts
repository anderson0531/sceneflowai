import { User, SubscriptionTier, CreditLedger, Project, sequelize } from '@/models'
import { Op } from 'sequelize'
import { resolveUser } from '@/lib/userHelper'
import {
  getTierCredits,
  normalizeTierName,
  TIER_CATALOG,
} from '@/lib/billing/tierCatalog'
import { ensureCreditLotsTable } from '@/lib/database/migrateCreditLots'
import { assignBalances, loadUserLots, saveUserLots } from '@/lib/credits/creditLotStore'
import { applyPackGrant, applySubscriptionGrant, expireDueLots } from '@/lib/credits/creditLots'
import { writeLedgerIntents } from '@/services/CreditService'

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
   * Drop subscription and pack lots whose shelf life has ended.
   * Does not grant a new month. The next allotment arrives with a renewal payment.
   */
  static async expireDueCredits(
    userId: string
  ): Promise<{ expiredSubscription: number; expiredPack: number }> {
    await ensureCreditLotsTable()
    const resolvedUser = await resolveUser(userId)
    const userUuid = resolvedUser.id
    return await sequelize.transaction(async (tx) => {
      const user = await User.findByPk(userUuid, { transaction: tx, lock: tx.LOCK.UPDATE })
      if (!user) throw new Error('User not found')

      const now = new Date()
      const loaded = await loadUserLots(user, now, tx)
      const expired = expireDueLots(loaded.lots, now)
      if (
        expired.expiredSubscription === 0 &&
        expired.expiredPack === 0 &&
        !loaded.materialized
      ) {
        return { expiredSubscription: 0, expiredPack: 0 }
      }

      const starting = loaded.lots.reduce((sum, lot) => sum + lot.remaining, 0)
      let balance = starting
      const intents: Parameters<typeof writeLedgerIntents>[1] = []
      if (expired.expiredSubscription > 0) {
        const next = balance - expired.expiredSubscription
        intents.push({
          delta: -expired.expiredSubscription,
          prev: balance,
          next,
          reason: 'subscription_expiry',
          creditType: 'subscription',
          meta: { expired_credits: expired.expiredSubscription },
        })
        balance = next
      }
      if (expired.expiredPack > 0) {
        const next = balance - expired.expiredPack
        intents.push({
          delta: -expired.expiredPack,
          prev: balance,
          next,
          reason: 'adjustment',
          creditType: 'addon',
          meta: { kind: 'pack_expiry', expired_credits: expired.expiredPack },
        })
        balance = next
      }

      await saveUserLots(userUuid, expired.lots, tx)
      assignBalances(user, expired.lots, now)
      if (intents.length > 0) {
        await writeLedgerIntents(
          userUuid,
          intents,
          tx,
          `credit_expiry_${now.toISOString().slice(0, 10)}`
        )
      }
      await user.save({ transaction: tx })
      return {
        expiredSubscription: expired.expiredSubscription,
        expiredPack: expired.expiredPack,
      }
    })
  }

  /**
   * Kept so older callers cannot mint a calendar-month grant.
   * Renewal webhooks call activateSubscription when a payment lands.
   */
  static async allocateMonthlyCredits(userId: string): Promise<void> {
    await this.expireDueCredits(userId)
  }

  /**
   * Expire subscription credits at the end of the paid period.
   */
  static async expireSubscriptionCredits(userId: string): Promise<void> {
    await this.expireDueCredits(userId)
  }

  /**
   * Purchase add-on credit pack. Each pack expires 12 months after this purchase.
   */
  static async purchaseAddonCredits(
    userId: string,
    packSize: number,
    amountPaid: number
  ): Promise<void> {
    await ensureCreditLotsTable()
    const resolvedUser = await resolveUser(userId)
    const userUuid = resolvedUser.id
    return await sequelize.transaction(async (tx) => {
      const user = await User.findByPk(userUuid, { transaction: tx, lock: tx.LOCK.UPDATE })
      if (!user) throw new Error('User not found')

      const now = new Date()
      const { lots } = await loadUserLots(user, now, tx)
      const granted = applyPackGrant({
        lots,
        source: 'addon',
        credits: packSize,
        now,
        ref: `addon_purchase_${now.getTime()}`,
        meta: { pack_size: packSize, amount_paid_usd: amountPaid },
      })
      await saveUserLots(userUuid, granted.lots, tx)
      assignBalances(user, granted.lots, now)
      await writeLedgerIntents(userUuid, granted.intents, tx, granted.lots.at(-1)?.ref)
      await user.save({ transaction: tx })
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

    await ensureCreditLotsTable()
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

      const now = new Date()
      const { lots } = await loadUserLots(user, now, tx)
      const granted = applyPackGrant({
        lots,
        source: normalizedTier === 'explorer' ? 'explorer' : 'addon',
        credits: creditsToGrant,
        now,
        ref: `${normalizedTier}_purchase`,
        meta: { tier: normalizedTier, amount_paid: amountPaid },
      })
      user.one_time_tiers_purchased = [...purchased, normalizedTier]
      user.payment_provider = user.payment_provider || 'whop'
      await saveUserLots(userUuid, granted.lots, tx)
      assignBalances(user, granted.lots, now)
      await writeLedgerIntents(userUuid, granted.intents, tx, `${normalizedTier}_purchase`)
      await user.save({ transaction: tx })
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

    await ensureCreditLotsTable()
    const resolvedUser = await resolveUser(userId)
    const userUuid = resolvedUser.id
    const creditsToGrant =
      options.grantCredits === false ? 0 : getTierCredits(normalizedTier)

    return await sequelize.transaction(async (tx) => {
      const user = await User.findByPk(userUuid, { transaction: tx, lock: tx.LOCK.UPDATE })
      if (!user) throw new Error('User not found')

      const now = new Date()
      const endDate = options.billingPeriodEnd || (() => {
        const date = new Date(now.getTime())
        date.setDate(date.getDate() + 30)
        return date
      })()

      user.subscription_tier_id = tier.id
      user.subscription_status = 'active'
      user.subscription_start_date = user.subscription_start_date || now
      user.subscription_end_date = endDate
      user.payment_provider = 'whop'

      if (options.whopMembershipId) {
        user.whop_membership_id = options.whopMembershipId
      }
      if (options.whopUserId) {
        user.whop_user_id = options.whopUserId
      }

      if (creditsToGrant > 0) {
        const { lots } = await loadUserLots(user, now, tx)
        const granted = applySubscriptionGrant({
          lots,
          credits: creditsToGrant,
          now,
          expiresAt: endDate,
          ref: `whop_${normalizedTier}_${now.getTime()}`,
          meta: {
            tier: normalizedTier,
            source: options.source || 'whop_webhook',
          },
        })
        await saveUserLots(userUuid, granted.lots, tx)
        assignBalances(user, granted.lots, now)
        await writeLedgerIntents(userUuid, granted.intents, tx, `whop_${normalizedTier}`)
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
