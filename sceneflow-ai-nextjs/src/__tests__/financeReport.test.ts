import { describe, expect, it } from 'vitest'
import { getEffectiveCredits } from '@/lib/credits/creditCosts'
import { cashForLedgerRow, summarizeFinance } from '@/lib/credits/financeReport'

describe('finance summary', () => {
  it('uses catalog cash instead of face value and flags a loss', () => {
    const summary = summarizeFinance({
      ledger: [
        { reason: 'subscription_allocation', deltaCredits: 75000, meta: { tier_name: 'studio' } },
        { reason: 'addon_purchase', deltaCredits: 2000, meta: { amount_paid_usd: 25 } },
        { reason: 'ai_usage', deltaCredits: -10000 },
        { reason: 'adjustment', deltaCredits: 5000 },
      ],
      usage: [
        { operation: 'omni_1080p', cogsUsd: 700, chargedCredits: 10000 },
      ],
      infra: [
        { source: 'gcp', amountUsd: 40, periodMonth: '2026-09-01' },
        { source: 'vercel', amountUsd: 20, periodMonth: '2026-09-01' },
      ],
    })

    expect(summary.cashInUsd).toBe(599 + 25)
    expect(summary.creditsIssued).toBe(77000)
    expect(summary.creditsSpent).toBe(10000)
    expect(summary.breakageCredits).toBe(67000)
    expect(summary.modelCogsUsd).toBe(700)
    expect(summary.grossAfterModelsUsd).toBe(599 + 25 - 700)
    expect(summary.infraUsd).toBe(60)
    expect(summary.bottomLineUsd).toBe(599 + 25 - 700 - 60)
    expect(summary.payingOutMore).toBe(true)
  })

  it('matches add-on packs when the ledger omits the paid amount', () => {
    expect(cashForLedgerRow({ reason: 'addon_purchase', deltaCredits: 9000 })).toBe(100)
    expect(cashForLedgerRow({ reason: 'addon_purchase', deltaCredits: 25000 })).toBe(250)
  })
})

describe('BYOK fee scope', () => {
  it('applies the 20% fee only for reference, still, and clip when a key was used', () => {
    expect(getEffectiveCredits(100, true, 'clip')).toBe(20)
    expect(getEffectiveCredits(100, true, 'still')).toBe(20)
    expect(getEffectiveCredits(100, true, 'reference')).toBe(20)
    expect(getEffectiveCredits(100, true)).toBe(100)
    expect(getEffectiveCredits(100, false, 'clip')).toBe(100)
  })
})
