import { describe, expect, it } from 'vitest'
import {
  DEFAULT_AUDIT_THRESHOLDS,
  evaluateAuditAlerts,
  evaluateWindowEconomics,
  type RunLikeRow,
} from '@/lib/credits/creditAuditEngine'
import { inferVendorFromProviderOrModel } from '@/lib/credits/meteredGateway'
import { CREDIT_VALUE_USD, CreditService } from '@/services/CreditService'

describe('CreditService currency alignment', () => {
  it('uses unified $0.01/credit (100 credits = $1.00) with 2x default markup', () => {
    expect(CREDIT_VALUE_USD).toBe(0.01)
    // $0.50 provider COGS * 2x markup / $0.01 = 100 credits
    expect(CreditService.usdToCredits(0.5)).toBe(100)
  })
})

describe('inferVendorFromProviderOrModel', () => {
  it('accurately categorizes Vertex, Kling, Fal, OpenAI, ElevenLabs, and Aggregator', () => {
    expect(inferVendorFromProviderOrModel('vertex', 'gemini-3-pro-image')).toBe('vertex')
    expect(inferVendorFromProviderOrModel(null, 'veo-3.1-fast')).toBe('vertex')
    expect(inferVendorFromProviderOrModel('kling', 'kling-v2.6')).toBe('kling')
    expect(inferVendorFromProviderOrModel('fal', 'fal-ai/kling')).toBe('fal')
    expect(inferVendorFromProviderOrModel('aggregator', 'kling-omni')).toBe('aggregator')
    expect(inferVendorFromProviderOrModel('aggregator', 'wan-2.1')).toBe('aggregator')
    expect(inferVendorFromProviderOrModel(null, 'gpt-image-1')).toBe('openai')
    expect(inferVendorFromProviderOrModel(null, 'eleven_turbo_v2_5')).toBe('elevenlabs')
    expect(inferVendorFromProviderOrModel('cloud_run', 'ffmpeg')).toBe('cloud_run')
  })
})

describe('Automated Credit Audit Engine', () => {
  it('detects unbilled platform runs and computes rolling margin accurately', () => {
    const runs: RunLikeRow[] = [
      {
        id: 'r1',
        route: '/api/segments/1/generate-asset',
        provider: 'vertex',
        model: 'veo-3.1-fast',
        operation: 'veo_fast',
        credential_source: 'platform',
        status: 'succeeded',
        estimated_cogs_usd: 1.2,
        ledger_id: 'led-1',
        charged_credits: 240, // $2.40 rev => 50% margin
        user_id: 'u1',
        created_at: new Date(),
      },
      {
        id: 'r2',
        route: '/api/vision/generate-backdrop-video',
        provider: 'vertex',
        model: 'veo-3.1-fast',
        operation: 'veo_fast',
        credential_source: 'platform',
        status: 'succeeded',
        estimated_cogs_usd: 12.5,
        ledger_id: null,
        charged_credits: 0, // UNBILLED LEAK!
        user_id: 'u2',
        created_at: new Date(),
      },
      {
        id: 'r3',
        route: '/api/scene/generate-image',
        provider: 'vertex',
        model: 'gemini-3-pro-image',
        operation: 'still',
        credential_source: 'byok',
        status: 'succeeded',
        estimated_cogs_usd: 0, // BYOK has $0 platform COGS
        ledger_id: 'led-3',
        charged_credits: 6,
        user_id: 'u3',
        created_at: new Date(),
      },
      {
        id: 'r4',
        route: '/api/scene/generate-image',
        provider: 'vertex',
        model: 'gemini-3-pro-image',
        operation: 'still',
        credential_source: 'platform',
        status: 'rate_limited',
        estimated_cogs_usd: 0,
        ledger_id: null,
        charged_credits: 0, // 429 did not incur provider cost -> NOT an unbilled leak
        user_id: 'u1',
        created_at: new Date(),
      },
    ]

    const { economics, unbilledSamples } = evaluateWindowEconomics(runs, 1)
    expect(economics.totalRuns).toBe(4)
    expect(economics.succeededRuns).toBe(3)
    expect(economics.rateLimitedRuns).toBe(1)
    expect(economics.unbilledPlatformRuns).toBe(1)
    expect(economics.unbilledCogsUsd).toBe(12.5)
    expect(economics.totalPlatformCogsUsd).toBe(13.7)
    expect(economics.totalChargedCredits).toBe(246)
    expect(unbilledSamples).toHaveLength(1)
    expect(unbilledSamples[0].id).toBe('r2')

    const alerts = evaluateAuditAlerts({
      hourly: economics,
      daily: economics,
      balanceDriftCount: 2,
      staleHoldsExpired: 1,
      thresholds: DEFAULT_AUDIT_THRESHOLDS,
    })

    const codes = alerts.map((a) => a.code)
    expect(codes).toContain('UNBILLED_PLATFORM_RUNS')
    expect(codes).toContain('UNBILLED_COGS_SPIKE')
    expect(codes).toContain('LOW_ROLLING_MARGIN')
    expect(codes).toContain('BALANCE_LOT_DRIFT')
    expect(codes).toContain('STALE_HOLDS_EXPIRED')
    expect(alerts.some((a) => a.severity === 'critical')).toBe(true)
  })

  it('reports zero alerts when all platform runs are billed with healthy >= 50% margin', () => {
    const runs: RunLikeRow[] = [
      {
        id: 'r1',
        route: '/api/scene/generate-image',
        provider: 'vertex',
        model: 'gemini-3-pro-image',
        operation: 'still',
        credential_source: 'platform',
        status: 'succeeded',
        estimated_cogs_usd: 0.14,
        ledger_id: 'led-1',
        charged_credits: 30, // $0.30 rev -> 53.3% margin
        user_id: 'u1',
        created_at: new Date(),
      },
    ]

    const { economics } = evaluateWindowEconomics(runs, 24)
    expect(economics.unbilledPlatformRuns).toBe(0)
    expect(economics.effectiveMarginPercent).toBeGreaterThan(50)

    const alerts = evaluateAuditAlerts({
      hourly: economics,
      daily: economics,
      balanceDriftCount: 0,
      staleHoldsExpired: 0,
    })
    expect(alerts).toHaveLength(0)
  })
})
