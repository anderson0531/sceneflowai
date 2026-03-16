import { NextRequest, NextResponse } from 'next/server'
import '@/models'
import VisionaryReport from '@/models/VisionaryReport'
import { sequelize } from '@/config/database'
import { resolveUser } from '@/lib/userHelper'
import { generateText } from '@/lib/vertexai/gemini'
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
export const maxDuration = 120 // Allow up to 2 minutes for full pipeline

/**
 * Attempt to parse JSON from LLM output, repairing common issues:
 * - Strip markdown code fences
 * - Fix single-quoted property names
 * - Remove trailing commas before } or ]
 * - Remove JS-style comments
 * - Escape unescaped control characters & special chars inside strings
 * - Recover from truncated output by closing open brackets/braces
 * - Last-resort: progressively trim from end until valid JSON
 */
function safeParseJSON(raw: string): any {
  // Stage 0: Try as-is
  try { return JSON.parse(raw) } catch { /* continue */ }

  let text = raw.trim()

  // ── Stage 1: Surface-level cleanup ────────────────────────────────
  // Strip markdown code fences (```json ... ``` or ``` ... ```)
  text = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '')

  // Remove single-line comments (// ...) — only outside strings (best-effort)
  text = text.replace(/\/\/[^\n]*/g, '')

  // Remove multi-line comments (/* ... */)
  text = text.replace(/\/\*[\s\S]*?\*\//g, '')

  // Fix single-quoted keys/values → double quotes
  text = text.replace(/(?<=[[{,\s])'/g, '"').replace(/'(?=\s*[:,\]\}])/g, '"')

  // Replace curly/smart quotes with straight quotes
  text = text.replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"')
  text = text.replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'")

  // Remove trailing commas before } or ]
  text = text.replace(/,\s*([}\]])/g, '$1')

  try { return JSON.parse(text) } catch { /* continue */ }

  // ── Stage 2: Fix unescaped characters inside JSON string values ───
  // Walk the string character-by-character and escape control chars /
  // unescaped quotes that appear inside string values.
  text = repairStringValues(text)

  // Remove trailing commas again after repair
  text = text.replace(/,\s*([}\]])/g, '$1')

  try { return JSON.parse(text) } catch { /* continue */ }

  // ── Stage 3: Truncation recovery ──────────────────────────────────
  console.warn('[safeParseJSON] Attempting truncation recovery...')

  // Strip trailing partial values
  text = text.replace(/,\s*"[^"]*"?\s*:\s*"[^"]*$/, '')  // partial string value
  text = text.replace(/,\s*"[^"]*"?\s*:\s*\[?\s*$/, '')   // partial array/value start
  text = text.replace(/,\s*"[^"]*$/, '')                   // partial key
  text = text.replace(/,\s*$/, '')                         // trailing comma

  // Close unclosed arrays then objects
  const openBraces = (text.match(/{/g) || []).length
  const closeBraces = (text.match(/}/g) || []).length
  const openBrackets = (text.match(/\[/g) || []).length
  const closeBrackets = (text.match(/\]/g) || []).length
  for (let i = 0; i < openBrackets - closeBrackets; i++) text += ']'
  for (let i = 0; i < openBraces - closeBraces; i++) text += '}'
  text = text.replace(/,\s*([}\]])/g, '$1')

  try {
    const result = JSON.parse(text)
    console.warn('[safeParseJSON] Truncation recovery succeeded (data may be partial)')
    return result
  } catch { /* continue */ }

  // ── Stage 4: Progressive trim — last resort ───────────────────────
  // Walk backwards, removing the last structural element until parseable.
  // This handles mid-content corruption the regex stages can't fix.
  console.warn('[safeParseJSON] Attempting progressive trim...')
  let trimmed = text
  for (let attempt = 0; attempt < 40; attempt++) {
    // Remove last property, array element, or partial value
    // Try removing from last comma
    const lastComma = trimmed.lastIndexOf(',')
    if (lastComma === -1) break

    trimmed = trimmed.slice(0, lastComma)
    // Remove trailing whitespace
    trimmed = trimmed.trimEnd()

    // Recount and close brackets
    const ob = (trimmed.match(/{/g) || []).length
    const cb = (trimmed.match(/}/g) || []).length
    const oB = (trimmed.match(/\[/g) || []).length
    const cB = (trimmed.match(/\]/g) || []).length
    let candidate = trimmed
    for (let i = 0; i < oB - cB; i++) candidate += ']'
    for (let i = 0; i < ob - cb; i++) candidate += '}'
    candidate = candidate.replace(/,\s*([}\]])/g, '$1')

    try {
      const result = JSON.parse(candidate)
      console.warn(`[safeParseJSON] Progressive trim succeeded after ${attempt + 1} trims (data is partial)`)
      return result
    } catch { /* keep trimming */ }
  }

  // All recovery failed — log for debugging and throw
  console.error('[safeParseJSON] All repair attempts failed. Last 200 chars:', text.slice(-200))
  console.error('[safeParseJSON] First 500 chars:', text.slice(0, 500))
  throw new Error(`Invalid JSON from LLM — all repair strategies exhausted`)
}

/**
 * Walk through a JSON string and fix unescaped characters inside string values.
 * Handles: unescaped newlines, tabs, backslashes, and stray quotes inside values.
 */
function repairStringValues(json: string): string {
  const out: string[] = []
  let i = 0
  let inString = false
  let escaped = false

  while (i < json.length) {
    const ch = json[i]

    if (escaped) {
      // Previous char was \, pass through any escape sequence
      out.push(ch)
      escaped = false
      i++
      continue
    }

    if (ch === '\\' && inString) {
      out.push(ch)
      escaped = true
      i++
      continue
    }

    if (ch === '"') {
      if (!inString) {
        // Opening a string
        inString = true
        out.push(ch)
        i++
        continue
      }
      // Potentially closing the string — peek ahead to decide
      // A real closing quote is followed by : , } ] or whitespace then one of those
      const after = json.slice(i + 1).trimStart()
      if (
        after.length === 0 ||
        after[0] === ':' ||
        after[0] === ',' ||
        after[0] === '}' ||
        after[0] === ']'
      ) {
        // This is a real closing quote
        inString = false
        out.push(ch)
        i++
        continue
      }
      // Otherwise it's an unescaped quote inside the string — escape it
      out.push('\\"')
      i++
      continue
    }

    if (inString) {
      // Escape literal control characters
      if (ch === '\n') { out.push('\\n'); i++; continue }
      if (ch === '\r') { out.push('\\r'); i++; continue }
      if (ch === '\t') { out.push('\\t'); i++; continue }
      // Other control chars (0x00-0x1F)
      const code = ch.charCodeAt(0)
      if (code < 0x20) {
        out.push('\\u' + code.toString(16).padStart(4, '0'))
        i++
        continue
      }
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
      const arbResult = await generateText(
        buildArbitragePrompt(concept, JSON.stringify(report.gap_analysis), focusLanguages),
        {
          systemInstruction: ARBITRAGE_SYSTEM,
          responseMimeType: 'application/json',
          temperature: 0.5,
          maxOutputTokens: 6144,
          thinkingLevel: 'medium',
        }
      )

      const arbitrageMap = safeParseJSON(arbResult.text)
      totalCredits += 30

      await report.update({ arbitrage_map: arbitrageMap, credits_used: totalCredits })
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
