import { NextRequest, NextResponse } from 'next/server'
import { getAggregatorDiagnostics } from '@/lib/aggregator/config'
import { AGGREGATOR_MODEL_REGISTRY } from '@/lib/aggregator/modelRegistry'
import { renderfulAdapter } from '@/lib/aggregator/adapters/renderfulAdapter'

export const runtime = 'nodejs'

function catalogModels(available: boolean) {
  return AGGREGATOR_MODEL_REGISTRY.map((m) => ({
    id: m.id,
    label: m.label,
    methods: m.methods,
    costPerSecondUsd: m.costPerSecondUsd,
    nativeAudio: m.nativeAudio ?? false,
    available,
  }))
}

export async function GET(req: NextRequest) {
  const diagnostics = getAggregatorDiagnostics()
  const probe = req.nextUrl.searchParams.get('probe') === '1'

  let renderfulProbe: { reachable: boolean; modelCount?: number; error?: string } | undefined
  if (probe && diagnostics.enabled && diagnostics.vendor === 'renderful') {
    try {
      const models = await renderfulAdapter.listModels()
      renderfulProbe = { reachable: true, modelCount: models.length }
    } catch (e) {
      renderfulProbe = {
        reachable: false,
        error: e instanceof Error ? e.message : String(e),
      }
    }
  } else if (probe && !diagnostics.enabled) {
    renderfulProbe = {
      reachable: false,
      error: `Aggregator disabled (${diagnostics.disabledReason})`,
    }
  }

  return NextResponse.json({
    enabled: diagnostics.enabled,
    diagnostics,
    models: catalogModels(diagnostics.enabled),
    defaultModel: process.env.VIDEO_AGGREGATOR_DEFAULT_MODEL?.trim() || 'kling-2.6',
    ...(renderfulProbe ? { renderfulProbe } : {}),
  })
}
