import { describe, expect, it, vi, beforeEach } from 'vitest'
import { buildRoutingTrace, buildAggregatorRouteProbeResult } from '@/lib/aggregator/routeProbe'

vi.mock('@/lib/aggregator/adapters/renderfulAdapter', () => ({
  renderfulAdapter: {
    listModels: vi.fn(async () => ['kling/kling-2.6', 'runway/gen-4-turbo']),
  },
}))

describe('routeProbe helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.VIDEO_AGGREGATOR_API_KEY = 'test-key'
    process.env.VIDEO_AGGREGATOR_ENABLED = 'true'
  })

  it('buildRoutingTrace includes aggregator enabled flag', () => {
    const trace = buildRoutingTrace('aggregator', 'aggregator')
    expect(trace.requestedProvider).toBe('aggregator')
    expect(trace.resolvedProvider).toBe('aggregator')
    expect(trace.aggregatorEnabled).toBe(true)
  })

  it('buildAggregatorRouteProbeResult probes Renderful when enabled', async () => {
    const result = await buildAggregatorRouteProbeResult('kling-2.6')
    expect(result.routing.requestedProvider).toBe('aggregator')
    expect(result.routing.aggregatorEnabled).toBe(true)
    expect(result.routing.wouldRouteTo).toBe('renderful')
    expect(result.renderfulProbe?.reachable).toBe(true)
    expect(result.renderfulProbe?.modelCount).toBe(2)
  })
})
