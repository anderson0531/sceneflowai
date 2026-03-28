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
} from '@/lib/visionary/prompt-templates'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // Allow up to 5 minutes for full pipeline

export async function POST(req: NextRequest) {
  const body = await req.json()
  const user = await resolveUser(req)

  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  if (!body.concept) {
    return NextResponse.json({ success: false, error: 'Concept is required' }, { status: 400 })
  }

  const report = await VisionaryReport.create({
    userId: user.id,
    concept: body.concept,
    genre: body.genre,
    status: 'running',
  })
  
  console.log(`[Visionary] Created report ${report.id} for user ${user.id}`)

  try {
    // PHASE 1: Market Scan
    console.log(`[Visionary] Phase 1: Market Scan`)
    const marketScanResult = await generateText(
      buildMarketScanPrompt(body.concept, body.genre, body.regions),
      {
        systemInstruction: MARKET_SCAN_SYSTEM,
        thinkingLevel: 'low',
      }
    )
    const marketScanJson = safeParseJSON(marketScanResult.text)
    if (!marketScanJson) {
      throw new Error('Phase 1 failed: Invalid JSON from LLM for Market Scan')
    }
    await report.update({ marketScan: marketScanJson, status: 'running-phase-2' })
    console.log(`[Visionary] Phase 1 complete`)

    // PHASE 2: Gap Analysis
    console.log(`[Visionary] Phase 2: Gap Analysis`)
    const gapAnalysisResult = await generateText(
      buildGapAnalysisPrompt(body.concept, JSON.stringify(marketScanJson), body.genre),
      {
        systemInstruction: GAP_ANALYSIS_SYSTEM,
        thinkingLevel: 'medium',
      }
    )
    const gapAnalysisJson = safeParseJSON(gapAnalysisResult.text)
    if (!gapAnalysisJson) {
      throw new Error('Phase 2 failed: Invalid JSON from LLM for Gap Analysis')
    }
    await report.update({ gapAnalysis: gapAnalysisJson, status: 'running-phase-3' })
    console.log(`[Visionary] Phase 2 complete`)

    // PHASE 3: Arbitrage Map
    console.log(`[Visionary] Phase 3: Arbitrage Map`)
    const arbitrageResult = await generateText(
      buildArbitragePrompt(body.concept, JSON.stringify(gapAnalysisJson), body.focusLanguages),
      {
        model: 'gemini-3.1-pro-preview',
        systemInstruction: ARBITRAGE_SYSTEM,
        thinkingLevel: 'MEDIUM',
        maxOutputTokens: 8192,
      }
    )
    const arbitrageJson = safeParseJSON(arbitrageResult.text)
    if (!arbitrageJson) {
      throw new Error('Phase 3 failed: Invalid JSON from LLM for Arbitrage Map')
    }
    await report.update({ arbitrageMap: arbitrageJson, status: 'complete' })
    console.log(`[Visionary] Phase 3 complete`)

    return NextResponse.json({ success: true, report })

  } catch (error: any) {
    console.error(`[Visionary] Analysis for report ${report.id} failed:`, error)
    await report.update({ status: 'failed', errorMessage: error.message })
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
