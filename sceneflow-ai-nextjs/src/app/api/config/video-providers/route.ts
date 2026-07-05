import { NextRequest, NextResponse } from 'next/server'
import { isAggregatorEnabled } from '@/lib/aggregator/config'
import { AGGREGATOR_MODEL_REGISTRY } from '@/lib/aggregator/modelRegistry'

export const runtime = 'nodejs'

export async function GET() {
  if (!isAggregatorEnabled()) {
    return NextResponse.json({ enabled: false, models: [] })
  }

  return NextResponse.json({
    enabled: true,
    models: AGGREGATOR_MODEL_REGISTRY.map((m) => ({
      id: m.id,
      label: m.label,
      methods: m.methods,
      costPerSecondUsd: m.costPerSecondUsd,
      nativeAudio: m.nativeAudio ?? false,
    })),
    defaultModel: process.env.VIDEO_AGGREGATOR_DEFAULT_MODEL?.trim() || 'kling-2.6',
  })
}
