/**
 * Cash in versus model COGS versus manual GCP/Vercel costs.
 * Cash uses the price stored on the ledger, then the catalog price for a
 * matching credit grant. Face value ($0.01) is not treated as cash collected.
 */

import { Op } from 'sequelize'
import { AIUsage, CreditLedger, PlatformInfraCost } from '@/models'
import { TIER_CATALOG } from '@/lib/billing/tierCatalog'
import { TOP_UP_PACKS } from './creditCosts'
import { ensurePricingAdminSchema } from './rateCardStore'

export interface FinanceLedgerRow {
  reason: string
  deltaCredits: number
  meta?: Record<string, unknown> | null
}

export interface FinanceUsageRow {
  cogsUsd: number
  chargedCredits: number
  operation?: string
}

export interface FinanceInfraRow {
  source: string
  amountUsd: number
  periodMonth: string
  notes?: string | null
}

export interface FinanceSummary {
  cashInUsd: number
  creditsIssued: number
  creditsSpent: number
  breakageCredits: number
  modelCogsUsd: number
  grossAfterModelsUsd: number
  infraUsd: number
  infraBySource: Array<{ source: string; amountUsd: number }>
  bottomLineUsd: number
  payingOutMore: boolean
  usageByOperation: Array<{ operation: string; count: number; chargedCredits: number; cogsUsd: number }>
}

function positiveCash(value: unknown): number | null {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount <= 0) return null
  return amount
}

export function cashForLedgerRow(row: FinanceLedgerRow): number {
  const meta = row.meta || {}
  const explicit = positiveCash(meta.amount_paid_usd ?? meta.amount_paid ?? meta.priceUsd ?? meta.price_usd)
  if (explicit != null) return explicit

  const credits = Math.abs(Number(row.deltaCredits) || 0)
  if (row.reason === 'addon_purchase' || row.reason === 'purchase') {
    const pack = Object.values(TOP_UP_PACKS).find((item) => item.credits === credits)
    if (pack) return pack.price
  }

  if (row.reason === 'subscription_allocation' || row.reason === 'purchase') {
    const tierName = String(meta.tier_name || meta.tier || '').toLowerCase()
    if (tierName && tierName in TIER_CATALOG) {
      return TIER_CATALOG[tierName as keyof typeof TIER_CATALOG].priceUsd
    }
    const tier = Object.values(TIER_CATALOG).find((item) => item.credits === credits && item.priceUsd > 0)
    if (tier) return tier.priceUsd
  }

  return 0
}

const CASH_REASONS = new Set(['purchase', 'addon_purchase', 'subscription_allocation'])

export function summarizeFinance(input: {
  ledger: FinanceLedgerRow[]
  usage: FinanceUsageRow[]
  infra: FinanceInfraRow[]
}): FinanceSummary {
  let cashInUsd = 0
  let creditsIssued = 0
  let creditsSpent = 0

  for (const row of input.ledger) {
    const delta = Number(row.deltaCredits) || 0
    if (CASH_REASONS.has(row.reason) && delta > 0) {
      creditsIssued += delta
      cashInUsd += cashForLedgerRow(row)
    }
    if (row.reason === 'ai_usage' || row.reason === 'byok_platform_fee') {
      if (delta < 0) creditsSpent += Math.abs(delta)
    }
  }

  const byOperation = new Map<string, { count: number; chargedCredits: number; cogsUsd: number }>()
  let modelCogsUsd = 0
  for (const row of input.usage) {
    const cogs = Number(row.cogsUsd) || 0
    const credits = Number(row.chargedCredits) || 0
    modelCogsUsd += cogs
    const operation = row.operation || 'unknown'
    const current = byOperation.get(operation) || { count: 0, chargedCredits: 0, cogsUsd: 0 }
    byOperation.set(operation, {
      count: current.count + 1,
      chargedCredits: current.chargedCredits + credits,
      cogsUsd: current.cogsUsd + cogs,
    })
  }

  const infraBySourceMap = new Map<string, number>()
  let infraUsd = 0
  for (const row of input.infra) {
    const amount = Number(row.amountUsd) || 0
    infraUsd += amount
    infraBySourceMap.set(row.source, (infraBySourceMap.get(row.source) || 0) + amount)
  }

  const grossAfterModelsUsd = cashInUsd - modelCogsUsd
  const bottomLineUsd = grossAfterModelsUsd - infraUsd

  return {
    cashInUsd,
    creditsIssued,
    creditsSpent,
    breakageCredits: creditsIssued - creditsSpent,
    modelCogsUsd,
    grossAfterModelsUsd,
    infraUsd,
    infraBySource: Array.from(infraBySourceMap.entries()).map(([source, amountUsd]) => ({
      source,
      amountUsd,
    })),
    bottomLineUsd,
    payingOutMore: bottomLineUsd < 0,
    usageByOperation: Array.from(byOperation.entries())
      .map(([operation, data]) => ({ operation, ...data }))
      .sort((a, b) => b.cogsUsd - a.cogsUsd),
  }
}

export async function loadFinanceSummary(start: Date, end: Date): Promise<FinanceSummary> {
  await ensurePricingAdminSchema()
  const [ledger, usage, infra] = await Promise.all([
    CreditLedger.findAll({
      where: { created_at: { [Op.between]: [start, end] } },
      raw: true,
    }),
    AIUsage.findAll({
      where: { created_at: { [Op.between]: [start, end] } },
      raw: true,
    }),
    PlatformInfraCost.findAll({
      where: {
        period_month: {
          [Op.between]: [start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)],
        },
      },
      raw: true,
    }),
  ])

  return summarizeFinance({
    ledger: (ledger as unknown as Array<Record<string, unknown>>).map((row) => ({
      reason: String(row.reason || ''),
      deltaCredits: Number(row.delta_credits) || 0,
      meta: (row.meta as Record<string, unknown> | null) ?? null,
    })),
    usage: (usage as unknown as Array<Record<string, unknown>>).map((row) => {
      const meta = (row.meta as Record<string, unknown> | null) ?? null
      return {
        cogsUsd: Number(row.cogs_usd) || 0,
        chargedCredits: Number(row.charged_credits) || 0,
        operation: typeof meta?.operation === 'string' ? meta.operation : String(row.model || 'unknown'),
      }
    }),
    infra: (infra as unknown as Array<Record<string, unknown>>).map((row) => ({
      source: String(row.source || 'other'),
      amountUsd: Number(row.amount_usd) || 0,
      periodMonth: String(row.period_month || ''),
      notes: row.notes == null ? null : String(row.notes),
    })),
  })
}
