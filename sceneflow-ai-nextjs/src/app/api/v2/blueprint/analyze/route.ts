import { NextRequest, NextResponse } from 'next/server'
import { V2BlueprintRequest, analyzeBlueprintV2, analyzeBlueprintV2Batch } from '@/domain/blueprint/v2/BlueprintService'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(request: NextRequest) {
  const reqId = crypto.randomUUID()
  let parsedInput: any = null
  try {
    const body = await request.json()
    const input = V2BlueprintRequest.parse(body)
    parsedInput = input

    // If variants requested >1, use batch generation to return multiple ideas in a single call
    if ((input.variants || 1) > 1) {
      const { items, provider, model } = await analyzeBlueprintV2Batch(input)
      return NextResponse.json({ success: true, data: items, debug: { api: 'v2-blueprint', provider, model, reqId, batch: true } }, {
        headers: {
          'x-sf-api': 'v2-blueprint',
          'x-sf-provider': provider,
          'x-sf-model': model,
          'x-sf-request-id': reqId,
          'cache-control': 'no-store',
        }
      })
    }

    const { data, provider, model } = await analyzeBlueprintV2(input)

    return NextResponse.json({ success: true, data, debug: { api: 'v2-blueprint', provider, model, reqId, batch: false } }, {
      headers: {
        'x-sf-api': 'v2-blueprint',
        'x-sf-provider': provider,
        'x-sf-model': model,
        'x-sf-request-id': reqId,
        'cache-control': 'no-store',
      }
    })
  } catch (err: any) {
    const placeholders = [
      {
        title: parsedInput?.title || 'Aromatic Kingdom',
        logline: 'A culinary historian journeys across Thailand to uncover the hidden stories behind iconic dishes.',
        details: { genre: 'Documentary Series', duration: '11 minutes', targetAudience: 'Adults 25-55, Foodies', tone: 'Vibrant, Authentic, Intimate', structure: 'Series Structure' },
        characters: [ { name: 'Host', role: 'Protagonist', description: 'Curious guide connecting food, people, and memory.' } ],
        beats: [
          { act: 'Act I', number: 1, beat_title: 'Harbor of Aromas', beat_description: 'Markets of cardamom, pepper, dried chilies.' },
          { act: 'Act II', number: 2, beat_title: 'Crossroads Kitchen', beat_description: 'Woks meet spice pastes; fusion with roots.' },
          { act: 'Act III', number: 3, beat_title: 'Table of Memory', beat_description: 'Shared meal reveals identity in flavor.' }
        ]
      }
    ]
    return NextResponse.json({ success: true, data: placeholders, debug: { api: 'v2-blueprint', reqId, fallback: true, error: err?.message } }, { headers: { 'x-sf-request-id': reqId, 'cache-control': 'no-store' } })
  }
}


