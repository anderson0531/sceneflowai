import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { CreditService } from '@/services/CreditService'
import { BLUEPRINT_CREDITS } from '@/lib/credits/creditCosts'
import { runAudienceResonance } from '@/lib/script/audienceResonance/runner'
import type { PreviousScores } from '@/lib/script/audienceResonance/types'

export const maxDuration = 180
export const runtime = 'nodejs'

const AUDIENCE_RESONANCE_CREDIT_COST = BLUEPRINT_CREDITS.AUDIENCE_RESONANCE_ANALYSIS // 25 credits

/**
 * Synchronous audience resonance analysis.
 *
 * Long scripts should use POST /api/vision/review-script/start, which runs the
 * same analysis as a durable background job. This route stays for short scripts
 * and for callers that want the result inline, and it is bounded by the 180s
 * function limit.
 */
interface ScriptReviewRequest {
  projectId: string
  script: {
    title?: string
    logline?: string
    scenes: any[]
    characters?: any[]
  }
  targetDemographic?: string
  format?: string
  contentIntent?: string
  treatment?: { character_descriptions?: Array<{ name?: string; role?: string }> }
  previousScores?: PreviousScores
  baseScriptUpdatedAt?: string | null
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id

    const {
      projectId,
      script,
      previousScores,
      targetDemographic,
      format,
      contentIntent,
      treatment,
      baseScriptUpdatedAt,
    }: ScriptReviewRequest = await req.json()

    if (!projectId || !script) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    console.log('[Script Review] Generating Audience Resonance review for project:', projectId)

    if (userId) {
      const hasCredits = await CreditService.ensureCredits(userId, AUDIENCE_RESONANCE_CREDIT_COST)
      if (!hasCredits) {
        return NextResponse.json(
          {
            error: 'Insufficient credits for Audience Resonance analysis',
            required: AUDIENCE_RESONANCE_CREDIT_COST,
            operation: 'audience_resonance_analysis',
          },
          { status: 402 }
        )
      }
    }

    const audienceResonance = await runAudienceResonance({
      script,
      targetDemographic,
      format,
      contentIntent,
      treatment,
      previousScores,
      baseScriptUpdatedAt,
    })

    if (userId) {
      await CreditService.charge(userId, AUDIENCE_RESONANCE_CREDIT_COST, 'ai_usage', null, {
        operation: 'audience_resonance_analysis',
        projectId,
        sceneCount: script.scenes?.length || 0,
        overallScore: audienceResonance.overallScore,
        modelId: audienceResonance.modelId,
      })
      console.log(
        '[Script Review] Charged',
        AUDIENCE_RESONANCE_CREDIT_COST,
        'credits to user:',
        userId
      )
    }

    console.log(
      `[Script Review] Complete — score ${audienceResonance.overallScore}, ` +
        `${audienceResonance.coverage?.analyzedScenes}/${audienceResonance.coverage?.totalScenes} scenes, ` +
        `model ${audienceResonance.modelId}${audienceResonance.requestedModelId !== audienceResonance.modelId ? ` (requested ${audienceResonance.requestedModelId})` : ''}`
    )

    return NextResponse.json({
      success: true,
      audienceResonance,
      // Backward compatibility with the pre-refactor response shape.
      audience: {
        overallScore: audienceResonance.overallScore,
        categories: audienceResonance.categories,
        analysis: audienceResonance.analysis,
        strengths: audienceResonance.strengths,
        improvements: audienceResonance.improvements,
        recommendations: audienceResonance.recommendations,
        generatedAt: audienceResonance.generatedAt,
      },
      director: null,
      generatedAt: new Date().toISOString(),
      creditsUsed: userId ? AUDIENCE_RESONANCE_CREDIT_COST : 0,
    })
  } catch (error: any) {
    console.error('[Script Review] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate reviews' },
      { status: 500 }
    )
  }
}
