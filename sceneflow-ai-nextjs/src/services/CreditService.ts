import crypto from 'crypto'
import { Op, type Transaction } from 'sequelize'
import { sequelize, AIPricing, CreditLedger, CreditHold, User, AIUsage } from '@/models'
import { migrateUsersSubscriptionColumns } from '@/lib/database/migrateUsersSubscription'
import { migrateCreditLedger } from '@/lib/database/migrateCreditLedger'
import { ensureWhopUserColumns } from '@/lib/database/migrateWhopPayment'
import { ensureCreditLotsTable } from '@/lib/database/migrateCreditLots'
import { ensureCreditHoldsTable } from '@/lib/database/migrateCreditHolds'
import { assignBalances, loadUserLots, readStoredLots, saveUserLots } from '@/lib/credits/creditLotStore'
import {
  applyCreditRestore,
  applyCreditSpend,
  applyPackGrant,
  balancesFromLots,
  expireDueLots,
  type CreditLedgerIntent,
  type CreditLotLedgerReason,
} from '@/lib/credits/creditLots'
import { resolveUser } from '@/lib/userHelper'
import {
  incrementProjectCreditsUsed,
  resolveProjectIdFromCharge,
} from '@/lib/credits/projectBudget'

// Unified currency baseline: 100 credits = $1.00 ($0.01/credit), 2.0x default markup.
// Matches src/lib/credits/creditCosts.ts and quoteGenerationCredits.ts.
export const CREDIT_VALUE_USD = Number(process.env.CREDIT_VALUE_USD ?? '0.01')
export const MARKUP_MULTIPLIER = Number(process.env.MARKUP_MULTIPLIER ?? '2')

export interface ReserveCreditsInput {
  userId: string
  amount: number
  idempotencyKey?: string
  reason?: CreditLedger['reason']
  provider?: string | null
  operation?: string | null
  projectId?: string | null
  ref?: string | null
  ttlSeconds?: number
  meta?: Record<string, unknown>
}

export interface ReserveCreditsResult {
  holdId: string
  userId: string
  amount: number
  availableBeforeHold: number
  availableAfterHold: number
  expiresAt: Date
  deduplicated: boolean
}

export interface CaptureHoldInput {
  holdId: string
  finalAmount?: number
  reason?: CreditLedger['reason']
  ref?: string | null
  meta?: Record<string, unknown>
}

export interface CaptureHoldResult {
  holdId: string
  prev: number
  next: number
  charged: number
  ledgerId: string | null
  deduplicated: boolean
}

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
  ref?: string | null,
  idempotencyKey?: string | null
): Promise<string[]> {
  const createdIds: string[] = []
  let keyedIndex = 0

  for (const intent of intents) {
    const rowIdempotencyKey =
      idempotencyKey && intent.reason !== 'subscription_expiry'
        ? keyedIndex === 0
          ? idempotencyKey
          : `${idempotencyKey}:part:${keyedIndex}`
        : null
    if (idempotencyKey && intent.reason !== 'subscription_expiry') {
      keyedIndex += 1
    }

    try {
      const row = await CreditLedger.create(
        {
          user_id: userId,
          delta_credits: intent.delta,
          prev_balance: intent.prev,
          new_balance: intent.next,
          reason: intent.reason,
          credit_type: intent.creditType,
          ref: ref || null,
          idempotency_key: rowIdempotencyKey,
          meta: intent.meta,
        } as any,
        { transaction: tx }
      )
      if (row?.id) createdIds.push(row.id)
    } catch (error: any) {
      if (
        error.message?.includes('credit_type') ||
        error.message?.includes('idempotency_key') ||
        error.message?.includes('does not exist')
      ) {
        const row = await CreditLedger.create(
          {
            user_id: userId,
            delta_credits: intent.delta,
            prev_balance: intent.prev,
            new_balance: intent.next,
            reason: intent.reason,
            ref: ref || null,
            meta: {
              ...(intent.meta || {}),
              credit_type: intent.creditType,
              ...(rowIdempotencyKey ? { idempotency_key: rowIdempotencyKey } : {}),
            },
          } as any,
          { transaction: tx }
        )
        if (row?.id) createdIds.push(row.id)
      } else {
        throw error
      }
    }
  }
  return createdIds
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

  static async getPendingHoldsTotal(userId: string, tx?: Transaction): Promise<number> {
    try {
      await ensureCreditHoldsTable()
      const now = new Date()
      const rows = await CreditHold.findAll({
        where: {
          user_id: userId,
          status: 'pending',
          expires_at: { [Op.gt]: now },
        },
        attributes: ['amount'],
        transaction: tx,
      })
      return rows.reduce((sum, r) => sum + Math.max(0, Number(r.amount || 0)), 0)
    } catch (error) {
      console.warn('[CreditService] Failed to query pending holds:', error)
      return 0
    }
  }

  static async ensureCredits(userId: string, minCredits: number): Promise<boolean> {
    if (minCredits <= 0) return true
    const user = await findUserWithAutoMigration(userId)
    if (!user) throw new Error('User not found')

    const now = new Date()
    let activeTotal = Number(user.credits ?? 0)

    // Respect lot expiry in real time so expired credits never pass pre-flight
    // between midnight expiry and the daily 04:00 UTC cleanup cron.
    try {
      await ensureCreditLotsTable()
      const stored = await readStoredLots(user.id)
      if (stored.length > 0) {
        activeTotal = balancesFromLots(stored, now).total
      } else if (
        user.subscription_credits_expires_at &&
        new Date(user.subscription_credits_expires_at).getTime() <= now.getTime()
      ) {
        activeTotal = Math.max(0, Number(user.addon_credits ?? 0))
      }
    } catch (error) {
      console.warn('[CreditService] ensureCredits lot check skipped:', error)
    }

    const pendingHolds = await this.getPendingHoldsTotal(user.id)
    const available = Math.max(0, activeTotal - pendingHolds)
    return available >= minCredits
  }

  /**
   * Atomically reserve credits via an escrow hold before invoking a paid provider.
   * Prevents concurrent TOCTOU over-spend and guarantees funds remain locked until
   * `captureHold` or `releaseHold` runs (or the reconciler sweeps expired holds).
   */
  static async reserveCredits(input: ReserveCreditsInput): Promise<ReserveCreditsResult> {
    const amount = Math.max(0, Math.ceil(Number(input.amount || 0)))
    const resolvedUser = await findUserWithAutoMigration(input.userId)
    const userUuid = resolvedUser.id
    const idempotencyKey =
      input.idempotencyKey?.trim() || `hold:${userUuid}:${crypto.randomUUID()}`
    const ttlSeconds = Math.max(60, Math.min(3600, input.ttlSeconds ?? 900))

    await ensureMigrationRan()
    await ensureCreditLedgerMigrationRan()
    await ensureCreditLotsTable()
    await ensureCreditHoldsTable()

    return await sequelize.transaction(async (tx) => {
      const user = await User.findByPk(userUuid, { transaction: tx, lock: tx.LOCK.UPDATE })
      if (!user) throw new Error('User not found')

      // Idempotent lookup first
      const existingHold = await CreditHold.findOne({
        where: { idempotency_key: idempotencyKey },
        transaction: tx,
      })
      if (existingHold) {
        const now = new Date()
        const { lots } = await loadUserLots(user, now, tx)
        const activeTotal = balancesFromLots(lots, now).total
        const pendingTotal = await this.getPendingHoldsTotal(userUuid, tx)
        return {
          holdId: existingHold.id,
          userId: userUuid,
          amount: Number(existingHold.amount),
          availableBeforeHold: Math.max(0, activeTotal - pendingTotal + Number(existingHold.amount)),
          availableAfterHold: Math.max(0, activeTotal - pendingTotal),
          expiresAt: new Date(existingHold.expires_at),
          deduplicated: true,
        }
      }

      const now = new Date()
      const { lots } = await loadUserLots(user, now, tx)

      // Expire any due lots inline so balance reflects truly active credits
      const startingTotal = balancesFromLots(lots, new Date(0)).total
      const expired = expireDueLots(lots, now)
      if (expired.expiredSubscription > 0 || expired.expiredPack > 0) {
        const expiryIntentsList: CreditLedgerIntent[] = []
        let runningBalance = startingTotal
        if (expired.expiredSubscription > 0) {
          const next = Math.max(0, runningBalance - expired.expiredSubscription)
          expiryIntentsList.push({
            delta: -expired.expiredSubscription,
            prev: runningBalance,
            next,
            reason: 'subscription_expiry',
            creditType: 'subscription',
            meta: { kind: 'inline_expiry', expired_credits: expired.expiredSubscription },
          })
          runningBalance = next
        }
        if (expired.expiredPack > 0) {
          const next = Math.max(0, runningBalance - expired.expiredPack)
          expiryIntentsList.push({
            delta: -expired.expiredPack,
            prev: runningBalance,
            next,
            reason: 'adjustment',
            creditType: 'addon',
            meta: { kind: 'pack_expiry', expired_credits: expired.expiredPack },
          })
        }
        await saveUserLots(userUuid, expired.lots, tx)
        assignBalances(user, expired.lots, now)
        await writeLedgerIntents(userUuid, expiryIntentsList, tx, 'inline_expiry')
        await user.save({ transaction: tx })
      }

      const activeTotal = balancesFromLots(expired.lots, now).total
      const pendingTotal = await this.getPendingHoldsTotal(userUuid, tx)
      const available = Math.max(0, activeTotal - pendingTotal)

      if (amount > 0 && available < amount) {
        throw new Error('INSUFFICIENT_CREDITS')
      }

      const expiresAt = new Date(now.getTime() + ttlSeconds * 1000)
      const hold = await CreditHold.create(
        {
          id: crypto.randomUUID(),
          user_id: userUuid,
          idempotency_key: idempotencyKey,
          amount,
          status: 'pending',
          reason: input.reason || 'ai_usage',
          provider: input.provider ?? null,
          operation: input.operation ?? null,
          project_id: input.projectId ?? null,
          ref: input.ref ?? null,
          expires_at: expiresAt,
          meta: input.meta ?? null,
        },
        { transaction: tx }
      )

      return {
        holdId: hold.id,
        userId: userUuid,
        amount,
        availableBeforeHold: available,
        availableAfterHold: Math.max(0, available - amount),
        expiresAt,
        deduplicated: false,
      }
    })
  }

  /**
   * Settle a pending hold by charging `finalAmount` (defaulting to the reserved amount)
   * and linking the created `credit_ledger` entry. Idempotent on `holdId`.
   */
  static async captureHold(input: CaptureHoldInput): Promise<CaptureHoldResult> {
    await ensureMigrationRan()
    await ensureCreditLedgerMigrationRan()
    await ensureCreditLotsTable()
    await ensureCreditHoldsTable()

    const preHold = await CreditHold.findByPk(input.holdId)
    if (!preHold) {
      throw new Error(`Credit hold not found: ${input.holdId}`)
    }
    const userUuid = preHold.user_id

    const settled = await sequelize.transaction(async (tx) => {
      const user = await User.findByPk(userUuid, { transaction: tx, lock: tx.LOCK.UPDATE })
      if (!user) throw new Error('User not found')

      const hold = await CreditHold.findByPk(input.holdId, {
        transaction: tx,
        lock: tx.LOCK.UPDATE,
      })
      if (!hold) throw new Error(`Credit hold not found: ${input.holdId}`)

      if (hold.status === 'captured') {
        const currentBal = Number(user.credits ?? 0)
        return {
          holdId: hold.id,
          prev: currentBal,
          next: currentBal,
          charged: Number(hold.captured_amount ?? hold.amount),
          ledgerId: hold.ledger_id,
          deduplicated: true,
          projectId: hold.project_id,
          ref: hold.ref,
          meta: hold.meta,
        }
      }

      const finalAmount = Math.max(
        0,
        Math.ceil(input.finalAmount !== undefined ? input.finalAmount : Number(hold.amount))
      )
      const now = new Date()

      if (finalAmount <= 0) {
        hold.status = 'captured'
        hold.captured_amount = 0
        hold.settled_at = now
        await hold.save({ transaction: tx })
        const bal = Number(user.credits ?? 0)
        return {
          holdId: hold.id,
          prev: bal,
          next: bal,
          charged: 0,
          ledgerId: null,
          deduplicated: false,
          projectId: hold.project_id,
          ref: hold.ref,
          meta: hold.meta,
        }
      }

      const ledgerIdempotencyKey = `hold:${hold.id}`
      const existingLedger = await CreditLedger.findOne({
        where: { idempotency_key: ledgerIdempotencyKey },
        transaction: tx,
      }).catch(() => null)

      if (existingLedger) {
        hold.status = 'captured'
        hold.captured_amount = finalAmount
        hold.ledger_id = existingLedger.id
        hold.settled_at = now
        await hold.save({ transaction: tx })
        return {
          holdId: hold.id,
          prev: Number(existingLedger.prev_balance),
          next: Number(existingLedger.new_balance),
          charged: finalAmount,
          ledgerId: existingLedger.id,
          deduplicated: true,
          projectId: hold.project_id,
          ref: hold.ref,
          meta: hold.meta,
        }
      }

      const { lots } = await loadUserLots(user, now, tx)
      const mergedMeta = {
        ...(hold.meta || {}),
        ...(input.meta || {}),
        holdId: hold.id,
        reservedAmount: Number(hold.amount),
      }
      const effectiveReason = (input.reason || hold.reason || 'ai_usage') as CreditLotLedgerReason
      const effectiveRef = input.ref ?? hold.ref ?? hold.project_id ?? null

      const result = applyCreditSpend({
        lots,
        amount: finalAmount,
        now,
        reason: effectiveReason,
        meta: mergedMeta,
      })

      if (!result.ok) {
        throw new Error('INSUFFICIENT_CREDITS')
      }

      await saveUserLots(userUuid, result.lots, tx)
      assignBalances(user, result.lots, now)
      const ledgerIds = await writeLedgerIntents(
        userUuid,
        result.intents,
        tx,
        effectiveRef,
        ledgerIdempotencyKey
      )
      await user.save({ transaction: tx })

      const primaryLedgerId = ledgerIds[ledgerIds.length - 1] ?? null
      hold.status = 'captured'
      hold.captured_amount = finalAmount
      hold.ledger_id = primaryLedgerId
      hold.settled_at = now
      hold.meta = mergedMeta
      await hold.save({ transaction: tx })

      return {
        holdId: hold.id,
        prev: result.startingBalance,
        next: result.endingBalance,
        charged: finalAmount,
        ledgerId: primaryLedgerId,
        deduplicated: false,
        projectId: hold.project_id,
        ref: effectiveRef,
        meta: mergedMeta,
      }
    })

    if (!settled.deduplicated && settled.charged > 0) {
      const projectId =
        settled.projectId || resolveProjectIdFromCharge(settled.ref, settled.meta)
      if (projectId) {
        await incrementProjectCreditsUsed(projectId, settled.charged)
      }
    }

    return {
      holdId: settled.holdId,
      prev: settled.prev,
      next: settled.next,
      charged: settled.charged,
      ledgerId: settled.ledgerId,
      deduplicated: settled.deduplicated,
    }
  }

  /**
   * Release a pending credit hold after a confirmed provider failure prior to billing.
   * Idempotent: releasing an already-released or captured hold is a safe no-op.
   */
  static async releaseHold(input: {
    holdId: string
    reason?: string
    meta?: Record<string, unknown>
  }): Promise<{ holdId: string; status: string; released: boolean }> {
    await ensureCreditHoldsTable()
    return await sequelize.transaction(async (tx) => {
      const hold = await CreditHold.findByPk(input.holdId, {
        transaction: tx,
        lock: tx.LOCK.UPDATE,
      })
      if (!hold) {
        return { holdId: input.holdId, status: 'missing', released: false }
      }
      if (hold.status !== 'pending') {
        return { holdId: hold.id, status: hold.status, released: false }
      }
      hold.status = 'released'
      hold.settled_at = new Date()
      hold.meta = {
        ...(hold.meta || {}),
        ...(input.meta || {}),
        releaseReason: input.reason || 'provider_failed',
      }
      await hold.save({ transaction: tx })
      return { holdId: hold.id, status: 'released', released: true }
    })
  }

  static async charge(
    userId: string,
    chargeCredits: number,
    reason: CreditLedger['reason'],
    ref?: string | null,
    meta?: any,
    options?: { idempotencyKey?: string }
  ) {
    if (chargeCredits <= 0) return
    // Resolve user first to get UUID (handles email or UUID)
    const resolvedUser = await findUserWithAutoMigration(userId)
    const userUuid = resolvedUser.id
    const idempotencyKey =
      options?.idempotencyKey || (typeof meta?.idempotencyKey === 'string' ? meta.idempotencyKey : null)
    // Migrations must finish before the transaction: DB_POOL_MAX defaults to 1, so a
    // probe/DDL issued while the tx holds the only connection waits forever on acquire
    // (guided-revise start hung after "Auto-running credit_ledger migration...").
    await ensureMigrationRan()
    await ensureCreditLedgerMigrationRan()
    await ensureCreditLotsTable()
    const spent = await sequelize.transaction(async (tx) => {
      const user = await User.findByPk(userUuid, { transaction: tx, lock: tx.LOCK.UPDATE })
      if (!user) throw new Error('User not found')

      if (idempotencyKey) {
        const existing = await CreditLedger.findOne({
          where: { idempotency_key: idempotencyKey },
          transaction: tx,
        }).catch(() => null)
        if (existing) {
          return {
            ok: true,
            startingBalance: Number(existing.prev_balance),
            endingBalance: Number(existing.new_balance),
            ledgerId: existing.id,
            deduplicated: true,
          }
        }
      }

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
      const ledgerIds = await writeLedgerIntents(
        userUuid,
        result.intents,
        tx,
        ref,
        idempotencyKey
      )
      await user.save({ transaction: tx })
      return {
        ...result,
        ledgerId: ledgerIds[ledgerIds.length - 1] ?? null,
        deduplicated: false,
      }
    })
    if (!spent.ok) throw new Error('INSUFFICIENT_CREDITS')
    const result = {
      prev: spent.startingBalance,
      next: spent.endingBalance,
      ledgerId: spent.ledgerId ?? null,
      deduplicated: spent.deduplicated === true,
    }

    if (!result.deduplicated) {
      const projectId = resolveProjectIdFromCharge(ref, meta)
      if (projectId) {
        // Await so we do not race the caller's next DB checkout under DB_POOL_MAX=1
        // (void fire-and-forget caused SequelizeConnectionAcquireTimeoutError on
        // getCreditBreakdown / Project loads during Express concurrency).
        await incrementProjectCreditsUsed(projectId, chargeCredits)
      }
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


