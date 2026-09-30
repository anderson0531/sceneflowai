/**
 * Published provider rates live in credit_pricing.
 * Refresh writes drafts. Publish is what generation reads.
 */

import { Op } from 'sequelize'
import { CreditPricing } from '@/models'
import { sequelize } from '@/config/database'
import {
  DEFAULT_MARKUP,
  SEEDED_PROVIDER_RATES,
  type SeededProviderRate,
} from './quoteGenerationCredits'

let migrationDone = false

export async function ensurePricingAdminSchema(): Promise<void> {
  if (migrationDone) return
  await sequelize.query(`
    ALTER TABLE credit_pricing
      ADD COLUMN IF NOT EXISTS resolution VARCHAR(20),
      ADD COLUMN IF NOT EXISTS has_audio BOOLEAN,
      ADD COLUMN IF NOT EXISTS markup DECIMAL(6, 3) DEFAULT 1.800,
      ADD COLUMN IF NOT EXISTS credits_override INTEGER,
      ADD COLUMN IF NOT EXISTS source_url TEXT,
      ADD COLUMN IF NOT EXISTS fetched_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS rate_status VARCHAR(20) NOT NULL DEFAULT 'published';
  `)
  await sequelize.query(`
    ALTER TABLE ai_usage
      ADD COLUMN IF NOT EXISTS meta JSONB;
  `)
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS platform_infra_costs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      period_month DATE NOT NULL,
      source VARCHAR(20) NOT NULL,
      amount_usd DECIMAL(12, 2) NOT NULL,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)
  migrationDone = true
}

export interface RateCardRow {
  id: string | null
  operation: string
  provider: string
  model: string
  resolution: string | null
  audio: boolean | null
  metric: string
  usdPerUnit: number
  markup: number
  creditsPerUnitOverride: number | null
  creditsPerUnit: number
  rateStatus: 'seed' | 'draft' | 'published'
  isActive: boolean
  sourceUrl: string | null
  fetchedAt: string | null
  effectiveFrom: string | null
  notes: string | null
}

function num(value: unknown, fallback = 0): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function seedToRateCardRow(seed: SeededProviderRate): RateCardRow {
  return {
    id: null,
    operation: seed.operation,
    provider: seed.provider,
    model: seed.model,
    resolution: seed.resolution,
    audio: seed.audio,
    metric: seed.metric,
    usdPerUnit: seed.usdPerUnit,
    markup: DEFAULT_MARKUP,
    creditsPerUnitOverride: null,
    creditsPerUnit: 0,
    rateStatus: 'seed',
    isActive: false,
    sourceUrl: seed.sourceUrl,
    fetchedAt: null,
    effectiveFrom: null,
    notes: seed.notes,
  }
}

export function modelToRateCardRow(row: CreditPricing): RateCardRow {
  const status = (row as CreditPricing & { rate_status?: string }).rate_status
  return {
    id: row.id,
    operation: row.operation,
    provider: row.provider,
    model: row.model,
    resolution: (row as CreditPricing & { resolution?: string | null }).resolution ?? null,
    audio: (row as CreditPricing & { has_audio?: boolean | null }).has_audio ?? null,
    metric: row.metric,
    usdPerUnit: num(row.provider_cost_usd),
    markup: num((row as CreditPricing & { markup?: number }).markup, DEFAULT_MARKUP),
    creditsPerUnitOverride:
      (row as CreditPricing & { credits_override?: number | null }).credits_override ?? null,
    creditsPerUnit: num(row.credits_per_unit),
    rateStatus: status === 'draft' ? 'draft' : 'published',
    isActive: row.is_active,
    sourceUrl: (row as CreditPricing & { source_url?: string | null }).source_url ?? null,
    fetchedAt: (row as CreditPricing & { fetched_at?: Date | null }).fetched_at
      ? new Date((row as CreditPricing & { fetched_at?: Date }).fetched_at as Date).toISOString()
      : null,
    effectiveFrom: row.effective_from ? new Date(row.effective_from).toISOString() : null,
    notes: row.notes,
  }
}

export async function listRateCardRows(): Promise<RateCardRow[]> {
  await ensurePricingAdminSchema()
  const rows = await CreditPricing.findAll({
    where: {
      operation: { [Op.in]: SEEDED_PROVIDER_RATES.map((seed) => seed.operation) },
    },
    order: [['effective_from', 'DESC']],
  })
  return rows.map((row) => modelToRateCardRow(row))
}

export async function findPublishedRate(operation: string): Promise<RateCardRow | null> {
  await ensurePricingAdminSchema()
  const now = new Date()
  const row = await CreditPricing.findOne({
    where: {
      operation,
      is_active: true,
      rate_status: 'published',
      effective_from: { [Op.lte]: now },
      [Op.or]: [{ effective_to: null }, { effective_to: { [Op.gte]: now } }],
    } as never,
    order: [['effective_from', 'DESC']],
  })
  return row ? modelToRateCardRow(row) : null
}

export interface RateDraftInput {
  operation: string
  usdPerUnit: number
  markup?: number
  creditsPerUnitOverride?: number | null
  sourceUrl?: string | null
  notes?: string | null
  fetchedAt?: Date | null
}

export async function saveRateDraft(input: RateDraftInput): Promise<RateCardRow> {
  await ensurePricingAdminSchema()
  const seed = SEEDED_PROVIDER_RATES.find((rate) => rate.operation === input.operation)
  if (!seed) {
    throw new Error(`Unknown rate operation: ${input.operation}`)
  }
  const markup = input.markup ?? DEFAULT_MARKUP
  const creditsPerUnit = Math.ceil((input.usdPerUnit * markup) / 0.01)
  const row = await CreditPricing.create({
    provider: seed.provider,
    category: seed.category,
    operation: seed.operation,
    model: seed.model,
    metric: seed.metric,
    credits_per_unit: creditsPerUnit,
    provider_cost_usd: input.usdPerUnit,
    margin_percent: 0,
    is_active: false,
    effective_from: new Date(),
    effective_to: null,
    notes: input.notes ?? seed.notes,
    resolution: seed.resolution,
    has_audio: seed.audio,
    markup,
    credits_override: input.creditsPerUnitOverride ?? null,
    source_url: input.sourceUrl ?? seed.sourceUrl,
    fetched_at: input.fetchedAt ?? null,
    rate_status: 'draft',
  } as never)
  return modelToRateCardRow(row)
}

export async function publishRate(id: string): Promise<RateCardRow> {
  await ensurePricingAdminSchema()
  const row = await CreditPricing.findByPk(id)
  if (!row) throw new Error('Rate not found')
  const now = new Date()
  await CreditPricing.update(
    { is_active: false, effective_to: now } as never,
    {
      where: {
        operation: row.operation,
        is_active: true,
        id: { [Op.ne]: row.id },
      },
    }
  )
  await row.update({
    is_active: true,
    effective_from: now,
    effective_to: null,
    rate_status: 'published',
  } as never)
  return modelToRateCardRow(row)
}
