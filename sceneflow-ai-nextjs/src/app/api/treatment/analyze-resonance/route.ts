import { NextRequest, NextResponse } from 'next/server'
import { generateText } from '@/lib/vertexai/gemini'
import { safeParseJsonFromText } from '@/lib/safeJson'
import type {
  AnalyzeResonanceRequest,
  AnalyzeResonanceResponse,
  AudienceResonanceAnalysis,
  ResonanceAxis,
  ResonanceInsight,
  OptimizationRecommendation,
  GreenlightScore,
  AudienceIntent,
  CheckpointResults,
  AxisCheckpointResults,
  PreviousAnalysisContext,
  getGreenlightTier
} from '@/lib/types/audienceResonance'
import {
  buildChecklistPrompt,
  SCORING_WEIGHTS,
  READY_FOR_PRODUCTION_THRESHOLD,
  MAX_ITERATIONS,
  getIterationFocus,
  isSuggestionRestricted,
  ALL_SCORING_AXES,
  applyHysteresisSmoothing,
  enforceScoreFloor,
  calculateAxisScoreGradient,
  CONCEPT_ORIGINALITY_AXIS,
  CHARACTER_DEPTH_AXIS,
  PACING_STRUCTURE_AXIS,
  GENRE_FIDELITY_AXIS,
  COMMERCIAL_VIABILITY_AXIS
} from '@/lib/treatment/scoringChecklist'

// MODULE-LEVEL CACHE: Build checkpoint penalty lookup once at module load
// This avoids 85 iterations per request inside parseCheckpointResults()
const CHECKPOINT_PENALTIES: Record<string, number> = (() => {
  const penalties: Record<string, number> = {}
  for (const axis of ALL_SCORING_AXES) {
    for (const checkpoint of axis.checkpoints) {
      penalties[checkpoint.id] = checkpoint.failPenalty
    }
  }
  return penalties
})()

export const runtime = 'nodejs'
export const maxDuration = 120

/**
 * Audience Resonance Analysis API
 * 
 * Analyzes a film treatment against target market intent and returns:
 * - Greenlight score (0-100)
 * - Radar chart data (5 axes)
 * - Categorized insights with fix suggestions
 */
export async function POST(request: NextRequest) {
  const reqId = crypto.randomUUID()
  
  try {
    const body: AnalyzeResonanceRequest = await request.json()
    const { treatment, intent, quickAnalysis = false, iteration = 1, previousAnalysis, targetProfile } = body
    
    if (!treatment) {
      return NextResponse.json({
        success: false,
        error: 'Treatment data is required'
      }, { status: 400 })
    }
    
    // Cap iteration at MAX_ITERATIONS
    const effectiveIteration = Math.min(iteration, MAX_ITERATIONS)
    
    // Quick analysis uses heuristics only (no AI cost)
    if (quickAnalysis) {
      const heuristicAnalysis = performHeuristicAnalysis(treatment, intent, effectiveIteration)
      return NextResponse.json({
        success: true,
        analysis: heuristicAnalysis,
        cached: false,
        iteration: effectiveIteration,
        maxIterations: MAX_ITERATIONS,
        readyForProduction: heuristicAnalysis.greenlightScore.score >= READY_FOR_PRODUCTION_THRESHOLD
      })
    }
    
    // Full AI analysis
    console.log(`[Resonance] Starting analysis (iteration ${effectiveIteration}/${MAX_ITERATIONS}) for "${treatment.title}" with intent:`, intent)
    if (previousAnalysis) {
      console.log(`[Resonance] Re-analysis with baseline score: ${previousAnalysis.score}, ${previousAnalysis.passedCheckpoints.length} passed checkpoints`)
    }
    if (targetProfile) {
      console.log(`[Resonance] Using locked target profile with axis weights:`, targetProfile.axisWeightModifiers)
    }
    
    const analysis = await analyzeWithGemini(treatment, intent, reqId, effectiveIteration, previousAnalysis, targetProfile)
    
    const isReadyForProduction = analysis.greenlightScore.score >= READY_FOR_PRODUCTION_THRESHOLD
    
    return NextResponse.json({
      success: true,
      analysis,
      cached: false,
      iteration: effectiveIteration,
      maxIterations: MAX_ITERATIONS,
      readyForProduction: isReadyForProduction
    }, {
      headers: {
        'x-sf-request-id': reqId,
        'cache-control': 'no-store'
      }
    })
    
  } catch (error: any) {
    console.error('[Resonance] Analysis failed:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Analysis failed'
    }, { status: 500 })
  }
}

/**
 * Heuristic-based quick analysis (no AI credits)
 */
function performHeuristicAnalysis(
  treatment: AnalyzeResonanceRequest['treatment'],
  intent: AudienceIntent,
  iteration: number = 1
): AudienceResonanceAnalysis {
  const axes: ResonanceAxis[] = [
    {
      id: 'originality',
      label: 'Concept Originality',
      description: 'How unique is the concept?',
      score: treatment.logline && treatment.logline.length > 50 ? 70 : 50,
      weight: SCORING_WEIGHTS['concept-originality']
    },
    {
      id: 'genre-fidelity',
      label: 'Genre Fidelity',
      description: 'Does it match genre conventions?',
      score: treatment.genre?.toLowerCase().includes(intent.primaryGenre) ? 85 : 60,
      weight: SCORING_WEIGHTS['genre-fidelity']
    },
    {
      id: 'character-depth',
      label: 'Character Depth',
      description: 'Are characters well-defined?',
      score: (treatment.protagonist && treatment.antagonist) ? 75 : 
             treatment.protagonist ? 60 : 40,
      weight: SCORING_WEIGHTS['character-depth']
    },
    {
      id: 'pacing',
      label: 'Pacing & Structure',
      description: 'Is the structure clear?',
      score: treatment.beats && treatment.beats.length >= 4 ? 80 : 
             treatment.act_breakdown ? 70 : 50,
      weight: SCORING_WEIGHTS['pacing-structure']
    },
    {
      id: 'commercial-viability',
      label: 'Commercial Viability',
      description: 'Is this marketable?',
      score: treatment.title && treatment.logline ? 70 : 50,
      weight: SCORING_WEIGHTS['commercial-viability']
    }
  ]
  
  // Calculate weighted average
  const totalWeight = axes.reduce((sum, a) => sum + a.weight, 0)
  const weightedScore = axes.reduce((sum, a) => sum + (a.score * a.weight), 0) / totalWeight
  const score = Math.round(weightedScore)
  
  const tierInfo = getGreenlightTierLocal(score)
  
  const greenlightScore: GreenlightScore = {
    score,
    tier: tierInfo.tier as any,
    label: tierInfo.label,
    confidence: 0.6, // Lower confidence for heuristic
    analysisDate: new Date().toISOString()
  }
  
  // Generate basic insights
  const insights: ResonanceInsight[] = []
  
  if (!treatment.protagonist) {
    insights.push({
      id: 'missing-protagonist',
      category: 'character-arc',
      status: 'weakness',
      title: 'Missing Protagonist Definition',
      insight: 'Your treatment lacks a clearly defined protagonist. Audiences connect through character.',
      actionable: true,
      fixSection: 'story',
      fixSuggestion: 'Add a protagonist definition: "A [adjective] [occupation], [NAME], who struggles with [internal conflict] while pursuing [external goal]."'
    })
  }
  
  if (!treatment.beats || treatment.beats.length < 4) {
    insights.push({
      id: 'weak-structure',
      category: 'structural-beats',
      status: 'weakness',
      title: 'Incomplete Beat Structure',
      insight: 'Your treatment needs more defined story beats for clear pacing.',
      actionable: true,
      fixSection: 'beats',
      fixSuggestion: 'Add key story beats: Inciting Incident (what disrupts the ordinary world), Midpoint Turn (major revelation or reversal), All Is Lost (lowest point), and Climax (final confrontation).'
    })
  }
  
  if (!treatment.antagonist) {
    insights.push({
      id: 'missing-antagonist',
      category: 'character-arc',
      status: 'weakness',
      title: 'Missing Antagonist',
      insight: 'Define the opposing force to create clear conflict and stakes.',
      actionable: true,
      fixSection: 'story',
      fixSuggestion: 'Add an antagonist: "Opposing [protagonist] is [NAME], a [description] whose [motivation] creates the central conflict."'
    })
  }
  
  if (treatment.logline && treatment.logline.length > 50) {
    insights.push({
      id: 'strong-logline',
      category: 'market-positioning',
      status: 'strength',
      title: 'Compelling Logline',
      insight: 'Your logline effectively communicates the core concept.',
      actionable: false
    })
  }
  
  return {
    intent,
    treatmentId: 'heuristic',
    greenlightScore,
    axes,
    insights,
    recommendations: [],
    analysisVersion: '1.0-heuristic',
    generatedAt: new Date().toISOString(),
    creditsUsed: 0
  }
}

function getGreenlightTierLocal(score: number): { tier: string; label: string; color: string } {
  if (score >= 90) {
    return { tier: 'market-ready', label: 'Market Ready', color: '#22c55e' }
  } else if (score >= 70) {
    return { tier: 'strong-potential', label: 'Strong Potential', color: '#f59e0b' }
  } else {
    return { tier: 'needs-refinement', label: 'Needs Refinement', color: '#ef4444' }
  }
}

/**
 * Truncate text to max length to reduce prompt size
 */
function truncateText(text: string | undefined, maxLength: number): string {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

/**
 * Full AI-powered analysis using Gemini
 */
async function analyzeWithGemini(
  treatment: AnalyzeResonanceRequest['treatment'],
  intent: AudienceIntent,
  reqId: string,
  iteration: number = 1,
  previousAnalysis?: PreviousAnalysisContext,
  targetProfile?: AnalyzeResonanceRequest['targetProfile']
): Promise<AudienceResonanceAnalysis> {
  
  const prompt = buildAnalysisPrompt(treatment, intent, iteration, previousAnalysis, targetProfile)
  
  console.log(`[Resonance] Calling Vertex AI Gemini for analysis (iteration ${iteration})...`)
  
  // Use gemini-2.5-flash with thinkingBudget: 0 to disable "thinking" mode
  // This prevents OOM issues caused by unbounded internal reasoning tokens
  const result = await generateText(prompt, {
    model: 'gemini-2.5-flash',
    temperature: 0, // Use 0 for deterministic, consistent scoring
    maxOutputTokens: 4096, // Reduced from 8192 to prevent memory issues
    responseMimeType: 'application/json',
    thinkingBudget: 0 // Disable thinking mode to prevent OOM
  })
  
  if (!result?.text) {
    throw new Error('No response from Gemini')
  }
  
  const parsed = safeParseJsonFromText(result.text)
  
  // Validate and transform the response - use user-specified weights
  const axes: ResonanceAxis[] = [
    {
      id: 'originality',
      label: 'Concept Originality',
      description: 'How unique is the concept?',
      score: clamp(parsed.originality_score || 50, 0, 100),
      weight: SCORING_WEIGHTS['concept-originality']
    },
    {
      id: 'genre-fidelity',
      label: 'Genre Fidelity',
      description: 'Does it match genre conventions?',
      score: clamp(parsed.genre_fidelity_score || 50, 0, 100),
      weight: SCORING_WEIGHTS['genre-fidelity']
    },
    {
      id: 'character-depth',
      label: 'Character Depth',
      description: 'Are characters well-defined?',
      score: clamp(parsed.character_depth_score || 50, 0, 100),
      weight: SCORING_WEIGHTS['character-depth']
    },
    {
      id: 'pacing',
      label: 'Pacing & Structure',
      description: 'Is the structure clear?',
      score: clamp(parsed.pacing_score || 50, 0, 100),
      weight: SCORING_WEIGHTS['pacing-structure']
    },
    {
      id: 'commercial-viability',
      label: 'Commercial Viability',
      description: 'Is this marketable?',
      score: clamp(parsed.commercial_viability_score || 50, 0, 100),
      weight: SCORING_WEIGHTS['commercial-viability']
    }
  ]
  
  const overallScore = clamp(parsed.greenlight_score || calculateWeightedScore(axes), 0, 100)
  const tierInfo = getGreenlightTierLocal(overallScore)
  
  const greenlightScore: GreenlightScore = {
    score: overallScore,
    tier: tierInfo.tier as any,
    label: tierInfo.label,
    confidence: clamp(parsed.confidence || 0.8, 0, 1),
    analysisDate: new Date().toISOString()
  }
  
  // Transform insights - force actionable and fixSuggestion for all weaknesses
  // Also filter out restricted suggestions based on iteration
  const rawInsights: ResonanceInsight[] = (parsed.insights || []).map((i: any, idx: number) => {
    const isWeakness = i.status !== 'strength' && i.status !== 'neutral'
    const category = mapCategory(i.category)
    
    // Determine appropriate fix section based on category if not provided
    const inferredFixSection = !i.fix_section ? inferFixSectionFromCategory(category) : mapFixSection(i.fix_section)
    
    // Map axis_id from prompt format to our format
    const axisIdMap: Record<string, ResonanceInsight['axisId']> = {
      'concept_originality': 'concept-originality',
      'character_depth': 'character-depth',
      'pacing_structure': 'pacing-structure',
      'genre_fidelity': 'genre-fidelity',
      'commercial_viability': 'commercial-viability'
    }
    
    return {
      id: `insight-${idx}`,
      category,
      status: i.status === 'strength' ? 'strength' : i.status === 'neutral' ? 'neutral' : 'weakness',
      title: i.title || 'Insight',
      insight: i.insight || i.description || '',
      treatmentSection: i.treatment_section,
      // Force actionable=true for all weaknesses
      actionable: isWeakness ? true : Boolean(i.actionable),
      // Provide default fix suggestion if weakness is missing one
      fixSuggestion: i.fix_suggestion || (isWeakness ? generateDefaultFixSuggestion(i.title, category) : undefined),
      // Ensure fix section is set for weaknesses
      fixSection: isWeakness ? (inferredFixSection || 'story') : inferredFixSection,
      // Checkpoint tracking for local score recalculation (only for weaknesses)
      checkpointId: isWeakness ? i.checkpoint_id : undefined,
      axisId: isWeakness ? axisIdMap[i.axis_id] : undefined
    }
  })
  
  // Filter out stylistic/polish suggestions in later iterations
  const insights = rawInsights.filter(insight => {
    if (insight.status !== 'weakness') return true // Keep all strengths
    if (!insight.fixSuggestion) return true
    return !isSuggestionRestricted(insight.fixSuggestion, iteration)
  })
  
  // Transform recommendations
  const recommendations: OptimizationRecommendation[] = (parsed.recommendations || []).map((r: any, idx: number) => ({
    id: `rec-${idx}`,
    priority: r.priority === 'high' ? 'high' : r.priority === 'low' ? 'low' : 'medium',
    category: mapCategory(r.category),
    title: r.title || 'Recommendation',
    description: r.description || '',
    expectedImpact: clamp(r.expected_impact || 5, 0, 30),
    effort: r.effort === 'quick' ? 'quick' : r.effort === 'significant' ? 'significant' : 'moderate'
  }))
  
  // Parse checkpoint results from Gemini response (now using 0-10 gradient scores)
  const checkpointResults = parseCheckpointResultsGradient(
    parsed.checkpoint_scores,
    previousAnalysis?.checkpointScores
  )
  
  // Apply hysteresis smoothing to prevent score volatility
  // Reduce anchor strength on later iterations to allow scores to reach target faster
  // Iteration 1: 30% anchor (responsive), Iteration 2: 20%, Iteration 3: 10% (allow reaching target)
  const iterationAnchorStrength = iteration === 1 ? 0.30 : iteration === 2 ? 0.20 : 0.10
  
  const rawAxisScores = {
    originality: axes.find(a => a.id === 'originality')?.score || 50,
    genreFidelity: axes.find(a => a.id === 'genre-fidelity')?.score || 50,
    characterDepth: axes.find(a => a.id === 'character-depth')?.score || 50,
    pacing: axes.find(a => a.id === 'pacing')?.score || 50,
    commercialViability: axes.find(a => a.id === 'commercial-viability')?.score || 50
  }
  
  const smoothedScores = previousAnalysis 
    ? applyHysteresisSmoothing(rawAxisScores, previousAnalysis.axisScores, iterationAnchorStrength)
    : rawAxisScores
  
  // Update axes with smoothed scores
  const smoothedAxes = axes.map(axis => {
    const smoothedScore = axis.id === 'originality' ? smoothedScores.originality
      : axis.id === 'genre-fidelity' ? smoothedScores.genreFidelity
      : axis.id === 'character-depth' ? smoothedScores.characterDepth
      : axis.id === 'pacing' ? smoothedScores.pacing
      : axis.id === 'commercial-viability' ? smoothedScores.commercialViability
      : axis.score
    return { ...axis, score: smoothedScore }
  })
  
  // Apply score floor to overall score
  // On iteration 3+, no regression allowed (maxDrop = 0)
  const smoothedOverallScore = previousAnalysis 
    ? enforceScoreFloor(overallScore, previousAnalysis.score, iteration)
    : overallScore
  
  const smoothedGreenlightScore: GreenlightScore = {
    ...greenlightScore,
    score: smoothedOverallScore,
    tier: getGreenlightTierLocal(smoothedOverallScore).tier as any,
    label: getGreenlightTierLocal(smoothedOverallScore).label
  }
  
  return {
    intent,
    treatmentId: reqId,
    greenlightScore: smoothedGreenlightScore,
    axes: smoothedAxes,
    checkpointResults,
    insights,
    recommendations,
    analysisVersion: '2.0', // Updated for gradient scoring
    generatedAt: new Date().toISOString(),
    creditsUsed: 0 // Credits shown in sidebar balance instead
  }
}

function buildAnalysisPrompt(
  treatment: AnalyzeResonanceRequest['treatment'],
  intent: AudienceIntent,
  iteration: number = 1,
  previousAnalysis?: PreviousAnalysisContext,
  targetProfile?: AnalyzeResonanceRequest['targetProfile']
): string {
  const genreLabel = intent.primaryGenre.replace('-', ' ')
  const demoLabel = intent.targetDemographic.replace(/-/g, ' ')
  const toneLabel = intent.toneProfile.replace('-', ' ')
  
  // Get the checklist-based prompt section
  const checklistSection = buildChecklistPrompt(intent, iteration)
  const iterationFocus = getIterationFocus(iteration)
  
  // Truncate long fields to reduce prompt size and memory usage
  const synopsis = truncateText(treatment.synopsis, 2000)
  const beatsText = treatment.beats?.slice(0, 10).map(b => 
    `${b.title}: ${truncateText(b.intent || b.synopsis || '', 150)}`
  ).join('\n') || 'Not provided'
  const charactersText = treatment.character_descriptions?.slice(0, 6).map(c => 
    `${c.name} (${c.role}): ${truncateText(c.description, 150)}`
  ).join('\n') || 'Not provided'
  
  // Build target profile context for consistent scoring toward 90+
  const targetContext = targetProfile ? `
TARGET SCORING PROFILE (locked for this intent):
This profile defines what 90+ looks like for ${genreLabel}/${demoLabel}/${toneLabel}.
Score improvements should move TOWARD these targets, not away from them.

Axis Weight Modifiers (higher = more important for this genre):
- Originality: ${targetProfile.axisWeightModifiers.originality.toFixed(1)}x
- Genre Fidelity: ${targetProfile.axisWeightModifiers.genreFidelity.toFixed(1)}x  
- Character Depth: ${targetProfile.axisWeightModifiers.characterDepth.toFixed(1)}x
- Pacing: ${targetProfile.axisWeightModifiers.pacing.toFixed(1)}x
- Commercial Viability: ${targetProfile.axisWeightModifiers.commercialViability.toFixed(1)}x

Axis Targets for 90+ score:
- Originality: ${targetProfile.axisTargets.originality}
- Genre Fidelity: ${targetProfile.axisTargets.genreFidelity}
- Character Depth: ${targetProfile.axisTargets.characterDepth}
- Pacing: ${targetProfile.axisTargets.pacing}
- Commercial Viability: ${targetProfile.axisTargets.commercialViability}

STABLE SCORING: Score progress should be CUMULATIVE. Each applied fix moves closer to target.
` : ''

  // Build baseline anchoring context for re-analysis (Verification/Editor persona)
  const baselineContext = previousAnalysis ? `
YOU ARE NOW A SCREENPLAY DOCTOR verifying specific improvements, NOT a fresh critic.
The user has applied ${previousAnalysis.appliedFixes.length} fix(es) since the last analysis.

PREVIOUS ANALYSIS BASELINE (Iteration ${iteration - 1}):
- Overall Score: ${previousAnalysis.score}/100
- Axis Scores: Originality ${previousAnalysis.axisScores.originality}, Genre ${previousAnalysis.axisScores.genreFidelity}, Character ${previousAnalysis.axisScores.characterDepth}, Pacing ${previousAnalysis.axisScores.pacing}, Commercial ${previousAnalysis.axisScores.commercialViability}
- Checkpoint Scores: ${Object.entries(previousAnalysis.checkpointScores || {}).filter(([, s]) => s < 7).map(([id, s]) => `${id}:${s}/10`).join(', ') || 'All >= 7'}
${previousAnalysis.appliedFixes.length > 0 ? `
APPLIED FIXES (verify these improvements):
${previousAnalysis.appliedFixes.map((fix, i) => `${i + 1}. [${fix.checkpointId}] "${fix.fixText}"`).join('\n')}
` : ''}
VERIFICATION SCORING RULES:
1. VERIFY FIXES: For each applied fix, evaluate if it addresses the checkpoint (0-10 scale)
2. PARTIAL SUCCESS COUNTS: If a fix is even partially successful, INCREASE the checkpoint score
3. NO UNRELATED REGRESSION: Do NOT lower scores for checkpoints that were not fixed
4. BASELINE ANCHORING: Scores should generally IMPROVE or stay stable after fixes
5. PRESERVE PASSING: Checkpoints scoring 7+ before should remain 7+ unless content was removed
6. INCREMENTAL IMPROVEMENT: Each fix applied should contribute +2-10 points to relevant axis
` : ''

  return `You are a Creative Executive. Analyze this treatment for market viability.

INTENT: ${genreLabel} | ${demoLabel} | ${toneLabel}
${targetContext}
${baselineContext}
TREATMENT:
Title: ${treatment.title || 'Untitled'}
Logline: ${truncateText(treatment.logline, 300) || 'Not provided'}
Genre: ${treatment.genre || 'Not specified'} | Tone: ${treatment.tone || 'Not specified'}

Synopsis: ${synopsis || 'Not provided'}

Setting: ${truncateText(treatment.setting, 200) || 'Not specified'}
Protagonist: ${truncateText(treatment.protagonist, 200) || 'Not specified'}
Antagonist: ${truncateText(treatment.antagonist, 200) || 'Not specified'}

Themes: ${Array.isArray(treatment.themes) ? treatment.themes.slice(0, 5).join(', ') : treatment.themes || 'Not specified'}

Beats:
${beatsText}

Characters:
${charactersText}

${treatment.act_breakdown ? `Acts: ${truncateText(treatment.act_breakdown.act1, 200)} → ${truncateText(treatment.act_breakdown.act2, 200)} → ${truncateText(treatment.act_breakdown.act3, 200)}` : ''}

${checklistSection}

Return JSON:
{
  "greenlight_score": number (0-100),
  "confidence": number (0-1),
  "originality_score": number (0-100),
  "genre_fidelity_score": number (0-100),
  "character_depth_score": number (0-100),
  "pacing_score": number (0-100),
  "commercial_viability_score": number (0-100),
  "checkpoint_scores": {
    "hook-or-twist": number (0-10, where 7+ = pass),
    "cliche-avoidance": number (0-10),
    "unique-setting-or-premise": number (0-10),
    "protagonist-goal": number (0-10),
    "protagonist-flaw": number (0-10),
    "antagonist-defined": number (0-10),
    "character-ghost": number (0-10),
    "three-act-structure": number (0-10),
    "inciting-incident-placement": number (0-10),
    "low-point-mentioned": number (0-10),
    "midpoint-shift": number (0-10),
    "genre-keywords": number (0-10),
    "genre-conventions-met": number (0-10),
    "tone-consistency": number (0-10),
    "protagonist-demographic-match": number (0-10),
    "demographic-themes": number (0-10),
    "marketable-logline": number (0-10)
  },
  "insights": [
    {
      "category": "genre-alignment" | "audience-demographics" | "tone-consistency" | "character-arc" | "structural-beats" | "market-positioning",
      "status": "strength" | "weakness" | "neutral",
      "title": string,
      "insight": string,
      "actionable": boolean,
      "fix_suggestion": string (ready-to-use text for weaknesses),
      "fix_section": "core" | "story" | "tone" | "beats" | "characters",
      "checkpoint_id": string (for weaknesses: e.g., "hook-or-twist", "protagonist-goal"),
      "axis_id": "concept_originality" | "character_depth" | "pacing_structure" | "genre_fidelity" | "commercial_viability"
    }
  ],
  "recommendations": [{"priority": "high"|"medium"|"low", "title": string, "description": string, "expected_impact": number}]
}

SCORING SCALE: 0-10 per checkpoint (0=missing, 5=weak, 7=adequate, 9=strong, 10=excellent). Score 7+ = checkpoint passed.
PATH TO 90+: For scores below 90, generate fixes for checkpoints scoring < 9. To reach 90+, most checkpoints need 9-10.
RULES: Weaknesses (score<7) MUST have actionable=true, fix_suggestion (specific text), checkpoint_id, axis_id. Checkpoints 7-8 should ALSO have fix_suggestion if overall score is below target.
ALWAYS provide at least 3 actionable insights with fix_suggestion when score < 90. Include recommendations for polish/enhancement even when core issues are fixed.
${iteration >= 2 ? `Avoid: ${iterationFocus.restrictedSuggestions.slice(0, 3).join(', ')}` : ''}
${iteration >= 3 ? 'FINAL: Accept unless FATAL FLAW. Still provide enhancement suggestions if score < 90.' : ''}`
}

function getGenreGuidelines(genre: string): string {
  const guidelines: Record<string, string> = {
    'thriller': 'Must have: clear stakes, ticking clock, escalating tension, "All Is Lost" moment, twist/reveal. Check for: suspenseful pacing, moral ambiguity, red herrings.',
    'horror': 'Must have: atmosphere of dread, clear monster/threat, final girl/survivor archetype, escalating scares. Check for: isolation, vulnerability, supernatural or psychological menace.',
    'drama': 'Must have: emotional core, character transformation, stakes (personal or interpersonal), cathartic resolution. Check for: authenticity, relatable struggles.',
    'comedy': 'Must have: clear comedic premise, set-up/payoff structure, likeable protagonist, stakes despite humor. Check for: comedic timing beats, character foibles.',
    'sci-fi': 'Must have: world-building consistency, technology/concept that drives plot, human element amidst spectacle. Check for: internal logic, thematic resonance (what does tech mean?).',
    'romance': 'Must have: meet-cute, obstacles to love, emotional vulnerability, satisfying resolution. Check for: chemistry setup, emotional stakes, genre conventions (will they/won\'t they).',
    'action': 'Must have: clear hero\'s goal, escalating set-pieces, physical stakes, villain with clear motivation. Check for: pacing, visual spectacle potential.',
    'documentary': 'Must have: clear thesis/angle, compelling subjects, narrative arc despite non-fiction. Check for: access, visual interest, emotional hook.',
    'fantasy': 'Must have: consistent magic system, world-building, chosen one or quest structure. Check for: internal logic, wonder moments.',
    'mystery': 'Must have: central question, clues/red herrings, satisfying revelation. Check for: fair-play mystery rules, detective/investigator character.'
  }
  return guidelines[genre] || 'Evaluate against standard narrative conventions: protagonist goal, obstacles, climax, resolution.'
}

function getDemographicGuidelines(demo: string): string {
  const guidelines: Record<string, string> = {
    'gen-z-18-24': 'Values: authenticity, social consciousness, diverse representation, fast-paced content, digital native themes, mental health awareness. Avoid: preachy messaging, outdated references.',
    'millennials-25-34': 'Values: nostalgia with modern twist, work-life themes, relationship complexity, economic anxiety themes, ironic humor. Avoid: condescension, simplistic solutions.',
    'gen-x-35-54': 'Values: skepticism, anti-establishment themes, family dynamics, career/life balance, quality over spectacle. Avoid: excessive CGI reliance, superficiality.',
    'boomers-55+': 'Values: legacy themes, health/mortality awareness, grandparent roles, historical context, proven star power. Avoid: excessive technology focus, rapid editing.',
    'teens-13-17': 'Values: identity exploration, peer dynamics, first experiences, rebellion, aspirational heroes. Avoid: condescension, adult preachiness.',
    'family-all-ages': 'Values: multi-generational appeal, positive messaging, adventure, humor for all ages, emotional moments. Avoid: adult innuendo, violence, complex moral ambiguity.',
    'mature-21+': 'Values: complex themes, moral ambiguity, explicit content if meaningful, sophisticated narratives. Avoid: unnecessary shock value.'
  }
  return guidelines[demo] || 'Consider broad appeal factors: relatable characters, clear narrative, emotional resonance.'
}

/**
/**
 * Parse checkpoint_scores from Gemini response into structured CheckpointResults
 * Uses gradient scoring (0-10) instead of binary pass/fail
 * 
 * @param checkpointScores - Checkpoint ID to score (0-10) mapping from Gemini
 * @param previousCheckpointScores - Previous scores for baseline preservation
 */
function parseCheckpointResultsGradient(
  checkpointScores: Record<string, number> | undefined,
  previousCheckpointScores?: Record<string, number>
): CheckpointResults {
  // Initialize with default scores
  const results: CheckpointResults = {
    'concept-originality': {},
    'character-depth': {},
    'pacing-structure': {},
    'genre-fidelity': {},
    'commercial-viability': {}
  }
  
  // Process each axis
  for (const axis of ALL_SCORING_AXES) {
    const axisResults: AxisCheckpointResults = {}
    
    for (const checkpoint of axis.checkpoints) {
      // Get current score from AI (default to 5 if missing)
      let score = checkpointScores?.[checkpoint.id] ?? 5
      
      // Clamp to 0-10 range
      score = Math.max(0, Math.min(10, Math.round(score)))
      
      // Preserve previous score if it was higher (no regression for passing checkpoints)
      const previousScore = previousCheckpointScores?.[checkpoint.id]
      if (previousScore !== undefined && previousScore >= 7 && score < previousScore) {
        console.log(`[Resonance] Preserving checkpoint "${checkpoint.id}" score: ${previousScore} -> ${score} (keeping ${previousScore})`)
        score = previousScore
      }
      
      // Convert to result format with backward compatibility
      const passed = score >= 7
      const penalty = passed ? 0 : Math.round(((10 - score) / 10) * checkpoint.failPenalty)
      
      axisResults[checkpoint.id] = {
        score,
        passed,
        penalty,
        feedback: '' // Feedback will be in insights
      }
    }
    
    results[axis.id as keyof CheckpointResults] = axisResults
  }
  
  console.log('[Resonance] Parsed gradient checkpoint results')
  return results
}

/**
 * LEGACY: Parse checkpoints_passed from Gemini response into structured CheckpointResults
 * Maps each checkpoint to passed/failed status with penalty values from axis definitions
 * 
 * @param rawCheckpoints - Checkpoints reported as passed by Gemini
 * @param previouslyPassedCheckpoints - Checkpoint IDs that passed in previous iteration (should be preserved)
 */
function parseCheckpointResults(
  rawCheckpoints: Record<string, string[]> | undefined,
  previouslyPassedCheckpoints?: string[]
): CheckpointResults {
  // Axis ID mapping from prompt format to our format
  const axisIdMap: Record<string, keyof CheckpointResults> = {
    'concept_originality': 'concept-originality',
    'character_depth': 'character-depth',
    'pacing_structure': 'pacing-structure',
    'genre_fidelity': 'genre-fidelity',
    'commercial_viability': 'commercial-viability'
  }
  
  // Build a Set for O(1) lookup of previously passed checkpoints
  const preservedCheckpoints = new Set(previouslyPassedCheckpoints || [])
  
  // Initialize with empty results
  const results: CheckpointResults = {
    'concept-originality': {},
    'character-depth': {},
    'pacing-structure': {},
    'genre-fidelity': {},
    'commercial-viability': {}
  }
  
  // NOTE: Uses module-level CHECKPOINT_PENALTIES cache (computed once at load)
  // This avoids rebuilding the penalty map on every request (85 iterations saved)
  
  // If no checkpoints from Gemini, check if we have previously passed checkpoints to preserve
  if (!rawCheckpoints || typeof rawCheckpoints !== 'object') {
    if (preservedCheckpoints.size > 0) {
      console.log(`[Resonance] No new checkpoint data from Gemini, preserving ${preservedCheckpoints.size} previously passed checkpoints`)
      // Populate results with preserved checkpoints
      for (const axis of ALL_SCORING_AXES) {
        const axisResults: AxisCheckpointResults = {}
        for (const checkpoint of axis.checkpoints) {
          const passed = preservedCheckpoints.has(checkpoint.id)
          axisResults[checkpoint.id] = {
            passed,
            penalty: passed ? 0 : checkpoint.failPenalty
          }
        }
        results[axis.id as keyof CheckpointResults] = axisResults
      }
      return results
    }
    console.log('[Resonance] No checkpoint data from Gemini, returning empty results')
    return results
  }
  
  // Process each axis
  for (const [rawAxisId, passedCheckpointIds] of Object.entries(rawCheckpoints)) {
    const axisId = axisIdMap[rawAxisId]
    if (!axisId) {
      console.warn(`[Resonance] Unknown axis ID in checkpoints_passed: ${rawAxisId}`)
      continue
    }
    
    // Find the axis definition to get all checkpoints
    const axisConfig = ALL_SCORING_AXES.find(a => a.id === axisId)
    if (!axisConfig) continue
    
    // Mark each checkpoint as passed or failed
    // PRESERVE: If a checkpoint was previously passed, keep it passed (no regression)
    const axisResults: AxisCheckpointResults = {}
    for (const checkpoint of axisConfig.checkpoints) {
      const passedNow = Array.isArray(passedCheckpointIds) && passedCheckpointIds.includes(checkpoint.id)
      const wasPassedBefore = preservedCheckpoints.has(checkpoint.id)
      // Checkpoint is passed if either: it passes now OR it passed before (no regression)
      const passed = passedNow || wasPassedBefore
      axisResults[checkpoint.id] = {
        passed,
        penalty: passed ? 0 : checkpoint.failPenalty
      }
      
      // Log preservation events
      if (wasPassedBefore && !passedNow) {
        console.log(`[Resonance] Preserving checkpoint "${checkpoint.id}" (passed before, would have regressed)`)
      }
    }
    
    results[axisId] = axisResults
  }
  
  console.log('[Resonance] Parsed checkpoint results:', JSON.stringify(results, null, 2))
  return results
}

function mapCategory(cat: string): ResonanceInsight['category'] {
  const map: Record<string, ResonanceInsight['category']> = {
    'genre-alignment': 'genre-alignment',
    'genre': 'genre-alignment',
    'audience-demographics': 'audience-demographics',
    'audience': 'audience-demographics',
    'demographics': 'audience-demographics',
    'tone-consistency': 'tone-consistency',
    'tone': 'tone-consistency',
    'character-arc': 'character-arc',
    'character': 'character-arc',
    'characters': 'character-arc',
    'structural-beats': 'structural-beats',
    'structure': 'structural-beats',
    'beats': 'structural-beats',
    'pacing': 'structural-beats',
    'market-positioning': 'market-positioning',
    'market': 'market-positioning',
    'commercial': 'market-positioning'
  }
  return map[cat?.toLowerCase()] || 'market-positioning'
}

function mapFixSection(section: string): ResonanceInsight['fixSection'] | undefined {
  if (!section) return undefined
  const map: Record<string, ResonanceInsight['fixSection']> = {
    'core': 'core',
    'story': 'story',
    'tone': 'tone',
    'beats': 'beats',
    'characters': 'characters'
  }
  return map[section?.toLowerCase()]
}

/**
 * Infer the appropriate fix section based on insight category
 */
function inferFixSectionFromCategory(category: ResonanceInsight['category']): ResonanceInsight['fixSection'] {
  const map: Record<ResonanceInsight['category'], ResonanceInsight['fixSection']> = {
    'genre-alignment': 'core',
    'audience-demographics': 'core',
    'tone-consistency': 'tone',
    'character-arc': 'characters',
    'structural-beats': 'beats',
    'market-positioning': 'story'
  }
  return map[category] || 'story'
}

/**
 * Generate a default fix suggestion for weaknesses that are missing one
 */
function generateDefaultFixSuggestion(title: string, category: ResonanceInsight['category']): string {
  const titleLower = (title || '').toLowerCase()
  
  // Character-related issues
  if (titleLower.includes('protagonist') || titleLower.includes('character')) {
    return 'Add a clear protagonist definition: "A [adjective] [occupation], [NAME], who struggles with [internal conflict] while pursuing [external goal]."'
  }
  if (titleLower.includes('antagonist')) {
    return 'Define the antagonist: "Opposing [protagonist] is [NAME], a [description] whose [motivation] drives them to [specific actions]."'
  }
  
  // Structure-related issues
  if (titleLower.includes('beat') || titleLower.includes('structure') || titleLower.includes('pacing')) {
    return 'Add clearer story beats: Define the Inciting Incident, Midpoint Turn, All Is Lost moment, and Climax with specific dramatic turning points.'
  }
  
  // Tone-related issues
  if (titleLower.includes('tone') || titleLower.includes('mood')) {
    return 'Clarify the tone by adding specific visual and emotional descriptors. Reference comparable films to establish the intended atmosphere.'
  }
  
  // Genre-related issues
  if (titleLower.includes('genre') || titleLower.includes('convention')) {
    return 'Strengthen genre elements by including essential conventions: for thrillers add stakes/ticking clock, for drama add emotional transformation arc.'
  }
  
  // Logline issues
  if (titleLower.includes('logline') || titleLower.includes('concept')) {
    return 'Strengthen the logline: "When [protagonist] faces [inciting incident], they must [action] or else [stakes]."'
  }
  
  // Default based on category
  switch (category) {
    case 'character-arc':
      return 'Deepen character development with specific emotional arcs, internal conflicts, and transformational moments.'
    case 'structural-beats':
      return 'Add or clarify story beats to improve narrative pacing and dramatic tension.'
    case 'tone-consistency':
      return 'Ensure consistent tone throughout by specifying visual style, mood, and comparable works.'
    case 'genre-alignment':
      return 'Reinforce genre conventions to meet audience expectations for this category.'
    case 'audience-demographics':
      return 'Adjust content to better resonate with the target demographic\'s values and interests.'
    default:
      return 'Review and enhance this section to strengthen market positioning and audience appeal.'
  }
}

function calculateWeightedScore(axes: ResonanceAxis[]): number {
  const totalWeight = axes.reduce((sum, a) => sum + a.weight, 0)
  const weightedScore = axes.reduce((sum, a) => sum + (a.score * a.weight), 0) / totalWeight
  return Math.round(weightedScore)
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
