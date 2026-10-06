import type { Transaction } from 'sequelize'
import { sequelize, AIPricing, CreditLedger, User, AIUsage } from '@/models'
import { migrateUsersSubscriptionColumns } from '@/lib/database/migrateUsersSubscription'
import { migrateCreditLedger } from '@/lib/database/migrateCreditLedger'
import { ensureWhopUserColumns } from '@/lib/database/migrateWhopPayment'
import { ensureCreditLotsTable } from '@/lib/database/migrateCreditLots'
import { assignBalances, loadUserLots, readStoredLots, saveUserLots } from '@/lib/credits/creditLotStore'
import {
  applyCreditRestore,
  applyCreditSpend,
  applyPackGrant,
  balancesFromLots,
  type CreditLedgerIntent,
  type CreditLotLedgerReason,
} from '@/lib/credits/creditLots'
import { resolveUser } from '@/lib/userHelper'
import {
  incrementProjectCreditsUsed,
  resolveProjectIdFromCharge,
} from '@/lib/credits/projectBudget'

export const CREDIT_VALUE_USD = Number(process.env.CREDIT_VALUE_USD ?? '0.0001')
export const MARKUP_MULTIPLIER = Number(process.env.MARKUP_MULTIPLIER ?? '4')

export type PricingCategory = 'text' | 'images' | 'tts' | 'whisper' | 'video' | 'other'

// Cache to prevent multiple concurrent migrations
let migrationInProgress = false
let migrationCompleted = false
let whopMigrationInProgress = false
let whopMigrationCompleted = false
let creditLedgerMigrationInProgress = false
let creditLedgerMigrationCompleted = false

function isMissingColumnError(error: any, columnHint?: string): boolean {
  const code = error?.parent?.code ?? error?.original?.code
  const message = String(error?.message ?? error?.parent?.message ?? '')
  if (code === '42703') return true
  if (message.includes('does not exist')) {
    return columnHint ? message.includes(columnHint) : true
  }
  return false
}

/**
 * Helper to check if migration is needed and run it automatically
 * This catches the "column does not exist" error and runs the migration once
 */
async function ensureMigrationRan(): Promise<void> {
  // If migration already completed, skip
  if (migrationCompleted) return
  
  // If migration is in progress, wait for it
  if (migrationInProgress) {
    // Wait up to 10 seconds for migration to complete
    for (let i = 0; i < 100; i++) {
      await new Promise(resolve => setTimeout(resolve, 100))
      if (migrationCompleted) return
    }
    throw new Error('Migration timeout - please try again')
  }

  // Run migration
  migrationInProgress = true
  try {
    console.log('[CreditService] Auto-running users subscription columns migration...')
    await migrateUsersSubscriptionColumns()
    migrationCompleted = true
    console.log('[CreditService] Migration completed successfully')
  } catch (error: any) {
    migrationInProgress = false
    // If columns already exist, mark as completed
    if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
      migrationCompleted = true
      return
    }
    console.error('[CreditService] Migration failed:', error)
    throw error
  } finally {
    migrationInProgress = false
  }
}

/** Auto-add Whop billing columns when model/schema drift is detected. */
export async function ensureWhopMigrationRan(): Promise<void> {
  if (whopMigrationCompleted) return

  if (whopMigrationInProgress) {
    for (let i = 0; i < 100; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100))
      if (whopMigrationCompleted) return
    }
    throw new Error('Whop migration timeout - please try again')
  }

  whopMigrationInProgress = true
  try {
    console.log('[CreditService] Auto-running Whop user columns migration...')
    await ensureWhopUserColumns()
    whopMigrationCompleted = true
    console.log('[CreditService] Whop user columns migration completed')
  } catch (error: any) {
    whopMigrationInProgress = false
    if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
      whopMigrationCompleted = true
      return
    }
    console.error('[CreditService] Whop migration failed:', error)
    throw error
  } finally {
    whopMigrationInProgress = false
  }
}

/**
 * Helper to ensure credit_ledger table has credit_type column
 */
async function ensureCreditLedgerMigrationRan(): Promise<void> {
  // If migration already completed, skip
  if (creditLedgerMigrationCompleted) return
  
  // If migration is in progress, wait for it
  if (creditLedgerMigrationInProgress) {
    // Wait up to 10 seconds for migration to complete
    for (let i = 0; i < 100; i++) {
      await new Promise(resolve => setTimeout(resolve, 100))
      if (creditLedgerMigrationCompleted) return
    }
    // Don't throw error, just log warning
    console.warn('[CreditService] Credit ledger migration timeout')
    return
  }

  // Run migration
  creditLedgerMigrationInProgress = true
  try {
    console.log('[CreditService] Auto-running credit_ledger migration...')
    await migrateCreditLedger()
    creditLedgerMigrationCompleted = true
    console.log('[CreditService] Credit ledger migration completed successfully')
  } catch (error: any) {
    creditLedgerMigrationInProgress = false
    // If column already exists, mark as completed
    if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
      creditLedgerMigrationCompleted = true
      return
    }
    console.error('[CreditService] Credit ledger migration failed:', error)
    // Don't throw - let the code continue and handle gracefully
  } finally {
    creditLedgerMigrationInProgress = false
  }
}

/**
 * Wrapper for resolving user by UUID or email, with auto-migration if needed
 */
async function findUserWithAutoMigration(userIdOrEmail: string, options?: any) {
  try {
    // First resolve user (handles UUID or email)
    const user = await resolveUser(userIdOrEmail)
    // If options provided and include transaction, fetch with options
    if (options?.transaction) {
      return await User.findByPk(user.id, options)
    }
    return user
  } catch (error: any) {
    if (isMissingColumnError(error, 'whop_user_id') || isMissingColumnError(error, 'whop_membership_id') || isMissingColumnError(error, 'payment_provider')) {
      console.log('[CreditService] Detected missing Whop columns, running migration...')
      await ensureWhopMigrationRan()
      const user = await resolveUser(userIdOrEmail)
      if (options?.transaction) {
        return await User.findByPk(user.id, options)
      }
      return user
    }

    if (
      isMissingColumnError(error, 'subscription_tier_id') ||
      (error?.parent?.code === '42703' && error?.message?.includes('undefined_column'))
    ) {
      console.log('[CreditService] Detected missing subscription columns, running migration...')
      await ensureMigrationRan()
      const user = await resolveUser(userIdOrEmail)
      if (options?.transaction) {
        return await User.findByPk(user.id, options)
      }
      return user
    }
    throw error
  }
}

export async function writeLedgerIntents(
  userId: string,
  intents: CreditLedgerIntent[],
  tx: Transaction,
  ref?: string | null
): Promise<void> {
  for (const intent of intents) {
    try {
      await CreditLedger.create(
        {
          user_id: userId,
          delta_credits: intent.delta,
          prev_balance: intent.prev,
          new_balance: intent.next,
          reason: intent.reason,
          credit_type: intent.creditType,
          ref: ref || null,
          meta: intent.meta,
        } as any,
        { transaction: tx }
      )
    } catch (error: any) {
      if (error.message?.includes('credit_type') || error.message?.includes('does not exist')) {
        await CreditLedger.create(
          {
            user_id: userId,
            delta_credits: intent.delta,
            prev_balance: intent.prev,
            new_balance: intent.next,
            reason: intent.reason,
            ref: ref || null,
            meta: { ...(intent.meta || {}), credit_type: intent.creditType },
          } as any,
          { transaction: tx }
        )
      } else {
        throw error
      }
    }
  }
}

export class CreditService {
  static async getPricing(provider: 'openai', category: PricingCategory, model: string, variant: string) {
    const row = await AIPricing.findOne({ where: { provider, category, model, variant, is_active: true } })
    if (!row) throw new Error(`Pricing not found for ${provider}/${category}/${model}/${variant}`)
    return {
      price_usd: Number(row.price_usd),
      metric: row.metric,
      unit_per: row.unit_per,
    }
  }

  static usdToCredits(usd: number): number {
    return Math.ceil((usd * MARKUP_MULTIPLIER) / CREDIT_VALUE_USD)
  }

  static async ensureCredits(userId: string, minCredits: number): Promise<boolean> {
    const user = await findUserWithAutoMigration(userId)
    if (!user) throw new Error('User not found')
    return Number(user.credits ?? 0) >= minCredits
  }

  static async charge(userId: string, chargeCredits: number, reason: CreditLedger['reason'], ref?: string | null, meta?: any) {
    if (chargeCredits <= 0) return
    // Resolve user first to get UUID (handles email or UUID)
    const resolvedUser = await findUserWithAutoMigration(userId)
    const userUuid = resolvedUser.id
    // Migrations must finish before the transaction: DB_POOL_MAX defaults to 1, so a
    // probe/DDL issued while the tx holds the only connection waits forever on acquire
    // (guided-revise start hung after "Auto-running credit_ledger migration...").
    await ensureMigrationRan()
    await ensureCreditLedgerMigrationRan()
    await ensureCreditLotsTable()
    const spent = await sequelize.transaction(async (tx) => {
      const user = await User.findByPk(userUuid, { transaction: tx, lock: tx.LOCK.UPDATE })
      if (!user) throw new Error('User not found')
      const now = new Date()
      const { lots } = await loadUserLots(user, now, tx)
      const result = applyCreditSpend({
        lots,
        amount: chargeCredits,
        now,
        reason: reason as CreditLotLedgerReason,
        meta,
      })
      await saveUserLots(userUuid, result.lots, tx)
      assignBalances(user, result.lots, now)
      await writeLedgerIntents(userUuid, result.intents, tx, ref)
      await user.save({ transaction: tx })
      return result
    })
    if (!spent.ok) throw new Error('INSUFFICIENT_CREDITS')
    const result = { prev: spent.startingBalance, next: spent.endingBalance }

    const projectId = resolveProjectIdFromCharge(ref, meta)
    if (projectId) {
      // Await so we do not race the caller's next DB checkout under DB_POOL_MAX=1
      // (void fire-and-forget caused SequelizeConnectionAcquireTimeoutError on
      // getCreditBreakdown / Project loads during Express concurrency).
      await incrementProjectCreditsUsed(projectId, chargeCredits)
    }

    return result
  }

  static async logUsage(data: Partial<AIUsage>) {
    return AIUsage.create(data as any)
  }

  /**
   * Calculate BYOK platform fee (20% of full price)
   */
  static calculateBYOKFee(fullPrice: number): number {
    return Math.ceil(fullPrice * 0.20) // 20% platform fee
  }

  /**
   * Get credit breakdown (subscription vs addon credits)
   */
  static async getCreditBreakdown(userId: string): Promise<{
    subscription_credits: number
    subscription_expires_at: Date | null
    addon_credits: number
    total_credits: number
    pack_expires_at: Date | null
  }> {
    const user = await findUserWithAutoMigration(userId)
    if (!user) throw new Error('User not found')

    let packExpiresAt: Date | null = null
    let subscriptionCredits = Number(user.subscription_credits_monthly || 0)
    let addonCredits = Number(user.addon_credits || 0)
    let totalCredits = Number(user.credits || 0)
    let subscriptionExpiresAt = user.subscription_credits_expires_at || null

    try {
      await ensureCreditLotsTable()
      const stored = await readStoredLots(user.id)
      if (stored.length > 0) {
        const balances = balancesFromLots(stored, new Date())
        subscriptionCredits = balances.subscription
        addonCredits = balances.addon
        totalCredits = balances.total
        subscriptionExpiresAt = balances.subscriptionExpiresAt
          ? new Date(balances.subscriptionExpiresAt)
          : null
        packExpiresAt = balances.soonestPackExpiresAt ? new Date(balances.soonestPackExpiresAt) : null
      }
    } catch (error) {
      console.warn('[CreditService] credit lot breakdown skipped:', error)
    }

    return {
      subscription_credits: subscriptionCredits,
      subscription_expires_at: subscriptionExpiresAt,
      addon_credits: addonCredits,
      total_credits: totalCredits,
      pack_expires_at: packExpiresAt,
    }
  }

  /**
   * Spend soonest-expiring lots first (subscription allotment, then older packs).
   */
  static async chargeWithPriority(
    userId: string,
    credits: number,
    reason: CreditLedger['reason'],
    hasBYOK: boolean = false,
    ref?: string | null,
    meta?: any
  ): Promise<{ prev: number; next: number; usedAddon: number; usedSubscription: number }> {
    if (credits <= 0) {
      const breakdown = await this.getCreditBreakdown(userId)
      return {
        prev: breakdown.total_credits,
        next: breakdown.total_credits,
        usedAddon: 0,
        usedSubscription: 0,
      }
    }

    // Resolve user first to get UUID (handles email or UUID)
    const resolvedUser = await findUserWithAutoMigration(userId)
    const userUuid = resolvedUser.id
    // See charge(): ledger probe must not run while the tx holds the only pool slot.
    await ensureMigrationRan()
    await ensureCreditLedgerMigrationRan()
    await ensureCreditLotsTable()
    const spent = await sequelize.transaction(async (tx) => {
      const user = await User.findByPk(userUuid, { transaction: tx, lock: tx.LOCK.UPDATE })
      if (!user) throw new Error('User not found')
      const now = new Date()
      const { lots } = await loadUserLots(user, now, tx)
      const result = applyCreditSpend({
        lots,
        amount: credits,
        now,
        reason: reason as CreditLotLedgerReason,
        meta: { ...(meta || {}), hasBYOK },
      })
      await saveUserLots(userUuid, result.lots, tx)
      assignBalances(user, result.lots, now)
      await writeLedgerIntents(userUuid, result.intents, tx, ref)
      await user.save({ transaction: tx })
      return result
    })
    if (!spent.ok) throw new Error('INSUFFICIENT_CREDITS')
    const result = {
      prev: spent.startingBalance,
      next: spent.endingBalance,
      usedAddon: spent.usedAddon,
      usedSubscription: spent.usedSubscription,
    }

    const projectId = resolveProjectIdFromCharge(ref, meta)
    if (projectId) {
      // See charge(): must not race the caller's next checkout under pool max=1.
      await incrementProjectCreditsUsed(projectId, credits)
    }

    return result
  }

  /**
   * Put credits back after a failed generation. Restores the soonest-expiring
   * lots up to their original grant, then opens a 12-month add-on lot for the rest.
   */
  static async restoreCredits(
    userId: string,
    credits: number,
    reason: string,
    ref?: string | null,
    meta?: any
  ): Promise<{ prev: number; next: number }> {
    if (credits <= 0) {
      throw new Error('Credits amount must be positive')
    }

    const resolvedUser = await findUserWithAutoMigration(userId)
    const userUuid = resolvedUser.id
    await ensureMigrationRan()
    await ensureCreditLedgerMigrationRan()
    await ensureCreditLotsTable()

    return await sequelize.transaction(async (tx) => {
      const user = await User.findByPk(userUuid, { transaction: tx, lock: tx.LOCK.UPDATE })
      if (!user) throw new Error('User not found')
      const now = new Date()
      const { lots } = await loadUserLots(user, now, tx)
      const restored = applyCreditRestore({
        lots,
        amount: credits,
        now,
        meta: { ...(meta || {}), reason },
      })
      await saveUserLots(userUuid, restored.lots, tx)
      assignBalances(user, restored.lots, now)
      await writeLedgerIntents(userUuid, restored.intents, tx, ref)
      await user.save({ transaction: tx })
      return { prev: restored.startingBalance, next: restored.endingBalance }
    })
  }

  /**
   * Grant credits to a user (admin function).
   * Admin grants are add-on lots and expire 12 months after the grant.
   */
  static async grantCredits(
    userId: string,
    credits: number,
    reason: string = 'admin_grant',
    ref?: string | null,
    meta?: any
  ): Promise<{ prev: number; next: number; addonCredits: number }> {
    if (credits <= 0) {
      throw new Error('Credits amount must be positive')
    }

    // Resolve user first to get UUID (handles email or UUID)
    const resolvedUser = await findUserWithAutoMigration(userId)
    const userUuid = resolvedUser.id
    // See charge(): ledger probe must not run while the tx holds the only pool slot.
    await ensureMigrationRan()
    await ensureCreditLedgerMigrationRan()
    await ensureCreditLotsTable()

    return await sequelize.transaction(async (tx) => {
      const user = await User.findByPk(userUuid, { transaction: tx, lock: tx.LOCK.UPDATE })
      if (!user) throw new Error('User not found')
      const now = new Date()
      const { lots } = await loadUserLots(user, now, tx)
      const granted = applyPackGrant({
        lots,
        source: 'addon',
        credits,
        now,
        ref: ref || 'admin_grant',
        ledgerReason: 'adjustment',
        meta: { ...(meta || {}), reason, grantedBy: 'admin' },
      })
      await saveUserLots(userUuid, granted.lots, tx)
      const balances = assignBalances(user, granted.lots, now)
      await writeLedgerIntents(userUuid, granted.intents, tx, ref)
      await user.save({ transaction: tx })
      return {
        prev: granted.startingBalance,
        next: granted.endingBalance,
        addonCredits: balances.addon,
      }
    })
  }
}


