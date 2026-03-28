import { NextRequest, NextResponse } from 'next/server'
import '@/models'
import VisionaryReport from '@/models/VisionaryReport'
import { sequelize } from '@/config/database'
import { resolveUser } from '@/lib/userHelper'
import { generateText } from '@/lib/vertexai/gemini'
import { safeParseJSON } from '@/lib/utils/safeParseJSON';
import {
  MARKET_SCAN_SYSTEM,
  buildMarketScanPrompt,
  GAP_ANALYSIS_SYSTEM,
  buildGapAnalysisPrompt,
  ARBITRAGE_SYSTEM,
  buildArbitragePrompt,
  BRIDGE_PLAN_SYSTEM,
  buildBridgePlanPrompt,
} from '@/lib/visionary/prompt-templates'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // Allow up to 5 minutes for full pipeline
    }

    out.push(ch)
    i++
  }

  return out.join('')
}

/**
 * POST /api/visionary/analyze
 * 
 * Starts a full 4-phase Visionary Engine analysis.
 * Runs all phases sequentially, updating the DB record after each phase.
 * 
 * Body: { concept, genre?, targetRegions?, focusLanguages?, projectId? }
 * Headers: x-user-id (email or UUID)
 */
export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString()

  try {
    console.log(`[${timestamp}] [POST /api/visionary/analyze] Request received`)

    await sequelize.authenticate()

    // Resolve user
    const userIdParam = request.headers.get('x-user-id')
    if (!userIdParam) {
      return NextResponse.json({ success: false, error: 'Missing x-user-id header' }, { status: 401 })
    }

    const user = await resolveUser(userIdParam)
    const userId = user.id

    // Parse body
    const body = await request.json()
    const { concept, genre, targetRegions, focusLanguages, projectId } = body

    if (!concept || typeof concept !== 'string' || concept.trim().length < 3) {
      return NextResponse.json({ success: false, error: 'concept is required (min 3 characters)' }, { status: 400 })
    }

    // Create report record
    const report = await VisionaryReport.create({
      user_id: userId,
      concept: concept.trim(),
      genre: genre || null,
      target_regions: targetRegions || null,
      focus_languages: focusLanguages || null,
      project_id: projectId || null,
      status: 'in_progress',
    })

    console.log(`[${timestamp}] [Visionary] Created report ${report.id} for user ${userId}`)

    let totalCredits = 0

    // ─── Phase 1: Market Scan ─────────────────────────────────────────
    try {
      console.log(`[${timestamp}] [Visionary] Phase 1: Market Scan`)
      const marketResult = await generateText(
        buildMarketScanPrompt(concept, genre, targetRegions),
        {
          systemInstruction: MARKET_SCAN_SYSTEM,
          responseMimeType: 'application/json',
          temperature: 0.7,
          maxOutputTokens: 8192,
          thinkingLevel: 'low',
        }
      )

      const marketScan = safeParseJSON(marketResult.text)
      marketScan.timestamp = new Date().toISOString()
      totalCredits += 25

      await report.update({ market_scan: marketScan, credits_used: totalCredits })
      console.log(`[${timestamp}] [Visionary] Phase 1 complete`)
    } catch (err: any) {
      console.error(`[${timestamp}] [Visionary] Phase 1 failed:`, err.message)
      await report.update({ status: 'failed', error_message: `Market scan failed: ${err.message}` })
      return NextResponse.json({
        success: true,
        report: formatReport(report),
      })
    }

    // ─── Phase 2: Gap Analysis ────────────────────────────────────────
    try {
      console.log(`[${timestamp}] [Visionary] Phase 2: Gap Analysis`)
      const gapResult = await generateText(
        buildGapAnalysisPrompt(concept, JSON.stringify(report.market_scan), genre),
        {
          systemInstruction: GAP_ANALYSIS_SYSTEM,
          responseMimeType: 'application/json',
          temperature: 0.6,
          maxOutputTokens: 8192,
          thinkingLevel: 'medium',
        }
      )

      const gapAnalysis = safeParseJSON(gapResult.text)
      totalCredits += 30

      await report.update({ gap_analysis: gapAnalysis, credits_used: totalCredits })
      console.log(`[${timestamp}] [Visionary] Phase 2 complete`)
    } catch (err: any) {
      console.error(`[${timestamp}] [Visionary] Phase 2 failed:`, err.message)
      await report.update({ status: 'failed', error_message: `Gap analysis failed: ${err.message}` })
      return NextResponse.json({
        success: true,
        report: formatReport(report),
      })
    }

    // ─── Phase 3: Arbitrage Map ───────────────────────────────────────
    try {
      console.log(`[${timestamp}] [Visionary] Phase 3: Arbitrage Map`)
      const arbitrageResult = await generateText(
        buildArbitragePrompt(concept, JSON.stringify(report.gap_analysis), focusLanguages),
        {
          model: 'gemini-3.1-pro-preview', // Use the superior model for heavy lifting
          systemInstruction: ARBITRAGE_SYSTEM,
          thinkingLevel: 'MEDIUM', // Optimal balance for market synthesis
          maxOutputTokens: 8192, // Increase token limit for the more powerful model
        }
      )

      const arbitrageJson = safeParseJSON(arbitrageResult.text)
      totalCredits += 30

      await report.update({ arbitrage_map: arbitrageJson, credits_used: totalCredits })
      console.log(`[${timestamp}] [Visionary] Phase 3 complete`)
    } catch (err: any) {
      console.error(`[${timestamp}] [Visionary] Phase 3 failed:`, err.message)
      await report.update({ status: 'failed', error_message: `Arbitrage map failed: ${err.message}` })
      return NextResponse.json({
        success: true,
        report: formatReport(report),
      })
    }

    // ─── Phase 4: Bridge Plan ─────────────────────────────────────────
    try {
      console.log(`[${timestamp}] [Visionary] Phase 4: Bridge Plan`)
      const bridgeResult = await generateText(
        buildBridgePlanPrompt(
          concept,
          JSON.stringify(report.gap_analysis),
          JSON.stringify(report.arbitrage_map),
          genre
        ),
        {
          systemInstruction: BRIDGE_PLAN_SYSTEM,
          responseMimeType: 'application/json',
          temperature: 0.5,
          maxOutputTokens: 6144,
          thinkingLevel: 'medium',
        }
      )

      const bridgePlan = safeParseJSON(bridgeResult.text)
      totalCredits += 25

      // Compute overall score
      const updatedReport = await report.update({
        bridge_plan: bridgePlan,
        credits_used: totalCredits,
        status: 'complete',
      })

      // Reload and compute score
      await updatedReport.reload()
      const overallScore = updatedReport.computeOverallScore()
      await updatedReport.update({ overall_score: overallScore })

      console.log(`[${timestamp}] [Visionary] Phase 4 complete — overall score: ${overallScore}`)
    } catch (err: any) {
      console.error(`[${timestamp}] [Visionary] Phase 4 failed:`, err.message)
      await report.update({ status: 'failed', error_message: `Bridge plan failed: ${err.message}` })
    }

    // Return final report
    await report.reload()
    return NextResponse.json({
      success: true,
      report: formatReport(report),
    })

  } catch (err: any) {
    console.error(`[${timestamp}] [POST /api/visionary/analyze] Error:`, err)
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/** Map DB record to API response shape */
function formatReport(r: VisionaryReport) {
  return {
    id: r.id,
    userId: r.user_id,
    concept: r.concept,
    genre: r.genre,
    status: r.status,
    marketScan: r.market_scan,
    gapAnalysis: r.gap_analysis,
    arbitrageMap: r.arbitrage_map,
    bridgePlan: r.bridge_plan,
    overallScore: r.overall_score,
    creditsUsed: r.credits_used,
    errorMessage: r.error_message,
    createdAt: r.created_at?.toISOString(),
    updatedAt: r.updated_at?.toISOString(),
  }
}
