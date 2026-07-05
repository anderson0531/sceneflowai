import { NextRequest, NextResponse } from 'next/server'
import { getPrimaryAggregatorVendor } from '@/lib/aggregator/config'
import { renderfulAdapter } from '@/lib/aggregator/adapters/renderfulAdapter'
import {
  parseAggregatorWebhookFromVendor,
  processAggregatorWebhookPayload,
} from '@/lib/aggregator/processAggregatorCompletion'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    let body: unknown
    try {
      body = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const vendor =
      req.headers.get('x-aggregator-vendor')?.trim() ||
      getPrimaryAggregatorVendor()

    const payload = parseAggregatorWebhookFromVendor(
      vendor,
      body,
      req.headers,
      rawBody
    )

    if (!payload) {
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 })
    }

    const result = await processAggregatorWebhookPayload(payload)
    if (result.error && !result.assetUrl) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 200 })
    }

    return NextResponse.json({
      ok: true,
      jobId: payload.jobId,
      assetUrl: result.assetUrl,
    })
  } catch (error) {
    console.error('[VideoAggregator Webhook] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

/** Allow Renderful to verify endpoint during setup */
export async function GET() {
  return NextResponse.json({ status: 'ok', adapter: renderfulAdapter.vendor })
}
