import { User, SubscriptionTier, CreditLedger, Project, sequelize } from '@/models'
import { Op } from 'sequelize'
import { resolveUser } from '@/lib/userHelper'
import {
  CHARTER_OFFER_CATALOG,
  getTierCredits,
  hasPurchasedExplorer,
  normalizeCharterOfferId,
  normalizeTierName,
  TIER_CATALOG,
} from '@/lib/billing/tierCatalog'
import { ensureCreditLotsTable } from '@/lib/database/migrateCreditLots'
import { assignBalances, loadUserLots, saveUserLots } from '@/lib/credits/creditLotStore'
import {
  applyPackGrant,
  applySubscriptionGrant,
  expireDueLots,
  normalizePaymentRef,
  type CreditLot,
} from '@/lib/credits/creditLots'
import { writeLedgerIntents } from '@/services/CreditService'

const SUBSCRIPTION_EXPIRY_GRACE_MS = 48 * 60 * 60 * 1000
const CANONICAL_PAYMENT_REF_PREFIXES = ['whop_payment:', 'whop_pay_', 'paddle_'] as const

function normalizeCanonicalPaymentRef(
  paymentId?: string | null,
  ref?: string | null
): string | null {
  if (ref && CANONICAL_PAYMENT_REF_PREFIXES.some((prefix) => ref.startsWith(prefix))) {
    return ref.startsWith('whop_pay_') ? normalizePaymentRef(ref) : ref
  }
  if (paymentId && paymentId.trim()) {
    return normalizePaymentRef(paymentId)
  }
  return ref ?? null
}

function isCanonicalPaymentRef(ref: string | null | undefined): ref is string {
  return Boolean(ref && CANONICAL_PAYMENT_REF_PREFIXES.some((prefix) => ref.startsWith(prefix)))
}

function candidatePaymentRefs(ref: string): string[] {
  const refs = new Set<string>([ref])
  if (ref.startsWith('whop_payment:')) {
    const raw = ref.slice('whop_payment:'.length)
    if (raw) {
      refs.add(`whop_pay_${raw}`)
      refs.add(raw)
    }
  } else if (ref.startsWith('whop_pay_')) {
    const raw = ref.slice('whop_pay_'.length)
    if (raw) {
      refs.add(`whop_payment:${raw}`)
      refs.add(raw)
    }
  }
  return [...refs]
}

async function hasProcessedPaymentLedger(
  userId: string,
  ref: string | null | undefined,
  tx?: any
): Promise<boolean> {
  if (!isCanonicalPaymentRef(ref)) return false
  const refs = candidatePaymentRefs(ref)
  const existing = await CreditLedger.findOne({
    where: {
      user_id: userId,
      ref: refs.length === 1 ? refs[0] : { [Op.in]: refs },
    },
    ...(tx ? { transaction: tx } : {}),
  })
  return Boolean(existing)
}

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
   * Drop subscription and pack lots whose shelf life has ended, and transition
   * active subscriptions whose billing period ended more than 48 hours ago to `expired`.
   * Does not grant a new month. The next allotment arrives with a renewal payment.
   */
  static async expireDueCredits(
    userId: string
  ): Promise<{ expiredSubscription: number; expiredPack: number; subscriptionExpired?: boolean }> {
    await ensureCreditLotsTable()
    const resolvedUser = await resolveUser(userId)
    const userUuid = resolvedUser.id
    return await sequelize.transaction(async (tx) => {
      const user = await User.findByPk(userUuid, { transaction: tx, lock: tx.LOCK.UPDATE })
      if (!user) throw new Error('User not found')

      const now = new Date()
      const loaded = await loadUserLots(user, now, tx)
      const expired = expireDueLots(loaded.lots, now)

      const subscriptionEndDate = user.subscription_end_date
        ? new Date(user.subscription_end_date)
        : null
      const shouldExpireStatus = Boolean(
        user.subscription_status === 'active' &&
          subscriptionEndDate &&
          !Number.isNaN(subscriptionEndDate.getTime()) &&
          subscriptionEndDate.getTime() < now.getTime() - SUBSCRIPTION_EXPIRY_GRACE_MS
      )

      if (
        expired.expiredSubscription === 0 &&
        expired.expiredPack === 0 &&
        !loaded.materialized &&
        !shouldExpireStatus
      ) {
        return { expiredSubscription: 0, expiredPack: 0, subscriptionExpired: false }
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
          meta: {
            expired_credits: expired.expiredSubscription,
            ...(shouldExpireStatus ? { subscription_status_expired: true } : {}),
          },
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

      let finalLots = expired.lots
      if (shouldExpireStatus) {
        // Also clear any lingering subscription lots if the subscription itself has passed grace expiry.
        const lingeringSubCredits = finalLots
          .filter((lot) => lot.source === 'subscription')
          .reduce((sum, lot) => sum + lot.remaining, 0)
        if (lingeringSubCredits > 0) {
          const next = balance - lingeringSubCredits
          intents.push({
            delta: -lingeringSubCredits,
            prev: balance,
            next,
            reason: 'subscription_expiry',
            creditType: 'subscription',
            meta: {
              expired_credits: lingeringSubCredits,
              subscription_status_expired: true,
            },
          })
          balance = next
          finalLots = finalLots.filter((lot) => lot.source !== 'subscription')
          expired.expiredSubscription += lingeringSubCredits
        }
        user.subscription_status = 'expired'
      }

      await saveUserLots(userUuid, finalLots, tx)
      assignBalances(user, finalLots, now)
      if (shouldExpireStatus) {
        user.subscription_credits_monthly = 0
        user.subscription_credits_expires_at = null
      }
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
        subscriptionExpired: shouldExpireStatus,
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
    amountPaid: number,
    options?: {
      paymentId?: string
      ref?: string
      source?: string
    }
  ): Promise<{ deduplicated: boolean } | void> {
    await ensureCreditLotsTable()
    const resolvedUser = await resolveUser(userId)
    const userUuid = resolvedUser.id
    const canonicalRef = normalizeCanonicalPaymentRef(options?.paymentId, options?.ref)
    return await sequelize.transaction(async (tx) => {
      const user = await User.findByPk(userUuid, { transaction: tx, lock: tx.LOCK.UPDATE })
      if (!user) throw new Error('User not found')

      if (await hasProcessedPaymentLedger(userUuid, canonicalRef, tx)) {
        return { deduplicated: true }
      }

      const now = new Date()
      const { lots } = await loadUserLots(user, now, tx)
      const lotRef = canonicalRef || `addon_purchase_${now.getTime()}`
      const granted = applyPackGrant({
        lots,
        source: 'addon',
        credits: packSize,
        now,
        ref: lotRef,
        meta: {
          pack_size: packSize,
          amount_paid_usd: amountPaid,
          ...(options?.source ? { source: options.source } : {}),
          ...(options?.paymentId ? { payment_id: options.paymentId } : {}),
        },
      })
      await saveUserLots(userUuid, granted.lots, tx)
      assignBalances(user, granted.lots, now)
      await writeLedgerIntents(userUuid, granted.intents, tx, lotRef)
      await user.save({ transaction: tx })
      return { deduplicated: false }
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
   * Check if user has an active recurring subscription required to purchase 12-month Add-On credit packs
   */
  static async canPurchaseAddonPack(userId: string): Promise<boolean> {
    try {
      const subscription = await this.getUserSubscription(userId)
      return (
        subscription.status === 'active' &&
        Boolean(subscription.tier && !subscription.tier.is_one_time)
      )
    } catch {
      return false
    }
  }

  /**
   * Grant Explorer one-time purchase (750 addon credits)
   */
  static async grantExplorerPurchase(
    userId: string,
    options?: {
      paymentId?: string
      ref?: string
    }
  ): Promise<{ deduplicated: boolean } | void> {
    return this.grantOneTimeTier(userId, 'explorer', options)
  }

  /**
   * Grant one-time tier credits from catalog
   */
  static async grantOneTimeTier(
    userId: string,
    tierName: string,
    options?: {
      paymentId?: string
      ref?: string
    }
  ): Promise<{ deduplicated: boolean } | void> {
    const normalizedTier = normalizeTierName(tierName)
    if (!normalizedTier || !TIER_CATALOG[normalizedTier].isOneTime) {
      throw new Error(`Invalid one-time tier: ${tierName}`)
    }

    const creditsToGrant = TIER_CATALOG[normalizedTier].credits
    const amountPaid = TIER_CATALOG[normalizedTier].priceUsd
    const canonicalRef = normalizeCanonicalPaymentRef(options?.paymentId, options?.ref)

    await ensureCreditLotsTable()
    const resolvedUser = await resolveUser(userId)
    const userUuid = resolvedUser.id
    return await sequelize.transaction(async (tx) => {
      const user = await User.findByPk(userUuid, { transaction: tx, lock: tx.LOCK.UPDATE })
      if (!user) throw new Error('User not found')

      if (await hasProcessedPaymentLedger(userUuid, canonicalRef, tx)) {
        return { deduplicated: true }
      }

      const purchased = user.one_time_tiers_purchased || []
      if (
        purchased.includes(normalizedTier) ||
        (normalizedTier === 'explorer' && purchased.includes('trial'))
      ) {
        throw new Error('One-time tier already purchased')
      }

      const now = new Date()
      const { lots } = await loadUserLots(user, now, tx)
      const lotRef = canonicalRef || `${normalizedTier}_purchase`
      const granted = applyPackGrant({
        lots,
        source: normalizedTier === 'explorer' ? 'explorer' : 'addon',
        credits: creditsToGrant,
        now,
        ref: lotRef,
        meta: {
          tier: normalizedTier,
          amount_paid: amountPaid,
          ...(options?.paymentId ? { payment_id: options.paymentId } : {}),
        },
      })
      user.one_time_tiers_purchased = [...purchased, normalizedTier]
      user.payment_provider = user.payment_provider || 'whop'
      await saveUserLots(userUuid, granted.lots, tx)
      assignBalances(user, granted.lots, now)
      await writeLedgerIntents(userUuid, granted.intents, tx, lotRef)
      await user.save({ transaction: tx })
      return { deduplicated: false }
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
  ): Promise<{ deduplicated: boolean } | void> {
    return this.purchaseAddonCredits(userId, amount, amount / 100, {
      ref,
      source: reason,
    })
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
      paymentId?: string
      ref?: string
      preserveUnusedOnUpgrade?: boolean
    } = {}
  ): Promise<{ deduplicated: boolean } | void> {
    const normalizedTier = normalizeTierName(tierName)
    if (!normalizedTier || TIER_CATALOG[normalizedTier].isOneTime) {
      throw new Error(`Invalid subscription tier: ${tierName}`)
    }

    let tier = await SubscriptionTier.findOne({ where: { name: normalizedTier } })
    if (!tier) {
      try {
        const { seedSubscriptionTiers } = await import('@/lib/database/seedSubscriptionTiers')
        await seedSubscriptionTiers()
        tier = await SubscriptionTier.findOne({ where: { name: normalizedTier } })
      } catch (seedErr) {
        console.warn('[SubscriptionService] Auto-seed tiers warning:', seedErr)
      }
    }
    if (!tier) {
      throw new Error(`Subscription tier "${normalizedTier}" not found in database`)
    }

    await ensureCreditLotsTable()
    const resolvedUser = await resolveUser(userId)
    const userUuid = resolvedUser.id
    const creditsToGrant =
      options.grantCredits === false ? 0 : getTierCredits(normalizedTier)
    const canonicalRef = normalizeCanonicalPaymentRef(options.paymentId, options.ref)

    return await sequelize.transaction(async (tx) => {
      const user = await User.findByPk(userUuid, { transaction: tx, lock: tx.LOCK.UPDATE })
      if (!user) throw new Error('User not found')

      if (creditsToGrant > 0 && (await hasProcessedPaymentLedger(userUuid, canonicalRef, tx))) {
        return { deduplicated: true }
      }

      const now = new Date()
      const endDate = options.billingPeriodEnd || (() => {
        const date = new Date(now.getTime())
        date.setDate(date.getDate() + 30)
        return date
      })()

      // Capture previous subscription state before mutating so mid-cycle upgrades preserve unused credits.
      const prevStatus = user.subscription_status
      const prevTierId = user.subscription_tier_id
      const prevEndDate = user.subscription_end_date ? new Date(user.subscription_end_date) : null
      const hasActiveUnexpiredPrevPeriod = Boolean(
        prevStatus === 'active' &&
          prevEndDate &&
          !Number.isNaN(prevEndDate.getTime()) &&
          prevEndDate.getTime() > now.getTime()
      )

      let prevTierCredits = 0
      if (hasActiveUnexpiredPrevPeriod && prevTierId && prevTierId !== tier.id) {
        try {
          const prevTier = await SubscriptionTier.findByPk(prevTierId, { transaction: tx })
          prevTierCredits = Number(prevTier?.included_credits_monthly || 0)
        } catch {
          prevTierCredits = 0
        }
      }

      if (creditsToGrant > 0) {
        const { lots } = await loadUserLots(user, now, tx)
        const existingUnexpiredSubLots = lots.filter(
          (lot) =>
            lot.source === 'subscription' &&
            lot.remaining > 0 &&
            new Date(lot.expiresAt).getTime() > now.getTime()
        )
        const existingMaxGranted = existingUnexpiredSubLots.reduce(
          (max, lot) => Math.max(max, lot.granted),
          0
        )
        const isMidCycleUpgrade =
          existingUnexpiredSubLots.length > 0 &&
          ((existingMaxGranted > 0 && creditsToGrant > existingMaxGranted) ||
            (hasActiveUnexpiredPrevPeriod &&
              prevTierCredits > 0 &&
              creditsToGrant > prevTierCredits))
        const preserveUnusedOnUpgrade =
          options.preserveUnusedOnUpgrade !== undefined
            ? options.preserveUnusedOnUpgrade
            : isMidCycleUpgrade

        const lotRef = canonicalRef || `whop_${normalizedTier}_${now.getTime()}`
        const granted = applySubscriptionGrant({
          lots,
          credits: creditsToGrant,
          now,
          expiresAt: endDate,
          ref: lotRef,
          paymentId: options.paymentId,
          preserveUnusedOnUpgrade,
          isMidCycleUpgrade: preserveUnusedOnUpgrade && isMidCycleUpgrade,
          meta: {
            tier: normalizedTier,
            source: options.source || 'whop_webhook',
            ...(options.paymentId ? { payment_id: options.paymentId } : {}),
          },
        })

        if (granted.duplicate) {
          return { deduplicated: true }
        }

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

        await saveUserLots(userUuid, granted.lots, tx)
        assignBalances(user, granted.lots, now)
        await writeLedgerIntents(
          userUuid,
          granted.intents,
          tx,
          canonicalRef || `whop_${normalizedTier}`
        )
      } else {
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
      }

      await user.save({ transaction: tx })
      return { deduplicated: false }
    })
  }

  /**
   * Activate a time-boxed Founding Operator Charter bundle (e.g. 90-day Pro + 18,000 12-month pack credits).
   * Reuses the existing `pro` SubscriptionTier row so zero Postgres enum migration is needed.
   */
  static async activateCharterOffer(
    userId: string,
    offerId: string,
    options: {
      whopMembershipId?: string
      whopUserId?: string
      source?: string
      paymentId?: string
      ref?: string
    } = {}
  ): Promise<{ deduplicated: boolean } | void> {
    const normalizedOffer = normalizeCharterOfferId(offerId)
    if (!normalizedOffer) {
      throw new Error(`Invalid charter offer: ${offerId}`)
    }
    const offer = CHARTER_OFFER_CATALOG[normalizedOffer]
    const canonicalRef = normalizeCanonicalPaymentRef(options.paymentId, options.ref)

    if (canonicalRef) {
      const resolvedUser = await resolveUser(userId)
      if (await hasProcessedPaymentLedger(resolvedUser.id, canonicalRef)) {
        return { deduplicated: true }
      }
    }

    const now = new Date()
    const endDate = new Date(now.getTime() + offer.durationDays * 24 * 60 * 60 * 1000)

    await this.activateSubscription(userId, offer.grantsTier, {
      whopMembershipId: options.whopMembershipId,
      whopUserId: options.whopUserId,
      billingPeriodEnd: endDate,
      source: options.source || `charter_${normalizedOffer}`,
      grantCredits: false,
    })

    if (canonicalRef) {
      return await this.purchaseAddonCredits(userId, offer.credits, offer.priceUsd, {
        paymentId: options.paymentId,
        ref: canonicalRef,
        source: options.source || `charter_${normalizedOffer}`,
      })
    }

    await this.purchaseAddonCredits(userId, offer.credits, offer.priceUsd)
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
   * Record a refund and claw back unused credits from matching credit lot(s).
   * Deactivates the subscription when a subscription/charter payment is refunded.
   */
  static async recordRefund(
    userId: string,
    paymentId: string,
    options: {
      membershipId?: string
      isSubscriptionRefund?: boolean
      refundAmountCredits?: number
      planId?: string
      tierName?: string | null
      addonPackId?: string | null
      charterOfferId?: string | null
      source?: string
    } = {}
  ): Promise<{
    clawedBackCredits: number
    subscriptionDeactivated: boolean
    deduplicated?: boolean
  }> {
    await ensureCreditLotsTable()
    const resolvedUser = await resolveUser(userId)
    const userUuid = resolvedUser.id
    const refundRef = `refund_${paymentId}`

    return await sequelize.transaction(async (tx) => {
      const user = await User.findByPk(userUuid, { transaction: tx, lock: tx.LOCK.UPDATE })
      if (!user) throw new Error('User not found')

      const alreadyRecorded = await CreditLedger.findOne({
        where: { user_id: userUuid, ref: refundRef },
        transaction: tx,
      })
      if (alreadyRecorded) {
        return {
          clawedBackCredits: 0,
          subscriptionDeactivated: false,
          deduplicated: true,
        }
      }

      const now = new Date()
      const { lots } = await loadUserLots(user, now, tx)
      const startingBalance = lots
        .filter((lot) => lot.remaining > 0)
        .reduce((sum, lot) => sum + lot.remaining, 0)
      const expired = expireDueLots(lots, now)

      let runningBalance = startingBalance
      const expiryLedgerIntents: Parameters<typeof writeLedgerIntents>[1] = []
      if (expired.expiredSubscription > 0) {
        const next = runningBalance - expired.expiredSubscription
        expiryLedgerIntents.push({
          delta: -expired.expiredSubscription,
          prev: runningBalance,
          next,
          reason: 'subscription_expiry',
          creditType: 'subscription',
          meta: { expired_credits: expired.expiredSubscription },
        })
        runningBalance = next
      }
      if (expired.expiredPack > 0) {
        const next = runningBalance - expired.expiredPack
        expiryLedgerIntents.push({
          delta: -expired.expiredPack,
          prev: runningBalance,
          next,
          reason: 'adjustment',
          creditType: 'addon',
          meta: { kind: 'pack_expiry', expired_credits: expired.expiredPack },
        })
        runningBalance = next
      }

      const workingLots: CreditLot[] = expired.lots.map((lot) => ({ ...lot }))
      const canonicalPaymentRef = normalizeCanonicalPaymentRef(paymentId, null)
      const matchRefSet = new Set<string>(
        canonicalPaymentRef ? candidatePaymentRefs(canonicalPaymentRef) : [paymentId]
      )
      matchRefSet.add(paymentId)

      const matchedByRef = workingLots.filter(
        (lot) => lot.remaining > 0 && Boolean(lot.ref && matchRefSet.has(lot.ref))
      )

      const normalizedTier = options.tierName ? normalizeTierName(options.tierName) : null
      let isSubRefund = Boolean(
        options.isSubscriptionRefund ||
          options.charterOfferId ||
          (normalizedTier && !TIER_CATALOG[normalizedTier].isOneTime) ||
          (options.membershipId &&
            user.whop_membership_id &&
            options.membershipId === user.whop_membership_id) ||
          matchedByRef.some((lot) => lot.source === 'subscription')
      )

      let targetLots: CreditLot[] = matchedByRef
      if (targetLots.length === 0) {
        if (isSubRefund) {
          targetLots = workingLots
            .filter((lot) => lot.source === 'subscription' && lot.remaining > 0)
            .sort((a, b) => (a.purchasedAt < b.purchasedAt ? 1 : -1))
        } else if (options.refundAmountCredits && options.refundAmountCredits > 0) {
          const packLots = workingLots
            .filter((lot) => lot.source !== 'subscription' && lot.remaining > 0)
            .sort((a, b) => (a.purchasedAt < b.purchasedAt ? 1 : -1))
          const exactGrantMatch = packLots.find(
            (lot) => lot.granted === options.refundAmountCredits
          )
          targetLots = exactGrantMatch ? [exactGrantMatch] : packLots.slice(0, 1)
        }
      }

      let cap =
        options.refundAmountCredits && options.refundAmountCredits > 0
          ? options.refundAmountCredits
          : Number.POSITIVE_INFINITY
      let clawedBackSubscription = 0
      let clawedBackAddon = 0

      for (const lot of targetLots) {
        if (cap <= 0) break
        const deduct = Math.min(lot.remaining, cap)
        if (deduct <= 0) continue
        lot.remaining -= deduct
        if (Number.isFinite(cap)) cap -= deduct
        if (lot.source === 'subscription') {
          clawedBackSubscription += deduct
          isSubRefund = true
        } else {
          clawedBackAddon += deduct
        }
      }

      const clawedBackTotal = clawedBackSubscription + clawedBackAddon
      const remainingLots = workingLots.filter((lot) => lot.remaining > 0)

      let subscriptionDeactivated = false
      if (isSubRefund && user.subscription_status === 'active') {
        user.subscription_status = 'cancelled'
        subscriptionDeactivated = true
      }

      await saveUserLots(userUuid, remainingLots, tx)
      assignBalances(user, remainingLots, now)

      if (expiryLedgerIntents.length > 0) {
        await writeLedgerIntents(
          userUuid,
          expiryLedgerIntents,
          tx,
          `credit_expiry_${now.toISOString().slice(0, 10)}`
        )
      }

      const prevBalance = runningBalance
      const newBalance = Math.max(0, prevBalance - clawedBackTotal)
      const creditType: 'subscription' | 'addon' | null =
        clawedBackSubscription > 0 && clawedBackAddon === 0
          ? 'subscription'
          : clawedBackAddon > 0 && clawedBackSubscription === 0
            ? 'addon'
            : clawedBackTotal === 0
              ? isSubRefund
                ? 'subscription'
                : 'addon'
              : null

      await CreditLedger.create(
        {
          user_id: userUuid,
          delta_credits: -clawedBackTotal,
          prev_balance: prevBalance,
          new_balance: newBalance,
          reason: 'adjustment',
          credit_type: creditType,
          ref: refundRef,
          meta: {
            payment_id: paymentId,
            membership_id: options.membershipId || null,
            plan_id: options.planId || null,
            tier_name: normalizedTier,
            addon_pack_id: options.addonPackId || null,
            charter_offer_id: options.charterOfferId || null,
            source: options.source || 'whop_refund',
            action: 'refund_clawback',
            clawed_back_credits: clawedBackTotal,
            clawed_back_subscription: clawedBackSubscription,
            clawed_back_addon: clawedBackAddon,
            subscription_deactivated: subscriptionDeactivated,
          },
        } as any,
        { transaction: tx }
      )

      await user.save({ transaction: tx })
      return {
        clawedBackCredits: clawedBackTotal,
        subscriptionDeactivated,
        deduplicated: false,
      }
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
    const resolvedUser = await resolveUser(userId)
    const userUuid = resolvedUser.id
    const subscription = await this.getUserSubscription(userUuid)
    const tier = subscription.tier
    const hasActiveSub = subscription.status === 'active' && Boolean(tier)
    const hasExplorer = hasPurchasedExplorer(resolvedUser.one_time_tiers_purchased)

    if (!hasActiveSub && !hasExplorer) {
      return { canCreateProject: false, currentProjects: 0, maxProjects: 0 }
    }

    const maxProjects = tier?.max_projects ?? (hasExplorer ? 1 : null)
    if (!maxProjects) {
      return { canCreateProject: true, currentProjects: 0, maxProjects: null }
    }

    const currentProjects = await Project.count({ 
      where: { 
        user_id: userUuid, 
        status: { [Op.in]: ['draft', 'in_progress'] } 
      } 
    })
    
    return {
      canCreateProject: currentProjects < maxProjects,
      currentProjects,
      maxProjects
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
