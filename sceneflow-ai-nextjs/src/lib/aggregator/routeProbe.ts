import { renderfulAdapter } from './adapters/renderfulAdapter'
import { getAggregatorDiagnostics } from './config'
import { getDefaultAggregatorModelId } from './modelRegistry'
import type { AggregatorDiagnostics } from './config'

export interface AggregatorRoutingInfo {
  requestedProvider: 'aggregator'
  aggregatorEnabled: boolean
  videoModel: string
  wouldRouteTo: string
}

export interface RenderfulProbeResult {
  reachable: boolean
  modelCount?: number
  error?: string
}

export function buildRoutingTrace(
  requestedProvider: 'vertex' | 'aggregator' | undefined,
  resolvedProvider: 'vertex' | 'aggregator'
) {
  const diagnostics = getAggregatorDiagnostics()
  return {
    requestedProvider: requestedProvider ?? 'vertex',
    resolvedProvider,
    aggregatorEnabled: diagnostics.enabled,
    disabledReason: diagnostics.disabledReason,
    vendor: diagnostics.vendor,
  }
}

export async function buildAggregatorRouteProbeResult(videoModel?: string): Promise<{
  routing: AggregatorRoutingInfo
  renderfulProbe?: RenderfulProbeResult
  diagnostics: AggregatorDiagnostics
}> {
  const diagnostics = getAggregatorDiagnostics()
  const model = videoModel?.trim() || getDefaultAggregatorModelId()
  const routing: AggregatorRoutingInfo = {
    requestedProvider: 'aggregator',
    aggregatorEnabled: diagnostics.enabled,
    videoModel: model,
    wouldRouteTo: diagnostics.vendor,
  }

  let renderfulProbe: RenderfulProbeResult | undefined
  if (diagnostics.enabled && diagnostics.vendor === 'renderful') {
    try {
      const models = await renderfulAdapter.listModels()
      renderfulProbe = { reachable: true, modelCount: models.length }
    } catch (e) {
      renderfulProbe = {
        reachable: false,
        error: e instanceof Error ? e.message : String(e),
      }
    }
  }

  return { routing, renderfulProbe, diagnostics }
}
