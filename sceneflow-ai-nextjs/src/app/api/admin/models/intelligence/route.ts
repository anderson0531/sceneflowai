import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/admin/requireAdmin'
import { fetchModelCatalogs, fetchRichGatewayCatalog } from '@/lib/models/fetchModelCatalogs'
import { buildModelIntelligenceReport } from '@/lib/models/modelIntelligenceAdvisor'
import { listCanaryOverrides } from '@/lib/models/canaryOverrideStore'
import { loadLlmTelemetrySummary } from '@/lib/vertexai/llmTelemetry'
import { compareProductionFidelityTiers } from '@/lib/video/fidelityPlanner'
import { isAiGatewayConfigured } from '@/lib/llm/aiGatewayClient'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

/** Canonical 60-minute (3,600s) feature mix used to display longform video cost accessibility ladder */
function buildSample60MinFidelityComparison() {
  const segments = [
    ...Array.from({ length: 75 }, (_, i) => ({
      id: `hero-${i}`,
      durationSec: 8,
      actionText: 'High-speed chase tracking shot across rain-slick harbor',
      shotType: 'Tracking Shot',
    })),
    ...Array.from({ length: 240 }, (_, i) => ({
      id: `dlg-${i}`,
      durationSec: 8,
      dialogueText: 'Intimate dramatic exchange with subtext over coffee table',
      shotType: 'Medium Close-Up',
    })),
    ...Array.from({ length: 135 }, (_, i) => ({
      id: `est-${i}`,
      durationSec: 8,
      actionText: 'Wide establishing shot of coastal harbor at golden hour sunrise',
      shotType: 'Wide Establishing Shot',
    })),
  ]
  const comparison = compareProductionFidelityTiers(segments)
  return {
    animatic_first: {
      label: comparison.animatic_first.label,
      totalCostUsd: comparison.animatic_first.totalCostUsd,
      savingsVsCinemaPercent: comparison.animatic_first.savingsVsCinemaPercent,
    },
    hybrid_indie: {
      label: comparison.hybrid_indie.label,
      totalCostUsd: comparison.hybrid_indie.totalCostUsd,
      savingsVsCinemaPercent: comparison.hybrid_indie.savingsVsCinemaPercent,
    },
    cinema_cut: {
      label: comparison.cinema_cut.label,
      totalCostUsd: comparison.cinema_cut.totalCostUsd,
      savingsVsCinemaPercent: 0,
    },
  }
}

async function handleIntelligenceRequest(req: NextRequest) {
  const session = await requireAdminSession()
  if (!session.authorized) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
  }

  const daysParam = Number(req.nextUrl.searchParams.get('days') || 30)
  const periodDays = Number.isFinite(daysParam) && daysParam > 0 ? Math.min(90, daysParam) : 30

  const [catalogs, richGateway, telemetry] = await Promise.all([
    fetchModelCatalogs(),
    fetchRichGatewayCatalog(),
    loadLlmTelemetrySummary(periodDays),
  ])

  const report = buildModelIntelligenceReport({
    catalogs,
    richGatewayModels: richGateway.models,
    telemetry,
  })

  return NextResponse.json({
    ...report,
    catalogs,
    richGatewayStatus: richGateway.status,
    aiGatewayInferenceEnabled: isAiGatewayConfigured(),
    canaryOverrides: listCanaryOverrides(),
    longformVideoFidelityComparison: buildSample60MinFidelityComparison(),
  })
}

export async function GET(req: NextRequest) {
  return handleIntelligenceRequest(req)
}

export async function POST(req: NextRequest) {
  return handleIntelligenceRequest(req)
}
