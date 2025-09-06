import { NextRequest, NextResponse } from 'next/server'
import { V2BlueprintRequest, analyzeBlueprintV2 } from '@/domain/blueprint/v2/BlueprintService'

export async function POST(request: NextRequest) {
  const reqId = crypto.randomUUID()
  try {
    const body = await request.json()
    const input = V2BlueprintRequest.parse(body)

    const { data, provider, model } = await analyzeBlueprintV2(input)

    return NextResponse.json({ success: true, data, debug: { api: 'v2-blueprint', provider, model, reqId } }, {
      headers: {
        'x-sf-api': 'v2-blueprint',
        'x-sf-provider': provider,
        'x-sf-model': model,
        'x-sf-request-id': reqId,
        'cache-control': 'no-store',
      }
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Unknown error', debug: { api: 'v2-blueprint', reqId } }, { status: 400, headers: { 'x-sf-request-id': reqId, 'cache-control': 'no-store' } })
  }
}


