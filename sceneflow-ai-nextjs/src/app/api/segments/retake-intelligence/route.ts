/**
 * Intelligent Video Retake Analysis API
 *
 * Classifies whether a correction requires start-frame editing, prompt rewrite,
 * or both — for Kling F2V/I2V retakes.
 *
 * @route POST /api/segments/retake-intelligence
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateText } from '@/lib/vertexai/gemini'
import { getGeminiTextModel } from '@/lib/config/modelConfig'
import {
  buildRetakeIntelligenceSystemPrompt,
  buildRetakeIntelligenceUserPrompt,
  parseRetakePlan,
  type RetakeIntelligenceRequest,
  type RetakePlan,
} from '@/lib/video/retakeIntelligence'

export const maxDuration = 60
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RetakeIntelligenceRequest
    const { currentPrompt, instruction, mode = 'I2V', context, negativePrompt } = body

    if (!currentPrompt?.trim()) {
      return NextResponse.json({ error: 'Current prompt is required' }, { status: 400 })
    }

    if (!instruction?.trim()) {
      return NextResponse.json({ error: 'Correction instruction is required' }, { status: 400 })
    }

    console.log('[Retake Intelligence] Mode:', mode)
    console.log('[Retake Intelligence] Instruction:', instruction)
    console.log('[Retake Intelligence] Prompt length:', currentPrompt.length)

    const systemInstruction = buildRetakeIntelligenceSystemPrompt(mode)
    const userPrompt = buildRetakeIntelligenceUserPrompt(body)

    const result = await generateText(userPrompt, {
      model: getGeminiTextModel('flash'),
      systemInstruction,
      temperature: 0.3,
      maxOutputTokens: 1536,
      responseMimeType: 'application/json',
    })

    const plan: RetakePlan = parseRetakePlan(result.text, currentPrompt)

    if (!context?.hasStartFrame) {
      plan.frameEditRecommended = false
      plan.frameEditInstruction = undefined
      if (plan.anomalyOrigin === 'frame') {
        plan.anomalyOrigin = 'motion'
      } else if (plan.anomalyOrigin === 'both') {
        plan.anomalyOrigin = 'motion'
      }
    }

    return NextResponse.json({
      success: true,
      ...plan,
      originalPrompt: currentPrompt,
      negativePrompt: negativePrompt ?? '',
      instruction: instruction.trim(),
    })
  } catch (error) {
    console.error('[Retake Intelligence] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to analyze retake',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
