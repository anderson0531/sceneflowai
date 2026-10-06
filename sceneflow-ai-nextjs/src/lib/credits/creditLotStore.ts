import type { Transaction } from 'sequelize'
import { CreditLotRow } from '@/models/CreditLot'
import {
  balancesFromLots,
  materializeLegacyLots,
  type CreditBalances,
  type CreditLot,
  type CreditLotSource,
} from '@/lib/credits/creditLots'

type BalanceUser = {
  id: string
  credits?: number | null
  subscription_credits_monthly: number
  addon_credits: number
  subscription_credits_expires_at?: Date | null
}

function mapRow(row: CreditLotRow): CreditLot {
  const source = row.source
  if (source !== 'subscription' && source !== 'explorer' && source !== 'addon') {
    throw new Error(`Unknown credit lot source: ${source}`)
  }
  return {
    id: row.id,
    source,
    remaining: Number(row.remaining),
    granted: Number(row.granted),
    purchasedAt: new Date(row.purchased_at).toISOString(),
    expiresAt: new Date(row.expires_at).toISOString(),
    ref: row.ref,
  }
}

export async function readStoredLots(
  userId: string,
  transaction?: Transaction
): Promise<CreditLot[]> {
  const rows = await CreditLotRow.findAll({
    where: { user_id: userId },
    transaction,
  })
  return rows.map(mapRow).filter((lot) => lot.remaining > 0)
}

/**
 * Rows already on the books win. An empty table falls back to the legacy
 * counters so the first charge after this change starts a shelf-life clock
 * instead of treating old balances as permanent.
 */
export async function loadUserLots(
  user: BalanceUser,
  now: Date,
  transaction?: Transaction
): Promise<{ lots: CreditLot[]; materialized: boolean }> {
  const rows = await CreditLotRow.findAll({
    where: { user_id: user.id },
    transaction,
  })
  if (rows.length > 0) {
    return {
      lots: rows.map(mapRow).filter((lot) => lot.remaining > 0),
      materialized: false,
    }
  }

  return {
    lots: materializeLegacyLots({
      addonCredits: Number(user.addon_credits || 0),
      subscriptionCredits: Number(user.subscription_credits_monthly || 0),
      subscriptionExpiresAt: user.subscription_credits_expires_at
        ? new Date(user.subscription_credits_expires_at)
        : null,
      now,
    }),
    materialized: Number(user.addon_credits || 0) > 0 || Number(user.subscription_credits_monthly || 0) > 0,
  }
}

export async function saveUserLots(
  userId: string,
  lots: CreditLot[],
  transaction: Transaction
): Promise<void> {
  await CreditLotRow.destroy({ where: { user_id: userId }, transaction })
  if (lots.length === 0) return

  await CreditLotRow.bulkCreate(
    lots.map((lot) => ({
      id: lot.id,
      user_id: userId,
      source: lot.source as CreditLotSource,
      remaining: lot.remaining,
      granted: lot.granted,
      purchased_at: new Date(lot.purchasedAt),
      expires_at: new Date(lot.expiresAt),
      ref: lot.ref ?? null,
    })),
    { transaction }
  )
}

export function assignBalances(user: BalanceUser, lots: CreditLot[], now: Date): CreditBalances {
  const balances = balancesFromLots(lots, now)
  user.credits = balances.total
  user.subscription_credits_monthly = balances.subscription
  user.addon_credits = balances.addon
  user.subscription_credits_expires_at = balances.subscriptionExpiresAt
    ? new Date(balances.subscriptionExpiresAt)
    : null
  return balances
}
