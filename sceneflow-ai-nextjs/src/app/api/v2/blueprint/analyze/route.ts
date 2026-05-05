import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { CreditService } from '@/services/CreditService'
import { BLUEPRINT_CREDITS } from '@/lib/credits/creditCosts'
import { V2BlueprintRequest, analyzeBlueprintV2, analyzeBlueprintV2Batch } from '@/domain/blueprint/v2/BlueprintService'

export const runtime = 'nodejs'
export const maxDuration = 300

const BLUEPRINT_ANALYZE_CREDIT_COST = BLUEPRINT_CREDITS.BLUEPRINT_ANALYZE // 20 credits

export async function POST(request: NextRequest) {
  const reqId = crypto.randomUUID()
  let parsedInput: any = null
  try {
    // Get session and user ID for credit charging
    const session = await getServerSession(authOptions as any).catch(() => null)
    const userId = (session?.user as any)?.id
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401, headers: { 'x-sf-request-id': reqId } })
    }

    const body = await request.json()
    const input = V2BlueprintRequest.parse(body)
    parsedInput = input

    // Check credits before AI generation
    const hasCredits = await CreditService.ensureCredits(userId, BLUEPRINT_ANALYZE_CREDIT_COST)
    if (!hasCredits) {
      const breakdown = await CreditService.getCreditBreakdown(userId).catch(() => null)
      return NextResponse.json({
        success: false,
        error: 'Insufficient credits',
        creditsRequired: BLUEPRINT_ANALYZE_CREDIT_COST,
        creditsAvailable: breakdown?.total_credits ?? 0
      }, { status: 402, headers: { 'x-sf-request-id': reqId } })
    }

    // If variants requested >1, use batch generation to return multiple ideas in a single call
    if ((input.variants || 1) > 1) {
      const { items, provider, model } = await analyzeBlueprintV2Batch(input)
      
      // Charge credits after successful generation
      await CreditService.charge(userId, BLUEPRINT_ANALYZE_CREDIT_COST, 'Blueprint Analyze V2 (Batch)')
      console.log(`[Blueprint V2] Charged ${BLUEPRINT_ANALYZE_CREDIT_COST} credits to user ${userId} for batch analysis`)
      
      return NextResponse.json({ success: true, data: items, creditsUsed: BLUEPRINT_ANALYZE_CREDIT_COST, debug: { api: 'v2-blueprint', provider, model, reqId, batch: true } }, {
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

    // Charge credits after successful generation
    await CreditService.charge(userId, BLUEPRINT_ANALYZE_CREDIT_COST, 'Blueprint Analyze V2')
    console.log(`[Blueprint V2] Charged ${BLUEPRINT_ANALYZE_CREDIT_COST} credits to user ${userId} for single analysis`)

    return NextResponse.json({ success: true, data, creditsUsed: BLUEPRINT_ANALYZE_CREDIT_COST, debug: { api: 'v2-blueprint', provider, model, reqId, batch: false } }, {
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


