import { NextRequest, NextResponse } from 'next/server'
import { V2DirectionRequest, analyzeDirectionV2 } from '@/domain/direction/v2/DirectionService'

export async function POST(request: NextRequest) {
  const reqId = crypto.randomUUID()
  try {
    const body = await request.json()
    const input = V2DirectionRequest.parse(body)
    const { data, provider, model } = await analyzeDirectionV2(input)
    return NextResponse.json({ success: true, data, debug: { api: 'v2-direction', provider, model, reqId } }, {
      headers: {
        'x-sf-api': 'v2-direction',
        'x-sf-provider': provider,
        'x-sf-model': model,
        'x-sf-request-id': reqId,
        'cache-control': 'no-store',
      }
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Unknown error', debug: { api: 'v2-direction', reqId } }, { status: 400, headers: { 'x-sf-request-id': reqId, 'cache-control': 'no-store' } })
  }
}


