import { NextRequest, NextResponse } from 'next/server'
import { fetchModelCatalogs, fetchRichGatewayCatalog } from '@/lib/models/fetchModelCatalogs'
import { buildModelIntelligenceReport } from '@/lib/models/modelIntelligenceAdvisor'
import { loadLlmTelemetrySummary } from '@/lib/vertexai/llmTelemetry'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

/**
 * GET /api/cron/model-intelligence
 * Weekly Vercel Cron (UTC) that scans live model catalogs, pricing updates, and 30-day
 * SceneFlow LLM telemetry to log actionable Upgrade Dossiers & deprecation alerts.
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim()
  if (cronSecret) {
    const authHeader = req.headers.get('authorization') || ''
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const [catalogs, richGateway, telemetry] = await Promise.all([
    fetchModelCatalogs(),
    fetchRichGatewayCatalog(),
    loadLlmTelemetrySummary(30),
  ])

  const report = buildModelIntelligenceReport({
    catalogs,
    richGatewayModels: richGateway.models,
    telemetry,
  })

  console.log('[Cron Model Intelligence] Weekly scan completed:', {
    generatedAt: report.generatedAt,
    telemetryCalls30d: telemetry.totalCalls,
    telemetryCost30dUsd: telemetry.totalCostUsd,
    summary: report.recommendationsSummary,
    actionableDossiers: report.dossiers
      .filter((d) => d.verdict !== 'CURRENT')
      .map((d) => ({
        entryId: d.entryId,
        verdict: d.verdict,
        current: d.currentModelId,
        candidate: d.candidateModelId,
        deltaUsd: d.projected30dDeltaUsd,
      })),
  })

  return NextResponse.json({
    ok: true,
    generatedAt: report.generatedAt,
    summary: report.recommendationsSummary,
    telemetryCalls30d: telemetry.totalCalls,
    telemetryCost30dUsd: telemetry.totalCostUsd,
    actionableCount: report.dossiers.filter((d) => d.verdict !== 'CURRENT').length,
  })
}
