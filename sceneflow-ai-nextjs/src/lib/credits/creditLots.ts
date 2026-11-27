/**
 * Prepaid credit lots.
 *
 * A credit is a license to the current credit schedule until its own expiry.
 * Subscription allotments die with the paid period. Explorer and add-on packs
 * each carry the shelf life of that purchase. A new purchase does not extend
 * older lots. Spend the soonest expiry first.
 */

export const EXPLORER_CREDIT_SHELF_LIFE_DAYS = 90
export const ADDON_CREDIT_SHELF_LIFE_DAYS = 365
export const SUBSCRIPTION_REFUND_WINDOW_DAYS = 7
export const PACK_REFUND_WINDOW_DAYS = 7
/** Ignore a second webhook that would reset a grant that just landed. */
export const DUPLICATE_SUBSCRIPTION_GRANT_WINDOW_MS = 10 * 60 * 1000

export const EXPLORER_CREDIT_PACK_COPY = '750 credits (expire 90 days after purchase)'
export const EXPLORER_CREDIT_FEATURE_COPY = 'Credits expire 90 days after purchase'
export const ADDON_PACK_SHELF_LIFE_COPY = 'Each pack lasts 12 months from purchase'
export const SUBSCRIPTION_CREDIT_EXPIRY_COPY = 'Unused monthly credits expire at period end'

export type CreditLotSource = 'subscription' | 'explorer' | 'addon'

export type CreditLotLedgerReason =
  | 'ai_usage'
  | 'refund'
  | 'purchase'
  | 'adjustment'
  | 'hold_release'
  | 'subscription_allocation'
  | 'addon_purchase'
  | 'subscription_expiry'
  | 'byok_platform_fee'

export interface CreditLot {
  id: string
  source: CreditLotSource
  remaining: number
  /** Size of this lot when it was issued. Refund checks compare remaining to this. */
  granted: number
  purchasedAt: string
  expiresAt: string
  ref?: string | null
}

export interface CreditLedgerIntent {
  delta: number
  prev: number
  next: number
  reason: CreditLotLedgerReason
  creditType: 'subscription' | 'addon' | null
  meta: Record<string, unknown>
}

export interface CreditBalances {
  subscription: number
  addon: number
  total: number
  subscriptionExpiresAt: string | null
  soonestPackExpiresAt: string | null
}

export function addDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000)
}

export function shelfLifeExpiresAt(source: 'explorer' | 'addon', purchasedAt: Date): Date {
  const days = source === 'explorer' ? EXPLORER_CREDIT_SHELF_LIFE_DAYS : ADDON_CREDIT_SHELF_LIFE_DAYS
  return addDays(purchasedAt, days)
}

export function createLot(input: {
  source: CreditLotSource
  credits: number
  purchasedAt: Date
  expiresAt: Date
  ref?: string | null
  id?: string
}): CreditLot {
  return {
    id: input.id ?? crypto.randomUUID(),
    source: input.source,
    remaining: input.credits,
    granted: input.credits,
    purchasedAt: input.purchasedAt.toISOString(),
    expiresAt: input.expiresAt.toISOString(),
    ref: input.ref ?? null,
  }
}

export function isExpired(lot: CreditLot, now: Date): boolean {
  return new Date(lot.expiresAt).getTime() <= now.getTime()
}

export function activeLots(lots: CreditLot[], now: Date): CreditLot[] {
  return lots.filter((lot) => lot.remaining > 0 && !isExpired(lot, now))
}

export function sumLots(lots: CreditLot[]): number {
  return lots.reduce((sum, lot) => sum + lot.remaining, 0)
}

function soonestExpiry(lots: CreditLot[]): string | null {
  return lots.reduce<string | null>((min, lot) => {
    if (!min || lot.expiresAt < min) return lot.expiresAt
    return min
  }, null)
}

export function balancesFromLots(lots: CreditLot[], now: Date): CreditBalances {
  const active = activeLots(lots, now)
  const subscriptionLots = active.filter((lot) => lot.source === 'subscription')
  const packLots = active.filter((lot) => lot.source !== 'subscription')
  const subscription = sumLots(subscriptionLots)
  const addon = sumLots(packLots)
  return {
    subscription,
    addon,
    total: subscription + addon,
    subscriptionExpiresAt: soonestExpiry(subscriptionLots),
    soonestPackExpiresAt: soonestExpiry(packLots),
  }
}

/** Soonest expiry first. Same timestamp: older purchase, then the monthly allotment. */
export function compareSpendOrder(a: CreditLot, b: CreditLot): number {
  if (a.expiresAt !== b.expiresAt) return a.expiresAt < b.expiresAt ? -1 : 1
  if (a.purchasedAt !== b.purchasedAt) return a.purchasedAt < b.purchasedAt ? -1 : 1
  if (a.source === b.source) return 0
  if (a.source === 'subscription') return -1
  if (b.source === 'subscription') return 1
  return 0
}

export function expireDueLots(
  lots: CreditLot[],
  now: Date
): { lots: CreditLot[]; expiredSubscription: number; expiredPack: number } {
  let expiredSubscription = 0
  let expiredPack = 0
  const kept: CreditLot[] = []
  for (const lot of lots) {
    if (lot.remaining <= 0) continue
    if (isExpired(lot, now)) {
      if (lot.source === 'subscription') expiredSubscription += lot.remaining
      else expiredPack += lot.remaining
      continue
    }
    kept.push(lot)
  }
  return { lots: kept, expiredSubscription, expiredPack }
}

export function materializeLegacyLots(input: {
  addonCredits: number
  subscriptionCredits: number
  subscriptionExpiresAt: Date | null
  now: Date
}): CreditLot[] {
  const lots: CreditLot[] = []
  if (input.subscriptionCredits > 0) {
    const expiresAt = input.subscriptionExpiresAt ?? addDays(input.now, 30)
    lots.push(
      createLot({
        source: 'subscription',
        credits: input.subscriptionCredits,
        purchasedAt: input.now,
        expiresAt,
        ref: 'legacy_subscription',
      })
    )
  }
  if (input.addonCredits > 0) {
    lots.push(
      createLot({
        source: 'addon',
        credits: input.addonCredits,
        purchasedAt: input.now,
        expiresAt: shelfLifeExpiresAt('addon', input.now),
        ref: 'legacy_addon',
      })
    )
  }
  return lots
}

export interface CreditRestoreEntry {
  lotId?: string
  source: CreditLotSource
  amount: number
  expiresAt: string | Date
  purchasedAt?: string | Date
  ref?: string | null
}

const GENERIC_SUBSCRIPTION_REFS = new Set([
  'renewal',
  'legacy_subscription',
  'subscription',
  'subscription_allocation',
])

export function normalizePaymentRef(paymentId: string): string {
  const trimmed = paymentId.trim()
  if (trimmed.startsWith('whop_payment:')) return trimmed
  if (trimmed.startsWith('whop_pay_')) return `whop_payment:${trimmed.slice('whop_pay_'.length)}`
  if (trimmed.startsWith('paddle_')) return trimmed
  return `whop_payment:${trimmed}`
}

function paymentRefVariants(value: string): string[] {
  const trimmed = value.trim()
  if (!trimmed) return []
  const variants = new Set<string>([trimmed])
  if (trimmed.startsWith('whop_payment:')) {
    const raw = trimmed.slice('whop_payment:'.length)
    if (raw) {
      variants.add(raw)
      variants.add(`whop_pay_${raw}`)
    }
  } else if (trimmed.startsWith('whop_pay_')) {
    const raw = trimmed.slice('whop_pay_'.length)
    if (raw) {
      variants.add(raw)
      variants.add(`whop_payment:${raw}`)
    }
  } else {
    variants.add(`whop_payment:${trimmed}`)
    variants.add(`whop_pay_${trimmed}`)
  }
  return [...variants]
}

export function hasDuplicateSubscriptionRef(
  lots: CreditLot[],
  ref?: string | null,
  paymentId?: string | null
): boolean {
  const candidates = new Set<string>()
  if (paymentId && paymentId.trim()) {
    for (const v of paymentRefVariants(paymentId)) candidates.add(v)
  }
  if (ref && ref.trim() && !GENERIC_SUBSCRIPTION_REFS.has(ref.trim().toLowerCase())) {
    for (const v of paymentRefVariants(ref)) candidates.add(v)
  }
  if (candidates.size === 0) return false
  return lots.some(
    (lot) =>
      lot.source === 'subscription' &&
      Boolean(lot.ref && candidates.has(lot.ref.trim()))
  )
}

export function hasRecentSubscriptionGrant(
  lots: CreditLot[],
  granted: number,
  now: Date,
  windowMs: number = DUPLICATE_SUBSCRIPTION_GRANT_WINDOW_MS
): boolean {
  return lots.some(
    (lot) =>
      lot.source === 'subscription' &&
      lot.granted === granted &&
      !isExpired(lot, now) &&
      now.getTime() - new Date(lot.purchasedAt).getTime() < windowMs
  )
}

function expiryIntents(
  startingBalance: number,
  expiredSubscription: number,
  expiredPack: number
): { intents: CreditLedgerIntent[]; balance: number } {
  const intents: CreditLedgerIntent[] = []
  let balance = startingBalance
  if (expiredSubscription > 0) {
    const next = balance - expiredSubscription
    intents.push({
      delta: -expiredSubscription,
      prev: balance,
      next,
      reason: 'subscription_expiry',
      creditType: 'subscription',
      meta: { expired_credits: expiredSubscription },
    })
    balance = next
  }
  if (expiredPack > 0) {
    const next = balance - expiredPack
    intents.push({
      delta: -expiredPack,
      prev: balance,
      next,
      reason: 'adjustment',
      creditType: 'addon',
      meta: { kind: 'pack_expiry', expired_credits: expiredPack },
    })
    balance = next
  }
  return { intents, balance }
}

export function applyCreditSpend(input: {
  lots: CreditLot[]
  amount: number
  now: Date
  reason: CreditLotLedgerReason
  meta?: Record<string, unknown>
}): {
  ok: boolean
  lots: CreditLot[]
  intents: CreditLedgerIntent[]
  usedSubscription: number
  usedAddon: number
  startingBalance: number
  endingBalance: number
} {
  const startingBalance = sumLots(input.lots.filter((lot) => lot.remaining > 0))
  const expired = expireDueLots(input.lots, input.now)
  const expiry = expiryIntents(startingBalance, expired.expiredSubscription, expired.expiredPack)
  const available = sumLots(expired.lots)
  if (input.amount > available) {
    return {
      ok: false,
      lots: expired.lots,
      intents: expiry.intents,
      usedSubscription: 0,
      usedAddon: 0,
      startingBalance,
      endingBalance: expiry.balance,
    }
  }

  let remaining = input.amount
  let usedSubscription = 0
  let usedAddon = 0
  const nextLots = expired.lots.slice().sort(compareSpendOrder).map((lot) => ({ ...lot }))
  for (const lot of nextLots) {
    if (remaining <= 0) break
    const take = Math.min(lot.remaining, remaining)
    lot.remaining -= take
    remaining -= take
    if (lot.source === 'subscription') usedSubscription += take
    else usedAddon += take
  }

  const endingBalance = expiry.balance - input.amount
  const creditType: 'subscription' | 'addon' | null =
    usedAddon > 0 && usedSubscription === 0
      ? 'addon'
      : usedAddon === 0 && usedSubscription > 0
        ? 'subscription'
        : null

  return {
    ok: true,
    lots: nextLots.filter((lot) => lot.remaining > 0),
    intents: [
      ...expiry.intents,
      {
        delta: -input.amount,
        prev: expiry.balance,
        next: endingBalance,
        reason: input.reason,
        creditType,
        meta: {
          ...(input.meta || {}),
          usedAddon,
          usedSubscription,
        },
      },
    ],
    usedSubscription,
    usedAddon,
    startingBalance,
    endingBalance,
  }
}

export function applySubscriptionGrant(input: {
  lots: CreditLot[]
  credits: number
  now: Date
  expiresAt: Date
  ref?: string | null
  paymentId?: string | null
  preserveUnusedOnUpgrade?: boolean
  isMidCycleUpgrade?: boolean
  meta?: Record<string, unknown>
}): {
  lots: CreditLot[]
  intents: CreditLedgerIntent[]
  duplicate: boolean
  droppedSubscription: number
  carriedOverSubscription: number
  granted: number
  startingBalance: number
  endingBalance: number
} {
  const startingBalance = sumLots(input.lots.filter((lot) => lot.remaining > 0))
  const expired = expireDueLots(input.lots, input.now)
  const expiry = expiryIntents(startingBalance, expired.expiredSubscription, expired.expiredPack)
  const lots = expired.lots
  let balance = expiry.balance
  const intents = [...expiry.intents]

  if (input.credits <= 0) {
    return {
      lots,
      intents,
      duplicate: false,
      droppedSubscription: 0,
      carriedOverSubscription: 0,
      granted: 0,
      startingBalance,
      endingBalance: balance,
    }
  }

  // Canonical payment-ID / ref deduplication applies regardless of the 10-minute window.
  if (
    hasDuplicateSubscriptionRef(input.lots, input.ref, input.paymentId) ||
    hasRecentSubscriptionGrant(lots, input.credits, input.now)
  ) {
    return {
      lots,
      intents,
      duplicate: true,
      droppedSubscription: 0,
      carriedOverSubscription: 0,
      granted: 0,
      startingBalance,
      endingBalance: balance,
    }
  }

  const existingSubLots = lots.filter((lot) => lot.source === 'subscription')
  const existingMaxGranted = existingSubLots.reduce(
    (max, lot) => Math.max(max, lot.granted),
    0
  )
  const shouldPreserveUnused =
    existingSubLots.length > 0 &&
    (input.isMidCycleUpgrade === true ||
      (input.preserveUnusedOnUpgrade === true && input.credits > existingMaxGranted))

  let droppedSubscription = 0
  let carriedOverSubscription = 0
  const kept: CreditLot[] = []
  for (const lot of lots) {
    if (lot.source === 'subscription') {
      if (shouldPreserveUnused) {
        carriedOverSubscription += lot.remaining
        kept.push({ ...lot })
      } else {
        droppedSubscription += lot.remaining
      }
      continue
    }
    kept.push(lot)
  }
  if (droppedSubscription > 0) {
    const next = balance - droppedSubscription
    intents.push({
      delta: -droppedSubscription,
      prev: balance,
      next,
      reason: 'subscription_expiry',
      creditType: 'subscription',
      meta: { kind: 'no_rollover', expired_credits: droppedSubscription },
    })
    balance = next
  }

  const effectiveRef =
    input.ref ?? (input.paymentId ? normalizePaymentRef(input.paymentId) : null)

  const grant = createLot({
    source: 'subscription',
    credits: input.credits,
    purchasedAt: input.now,
    expiresAt: input.expiresAt,
    ref: effectiveRef,
  })
  kept.push(grant)
  const endingBalance = balance + input.credits
  intents.push({
    delta: input.credits,
    prev: balance,
    next: endingBalance,
    reason: 'subscription_allocation',
    creditType: 'subscription',
    meta: {
      ...(input.meta || {}),
      ...(carriedOverSubscription > 0
        ? {
            kind: 'upgrade_carryover',
            carried_over_credits: carriedOverSubscription,
          }
        : {}),
      expires_at: input.expiresAt.toISOString(),
      rollover: false,
    },
  })

  return {
    lots: kept,
    intents,
    duplicate: false,
    droppedSubscription,
    carriedOverSubscription,
    granted: input.credits,
    startingBalance,
    endingBalance,
  }
}

export function applyPackGrant(input: {
  lots: CreditLot[]
  source: 'explorer' | 'addon'
  credits: number
  now: Date
  ref?: string | null
  meta?: Record<string, unknown>
  ledgerReason?: CreditLotLedgerReason
}): {
  lots: CreditLot[]
  intents: CreditLedgerIntent[]
  startingBalance: number
  endingBalance: number
  expiresAt: string
} {
  const startingBalance = sumLots(input.lots.filter((lot) => lot.remaining > 0))
  const expired = expireDueLots(input.lots, input.now)
  const expiry = expiryIntents(startingBalance, expired.expiredSubscription, expired.expiredPack)
  const grant = createLot({
    source: input.source,
    credits: input.credits,
    purchasedAt: input.now,
    expiresAt: shelfLifeExpiresAt(input.source, input.now),
    ref: input.ref,
  })
  const endingBalance = expiry.balance + input.credits
  return {
    lots: [...expired.lots, grant],
    intents: [
      ...expiry.intents,
      {
        delta: input.credits,
        prev: expiry.balance,
        next: endingBalance,
        reason: input.ledgerReason ?? 'addon_purchase',
        creditType: 'addon',
        meta: {
          ...(input.meta || {}),
          source: input.source,
          expires_at: grant.expiresAt,
          pack_size: input.credits,
        },
      },
    ],
    startingBalance,
    endingBalance,
    expiresAt: grant.expiresAt,
  }
}

/**
 * Put credits back onto matching original lots (when provenance is supplied) or
 * onto the soonest-expiring lots up to each lot's original grant.
 * Falls back to a 12-month add-on lot only when no original lot provenance is provided.
 */
export function applyCreditRestore(input: {
  lots: CreditLot[]
  amount: number
  now: Date
  meta?: Record<string, unknown>
  restoreEntries?: CreditRestoreEntry[]
  source?: CreditLotSource
  expiresAt?: string | Date
  purchasedAt?: string | Date
  ref?: string | null
}): {
  lots: CreditLot[]
  intents: CreditLedgerIntent[]
  startingBalance: number
  endingBalance: number
} {
  const expired = expireDueLots(input.lots, input.now)
  const startingBalance = sumLots(input.lots.filter((lot) => lot.remaining > 0))
  const expiry = expiryIntents(startingBalance, expired.expiredSubscription, expired.expiredPack)
  const active = expired.lots.slice().sort(compareSpendOrder).map((lot) => ({ ...lot }))

  let left = Math.max(0, input.amount)
  let restoredTotal = 0
  let restoredSubscription = 0
  let restoredAddon = 0

  const provenanceEntries: CreditRestoreEntry[] =
    input.restoreEntries && input.restoreEntries.length > 0
      ? input.restoreEntries
      : input.source && input.expiresAt
        ? [
            {
              source: input.source,
              amount: left,
              expiresAt: input.expiresAt,
              purchasedAt: input.purchasedAt,
              ref: input.ref,
            },
          ]
        : []

  if (provenanceEntries.length > 0) {
    for (const entry of provenanceEntries) {
      if (left <= 0) break
      if (entry.amount <= 0) continue
      const put = Math.min(entry.amount, left)
      left -= put

      const expDate =
        entry.expiresAt instanceof Date ? entry.expiresAt : new Date(entry.expiresAt)
      if (Number.isNaN(expDate.getTime()) || expDate.getTime() <= input.now.getTime()) {
        // Do not resurrect already-expired lots into 365-day add-on credits.
        continue
      }

      const expIso = expDate.toISOString()
      const matched =
        (entry.lotId ? active.find((lot) => lot.id === entry.lotId) : undefined) ??
        active.find((lot) => lot.source === entry.source && lot.expiresAt === expIso)

      if (matched) {
        matched.remaining += put
        if (matched.remaining > matched.granted) {
          matched.granted = matched.remaining
        }
      } else {
        const purchasedDate = entry.purchasedAt
          ? entry.purchasedAt instanceof Date
            ? entry.purchasedAt
            : new Date(entry.purchasedAt)
          : input.now
        active.push(
          createLot({
            id: entry.lotId,
            source: entry.source,
            credits: put,
            purchasedAt: Number.isNaN(purchasedDate.getTime()) ? input.now : purchasedDate,
            expiresAt: expDate,
            ref: entry.ref ?? 'credit_restore',
          })
        )
      }

      restoredTotal += put
      if (entry.source === 'subscription') restoredSubscription += put
      else restoredAddon += put
    }
  }

  // Fallback for legacy callers (or any unattributed remainder when partial provenance was passed).
  if (left > 0) {
    for (const lot of active) {
      if (left <= 0) break
      const room = Math.max(0, lot.granted - lot.remaining)
      const put = Math.min(room, left)
      if (put <= 0) continue
      lot.remaining += put
      left -= put
      restoredTotal += put
      if (lot.source === 'subscription') restoredSubscription += put
      else restoredAddon += put
    }
    if (left > 0) {
      active.push(
        createLot({
          source: 'addon',
          credits: left,
          purchasedAt: input.now,
          expiresAt: shelfLifeExpiresAt('addon', input.now),
          ref: 'credit_restore',
        })
      )
      restoredTotal += left
      restoredAddon += left
      left = 0
    }
  }

  const endingBalance = expiry.balance + restoredTotal
  const creditType: 'subscription' | 'addon' | null =
    restoredSubscription > 0 && restoredAddon === 0
      ? 'subscription'
      : restoredAddon > 0 && restoredSubscription === 0
        ? 'addon'
        : null

  const intents: CreditLedgerIntent[] = [...expiry.intents]
  if (restoredTotal > 0) {
    intents.push({
      delta: restoredTotal,
      prev: expiry.balance,
      next: endingBalance,
      reason: 'refund',
      creditType,
      meta: { ...(input.meta || {}), kind: 'credit_restore' },
    })
  }

  return {
    lots: active.filter((lot) => lot.remaining > 0),
    intents,
    startingBalance,
    endingBalance,
  }
}

export type RefundEligibilityReason = 'eligible_unused' | 'credits_used' | 'window_closed' | 'no_grant'

export interface RefundEligibility {
  eligible: boolean
  reason: RefundEligibilityReason
}

export function evaluateSubscriptionRefund(input: {
  lots: CreditLot[]
  now: Date
  windowDays?: number
}): RefundEligibility {
  const windowDays = input.windowDays ?? SUBSCRIPTION_REFUND_WINDOW_DAYS
  const subscriptionLots = input.lots.filter((lot) => lot.source === 'subscription' && !isExpired(lot, input.now))
  if (subscriptionLots.length === 0) return { eligible: false, reason: 'no_grant' }
  const grant = subscriptionLots.slice().sort((a, b) => (a.purchasedAt < b.purchasedAt ? 1 : -1))[0]
  const windowEnd = new Date(grant.purchasedAt).getTime() + windowDays * 24 * 60 * 60 * 1000
  if (input.now.getTime() > windowEnd) return { eligible: false, reason: 'window_closed' }
  if (grant.remaining !== grant.granted) return { eligible: false, reason: 'credits_used' }
  return { eligible: true, reason: 'eligible_unused' }
}

export function evaluatePackRefund(input: {
  lot: CreditLot
  now: Date
  windowDays?: number
}): RefundEligibility {
  const windowDays = input.windowDays ?? PACK_REFUND_WINDOW_DAYS
  if (input.lot.source === 'subscription') return { eligible: false, reason: 'no_grant' }
  const windowEnd = new Date(input.lot.purchasedAt).getTime() + windowDays * 24 * 60 * 60 * 1000
  if (input.now.getTime() > windowEnd) return { eligible: false, reason: 'window_closed' }
  if (input.lot.remaining !== input.lot.granted || isExpired(input.lot, input.now)) {
    return { eligible: false, reason: input.lot.remaining !== input.lot.granted ? 'credits_used' : 'window_closed' }
  }
  return { eligible: true, reason: 'eligible_unused' }
}
