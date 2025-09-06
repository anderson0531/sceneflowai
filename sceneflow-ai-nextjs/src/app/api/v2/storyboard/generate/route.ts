import { NextRequest, NextResponse } from 'next/server'
import { V2StoryboardRequest, generateStoryboardV2 } from '@/domain/storyboard/v2/StoryboardService'

export async function POST(request: NextRequest) {
  const reqId = crypto.randomUUID()
  try {
    const body = await request.json()
    const input = V2StoryboardRequest.parse(body)
    const { data, provider, model } = await generateStoryboardV2(input)
    return NextResponse.json({ success: true, data, debug: { api: 'v2-storyboard', provider, model, reqId } }, {
      headers: {
        'x-sf-api': 'v2-storyboard',
        'x-sf-provider': provider,
        'x-sf-model': model,
        'x-sf-request-id': reqId,
        'cache-control': 'no-store',
      }
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Unknown error', debug: { api: 'v2-storyboard', reqId } }, { status: 400, headers: { 'x-sf-request-id': reqId, 'cache-control': 'no-store' } })
  }
}


