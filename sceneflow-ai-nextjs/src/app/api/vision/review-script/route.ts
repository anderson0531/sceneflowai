import { NextRequest, NextResponse } from 'next/server'
import { RecommendationPriority } from '@/types/story'
import { generateText } from '@/lib/vertexai/gemini'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { CreditService } from '@/services/CreditService'
import { BLUEPRINT_CREDITS } from '@/lib/credits/creditCosts'

export const maxDuration = 180
export const runtime = 'nodejs'

const AUDIENCE_RESONANCE_CREDIT_COST = BLUEPRINT_CREDITS.AUDIENCE_RESONANCE_ANALYSIS // 25 credits

interface ReviewRecommendation {
  text: string
  priority: RecommendationPriority
  category?: string
}

interface Deduction {
  reason: string
  points: number
  category: string
}

interface SceneAnalysis {
  sceneNumber: number
  sceneHeading: string
  score: number
  pacing: 'slow' | 'moderate' | 'fast'
  tension: 'low' | 'medium' | 'high'
  characterDevelopment: 'minimal' | 'moderate' | 'strong'
  visualPotential: 'low' | 'medium' | 'high'
  notes: string
  recommendations?: string[]  // 2-4 targeted fixes for this specific scene
}

interface AudienceResonanceReview {
  overallScore: number
  baseScore: number // Always 100
  deductions: Deduction[]
  categories: {
    name: string
    score: number
    weight: number
  }[]
  showVsTellRatio: number // Percentage of narration vs action
  analysis: string
  strengths: string[]
  improvements: string[]
  recommendations: ReviewRecommendation[]
  sceneAnalysis: SceneAnalysis[]
  targetDemographic: string
  emotionalImpact: string
  generatedAt: string
}

interface ScriptReviewRequest {
  projectId: string
  script: {
    title?: string
    logline?: string
    scenes: any[]
    characters?: any[]
  }
  targetDemographic?: string
  /** Previous dimensional scores for hysteresis smoothing (prevents score volatility) */
  previousScores?: {
    overallScore: number
    categories: { name: string; score: number; weight: number }[]
  }
}

// Calculate Show vs Tell ratio from script content
function calculateShowVsTellRatio(scenes: any[]): { ratio: number; narrationWords: number; actionWords: number; dialogueWords: number } {
  let narrationWords = 0
  let actionWords = 0
  let dialogueWords = 0

  for (const scene of scenes) {
    // Count narration words
    if (scene.narration) {
      narrationWords += scene.narration.split(/\s+/).filter((w: string) => w.length > 0).length
    }
    
    // Count action words
    if (scene.action) {
      actionWords += scene.action.split(/\s+/).filter((w: string) => w.length > 0).length
    }
    
    // Count dialogue words
    if (scene.dialogue && Array.isArray(scene.dialogue)) {
      for (const d of scene.dialogue) {
        if (d.line) {
          dialogueWords += d.line.split(/\s+/).filter((w: string) => w.length > 0).length
        }
      }
    }
  }

  const totalWords = narrationWords + actionWords + dialogueWords
  const ratio = totalWords > 0 ? (narrationWords / totalWords) * 100 : 0

  return { ratio, narrationWords, actionWords, dialogueWords }
}

export async function POST(req: NextRequest) {
  try {
    // Get user session for credit charging
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id

    const { projectId, script, previousScores, targetDemographic }: ScriptReviewRequest = await req.json()

    if (!projectId || !script) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    console.log('[Script Review] Generating Audience Resonance review for project:', projectId)

    // Clean empty/trivial narration before analysis — scenes may carry empty
    // narration fields from optimization cycles that should not appear in the
    // analysis prompt or inflate the Show vs Tell ratio
    const cleanedScenes = (script.scenes || []).map((scene: any) => {
      const rawNarration = (scene.narration || '').trim()
      if (!rawNarration || rawNarration.toLowerCase() === 'none' || rawNarration === 'null') {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { narration: _removed, ...rest } = scene
        return rest
      }
      return scene
    })

    // Pre-calculate Show vs Tell ratio from cleaned scenes
    const showVsTellMetrics = calculateShowVsTellRatio(cleanedScenes)
    console.log('[Script Review] Show vs Tell metrics:', showVsTellMetrics)
    
    // Generate deterministic seed from script content for reproducible scoring
    const seedContent = JSON.stringify({ title: script.title, logline: script.logline, sceneCount: script.scenes?.length })
    let contentSeed = 0
    for (let i = 0; i < seedContent.length; i++) {
      contentSeed = ((contentSeed << 5) - contentSeed) + seedContent.charCodeAt(i)
      contentSeed = contentSeed & contentSeed
    }
    contentSeed = Math.abs(contentSeed)
    console.log('[Script Review] Content seed:', contentSeed)

    // =========================================================================
    // CREDIT CHECK: Verify user has sufficient credits before AI generation
    // Only charged when AI is actually used (cached results are free)
    // =========================================================================
    if (userId) {
      const hasCredits = await CreditService.ensureCredits(userId, AUDIENCE_RESONANCE_CREDIT_COST)
      if (!hasCredits) {
        console.log('[Script Review] Insufficient credits for user:', userId)
        return NextResponse.json(
          { 
            error: 'Insufficient credits for Audience Resonance analysis',
            required: AUDIENCE_RESONANCE_CREDIT_COST,
            operation: 'audience_resonance_analysis'
          },
          { status: 402 }
        )
      }
    }

    // Generate Audience Resonance review (replaces both director and audience)
    const audienceResonance = await generateAudienceResonance(script, showVsTellMetrics, contentSeed, previousScores, cleanedScenes, targetDemographic)

    // =========================================================================
    // CREDIT CHARGE: Deduct credits after successful AI generation
    // =========================================================================
    if (userId) {
      await CreditService.charge(
        userId,
        AUDIENCE_RESONANCE_CREDIT_COST,
        'ai_usage',
        null,
        {
          operation: 'audience_resonance_analysis',
          projectId,
          sceneCount: script.scenes?.length || 0,
          overallScore: audienceResonance.overallScore
        }
      )
      console.log('[Script Review] Charged', AUDIENCE_RESONANCE_CREDIT_COST, 'credits to user:', userId)
    }

    return NextResponse.json({
      success: true,
      audienceResonance,
      // Keep backward compatibility - map to old structure
      audience: {
        overallScore: audienceResonance.overallScore,
        categories: audienceResonance.categories,
        analysis: audienceResonance.analysis,
        strengths: audienceResonance.strengths,
        improvements: audienceResonance.improvements,
        recommendations: audienceResonance.recommendations,
        generatedAt: audienceResonance.generatedAt
      },
      // Director review removed - user is the director
      director: null,
      generatedAt: new Date().toISOString(),
      creditsUsed: userId ? AUDIENCE_RESONANCE_CREDIT_COST : 0
    })
  } catch (error: any) {
    console.error('[Script Review] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate reviews' },
      { status: 500 }
    )
  }
}

async function generateAudienceResonance(
  script: any, 
  showVsTellMetrics: { ratio: number; narrationWords: number; actionWords: number; dialogueWords: number },
  contentSeed: number,
  previousScores?: ScriptReviewRequest['previousScores'],
  cleanedScenes?: any[],
  targetDemographic?: string
): Promise<AudienceResonanceReview> {
  const sceneCount = script.scenes?.length || 0
  const characterCount = script.characters?.length || 0
  
  // Use cleaned scenes (empty narration stripped) or fall back to raw scenes
  const scenesForAnalysis = cleanedScenes || script.scenes || []
  
  // Extract full scene content for analysis (use cleaned scenes — empty narration already stripped)
  const sceneSummaries = scenesForAnalysis.map((scene: any, idx: number) => {
    const heading = scene.heading || 'Untitled'
    const action = scene.action || 'No action'
    const narration = scene.narration || ''
    const dialogueLines = (scene.dialogue || []).slice(0, 5).map((d: any) => 
      `${d.character || 'UNKNOWN'}: ${d.line || ''}`
    ).join('\n  ')
    const hasMoreDialogue = (scene.dialogue?.length || 0) > 5
    
    return `Scene ${idx + 1}: ${heading}\nAction: ${action}\n${narration ? `Narration: ${narration}\n` : ''}${dialogueLines ? `Dialogue:\n  ${dialogueLines}${hasMoreDialogue ? '\n  ...' : ''}\n` : ''}`
  }).join('\n---\n') || 'No scenes available'

  // Determine automatic score guidance based on narration ratio (soft caps, not hard limits)
    // Relaxed caps: narration ratio influences ceiling but doesn't hard-block quality scripts
    // from reaching 90+ when other dimensions are strong. Deductions still penalize narration.
    let autoScoreCap = 100
    let autoCapReason = ''
    if (showVsTellMetrics.ratio > 40) {
      autoScoreCap = 82
      autoCapReason = `Narration comprises ${showVsTellMetrics.ratio.toFixed(1)}% of content (>40%). Consider reducing narration.`
    } else if (showVsTellMetrics.ratio > 30) {
      autoScoreCap = 92
      autoCapReason = `Narration comprises ${showVsTellMetrics.ratio.toFixed(1)}% of content (>30%). Some narration reduction recommended.`
    } else if (showVsTellMetrics.ratio > 20) {
      autoScoreCap = 95
      autoCapReason = `Narration comprises ${showVsTellMetrics.ratio.toFixed(1)}% of content (>20%). Minor narration adjustment may help.`
    }

  const audienceContext = targetDemographic && targetDemographic !== 'Global Audience' 
    ? `\nCRITICAL CONTEXT:\nAnalyze this script SPECIFICALLY for the following target demographic/market: "${targetDemographic}".\nTailor all feedback, strengths, improvements, and scores to how this specific audience would perceive the narrative, pacing, themes, and cultural resonance.` 
    : ''

  const prompt = `You are an expert screenplay analyst using a DEDUCTION-BASED RUBRIC system. Your job is to provide fair, constructive feedback that helps writers improve their scripts.${audienceContext}

SCORING RULES:
1. Start at 100 and deduct points for genuine craft issues
2. Be fair and balanced - acknowledge strengths while identifying areas for improvement
3. Your final score MUST equal 100 minus the sum of all deductions
4. Only deduct for real issues that impact the script quality

Script Details:
- Title: ${script.title || 'Untitled Script'}
- Logline: ${script.logline || 'No logline provided'}
- Scenes: ${sceneCount}
- Characters: ${characterCount}

PRE-CALCULATED METRICS:
- Show vs Tell Ratio: ${showVsTellMetrics.ratio.toFixed(1)}% narration
- Narration Words: ${showVsTellMetrics.narrationWords}
- Action Words: ${showVsTellMetrics.actionWords}  
- Dialogue Words: ${showVsTellMetrics.dialogueWords}
${autoCapReason ? `- AUTO CAP: ${autoCapReason}` : ''}

Scene Content:
${sceneSummaries}

## EVALUATION DIMENSIONS (Score each 1-100)

1. **Dialogue Subtext** (weight: 20) - Do characters speak around what they mean? Is there tension between text and subtext?
2. **Structural Integrity** (weight: 20) - Does the three-act structure work? Are there clear turning points?
3. **Emotional Arc** (weight: 20) - Is the emotional journey earned? Does it build and pay off?
4. **Visual Storytelling** (weight: 15) - Does the script think cinematically? Are there memorable visual moments?
5. **Pacing & Rhythm** (weight: 15) - Does the script breathe? Are scene lengths varied appropriately?
6. **Show vs Tell Ratio** (weight: 10) - Is the storytelling dramatized rather than narrated?

## SCORE CALIBRATION GUIDE

- **90-100**: Exceptional. Near-production ready with minor polish. Well-crafted across all dimensions.
- **80-89**: Very good. Strong craft with some areas needing refinement.
- **75-79**: Good. Solid foundation with identifiable areas for improvement.
- **65-74**: Developing. Clear potential with meaningful craft issues to address.
- **50-64**: Working draft. Good concept but needs significant revision.
- **Below 50**: Early concept stage.

Be fair and constructive. Good first drafts CAN score 75-85 if well-executed.

MATH CHECK: Your overallScore will be automatically recalculated as the weighted average of the scene scores. However, try to provide a realistic overallScore estimate here based on those scene scores.

## SCENE ANALYSIS

${sceneCount <= 30
  ? `Provide brief analysis for EVERY scene (1 through ${sceneCount}). This data drives targeted per-scene optimization, so completeness matters.`
  : `For scenes 1, 15, 30, 45, 60, 75, 90 (or similar key moments spaced ~15 scenes apart), provide brief analysis:`
}
- Score (1-100): Calculate strictly as 100 minus the sum of pointsDeducted from the scene's recommendations.
- Story Weight (1-100): Evaluate narrative importance. A climax or major turning point is high weight (80-100), a standard scene is medium (40-70), and a minor transition is low (10-30).
- Pacing: slow/moderate/fast
- Tension: low/medium/high
- Character Development: minimal/moderate/strong
- Visual Potential: low/medium/high
- Notes: One sentence identifying what works OR the single most impactful fix for this scene
- Recommendations: 2-4 specific, actionable fixes. Each recommendation should be a concrete instruction that can be applied independently. Include a priority (high/medium/low) and a pointsDeducted value based on that priority (high=10-15, medium=5-9, low=1-4).

## OUTPUT FORMAT

Return ONLY valid JSON:
{
  "overallScore": <calculated score after deductions, max ${autoScoreCap}>,
  "baseScore": 100,
  "categories": [
    {"name": "Dialogue Subtext", "score": <1-100>, "weight": 20},
    {"name": "Structural Integrity", "score": <1-100>, "weight": 20},
    {"name": "Emotional Arc", "score": <1-100>, "weight": 20},
    {"name": "Visual Storytelling", "score": <1-100>, "weight": 15},
    {"name": "Pacing & Rhythm", "score": <1-100>, "weight": 15},
    {"name": "Show vs Tell Ratio", "score": <1-100>, "weight": 10}
  ],
  "showVsTellRatio": ${showVsTellMetrics.ratio.toFixed(1)},
  "analysis": "<2-3 paragraphs: Be specific about what works and what doesn't. Reference specific scenes.>",
  "strengths": ["<specific strength with scene reference>", ...],
  "improvements": ["<specific issue with scene reference>", ...],
  "recommendations": [
    {"text": "<actionable fix>", "priority": "critical|high|medium|optional", "category": "<category>"},
    ...
  ],
  "sceneAnalysis": [
    {"sceneNumber": 1, "sceneHeading": "<heading>", "score": <1-100>, "storyWeight": <1-100>, "pacing": "slow|moderate|fast", "tension": "low|medium|high", "characterDevelopment": "minimal|moderate|strong", "visualPotential": "low|medium|high", "notes": "<one sentence>", "recommendations": [{"text": "<specific fix 1>", "priority": "high|medium|low", "pointsDeducted": <number>}, {"text": "<specific fix 2>", "priority": "high|medium|low", "pointsDeducted": <number>}]},
    ...
  ],
  "targetDemographic": "<primary audience>",
  "emotionalImpact": "<expected emotional response>"
}

Provide constructive, actionable feedback. Acknowledge what works well while identifying genuine areas for improvement.

FINAL CHECK before outputting:
1. Balance criticism with recognition of strengths`

  console.log('[Audience Resonance] Calling Vertex AI Gemini with deduction-based prompt...')
  // Token budget: 12k base + tokens for scene analysis
  // For ≤30 scenes: 300 tokens per scene for full analysis
  // For >30 scenes: 3000 tokens for sampled key scene analysis (~10 scenes)
  const sceneAnalysisTokens = sceneCount <= 30 ? sceneCount * 300 : 3000
  const reviewTokenBudget = Math.min(24000, 12000 + sceneAnalysisTokens)
  console.log(`[Audience Resonance] Token budget: ${reviewTokenBudget} (${sceneCount} scenes, ${sceneAnalysisTokens} for scene analysis)`)
  
  const result = await generateText(prompt, {
    model: 'gemini-3.0-flash',
    temperature: 0.1, // Near-deterministic with slight variance for nuanced analysis
    maxOutputTokens: reviewTokenBudget,
    thinkingLevel: 'low', // Cap thinking to avoid excessive latency on large scripts
    timeoutMs: 150000, // 150s — within 180s Vercel limit with headroom
    maxRetries: 1, // Single retry only — each attempt can take 60-90s with thinking
    seed: contentSeed // Content-derived seed for reproducible output
  })
  
  if (result.finishReason === 'SAFETY') {
    console.error('[Audience Resonance] Content blocked by safety filters:', result.safetyRatings)
    throw new Error('Content blocked by safety filters. Please try with different script content.')
  }
  
  const reviewText = result.text

  if (!reviewText) {
    console.error('[Audience Resonance] No text in response')
    throw new Error('No review generated - empty response from Gemini')
  }

  console.log('[Audience Resonance] Raw response length:', reviewText.length)

  // Extract JSON from markdown code blocks if present
  let jsonText = reviewText.trim()
  
  const codeBlockMatch = jsonText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  if (codeBlockMatch) {
    jsonText = codeBlockMatch[1].trim()
  }

  // Parse JSON response
  let review: any
  try {
    review = JSON.parse(jsonText)
  } catch (parseError) {
    console.error('[Audience Resonance] JSON parse error:', parseError)
    console.error('[Audience Resonance] Failed to parse:', jsonText.substring(0, 1000))
    throw new Error('Failed to parse audience resonance review JSON')
  }

  // Keep deductions as qualitative feedback (shown to user, but not used for score calculation)
  const deductions = review.deductions || []
  review.deductions = deductions
  
  // SCORE CALCULATION: Use weighted average of dimensional scores
  // This ensures the overall score aligns with the dimensional analysis radar chart
  const categories = review.categories || []
  
  // Define weights for each dimension (must sum to 100)
  const dimensionWeights: Record<string, number> = {
    'Dialogue Subtext': 20,
    'Structural Integrity': 20,
    'Emotional Arc': 20,
    'Visual Storytelling': 15,
    'Pacing & Rhythm': 15,
    'Show vs Tell Ratio': 10
  }
  
    // =========================================================================
    // HYSTERESIS SMOOTHING: Prevent score volatility on re-analysis
    // When the script hasn't changed, anchor new scores toward previous scores.
    // This eliminates the "slot machine" effect where repeated analysis of the
    // same script produces swinging scores (e.g., 73 → 77 → 73).
    //
    // Strategy: 20% previous + 80% new with max ±15 point delta.
    // Light anchoring keeps stability while allowing faster convergence
    // toward the AI's true assessment after script optimization.
    // =========================================================================
    if (previousScores?.categories && categories.length > 0) {
      const anchorStrength = 0.2
      const maxDelta = 15 // Max ±15 points per dimension — allows faster convergence    // Build lookup of previous dimensional scores
    const prevScoreLookup: Record<string, number> = {}
    for (const prevCat of previousScores.categories) {
      prevScoreLookup[prevCat.name] = prevCat.score
    }
    
    // Apply hysteresis to each dimensional score
    for (const cat of categories) {
      const prevScore = prevScoreLookup[cat.name]
      if (prevScore !== undefined) {
        const rawScore = cat.score
        
        // Calculate anchored score
        let anchoredScore = Math.round(prevScore * anchorStrength + rawScore * (1 - anchorStrength))
        
        // Enforce max delta cap to prevent wild swings
        const delta = anchoredScore - prevScore
        if (Math.abs(delta) > maxDelta) {
          anchoredScore = prevScore + (delta > 0 ? maxDelta : -maxDelta)
          console.log(`[Audience Resonance] Delta clamped: ${cat.name}: raw ${rawScore} → anchored ${anchoredScore} (prev ${prevScore}, max delta ±${maxDelta})`)
        }
        
        cat.score = anchoredScore
        if (rawScore !== cat.score) {
          console.log(`[Audience Resonance] Hysteresis: ${cat.name}: ${rawScore} → ${cat.score} (anchored to prev ${prevScore})`)
        }
      }
    }
  }
  
  // Calculate weighted average from (possibly smoothed) dimensional scores
  let weightedSum = 0
  let totalWeight = 0
  
  for (const cat of categories) {
    const weight = dimensionWeights[cat.name] || cat.weight || 0
    const score = cat.score || 70 // Default to 70 if missing
    weightedSum += score * weight
    totalWeight += weight
  }
  
  // Calculate weighted average from scene scores (primary)
  let sceneWeightedScore = 0;
  let hasValidSceneWeights = false;
  
  if (review.sceneAnalysis && review.sceneAnalysis.length > 0) {
    let totalWeightedScore = 0;
    let totalSceneWeight = 0;
    let allWeightsValid = true;
    
    for (const scene of review.sceneAnalysis) {
      // Validate that scene has both a score and a storyWeight
      if (typeof scene.score === 'number' && typeof scene.storyWeight === 'number' && scene.storyWeight > 0) {
        totalWeightedScore += scene.score * scene.storyWeight;
        totalSceneWeight += scene.storyWeight;
      } else {
        allWeightsValid = false;
        break;
      }
    }
    
    if (allWeightsValid && totalSceneWeight > 0) {
      sceneWeightedScore = Math.round(totalWeightedScore / totalSceneWeight);
      hasValidSceneWeights = true;
    } else {
      // Fallback: simple average if weights are missing or invalid
      const totalSceneScore = review.sceneAnalysis.reduce((sum: number, scene: any) => sum + (scene.score || 0), 0);
      sceneWeightedScore = Math.round(totalSceneScore / review.sceneAnalysis.length);
      hasValidSceneWeights = true; // Not strictly weighted, but we have a scene-based score
    }
  }

  // Calculate overall score from scene weighted average (primary) or weighted dimensional average (fallback)
  const baseCalculatedScore = hasValidSceneWeights ? sceneWeightedScore : (totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 70)
  
  // Apply auto cap if needed (for high narration scripts)
  const enforcedScore = Math.min(baseCalculatedScore, autoScoreCap)
  
  if (enforcedScore !== review.overallScore) {
    console.log(`[Audience Resonance] Score calculation: AI returned ${review.overallScore}, Base Calculated (Scene Weighted/Dimensional): ${baseCalculatedScore}, Cap: ${autoScoreCap} -> Final: ${enforcedScore}`)
  }
  
  // Apply the final calculated score
  review.overallScore = enforcedScore
  
  // Log the calculation breakdown
  console.log(`[Audience Resonance] Final score: ${review.overallScore} (based on ${hasValidSceneWeights ? 'scene weighted average' : 'dimensional average'})`)
  
  // Normalize recommendations
  if (review.recommendations && Array.isArray(review.recommendations)) {
    review.recommendations = review.recommendations.map((rec: any) => {
      if (typeof rec === 'string') {
        return { text: rec, priority: 'medium' as RecommendationPriority }
      }
      return rec
    })
  }
  
  // Ensure required fields
  const defaultCategories = [
    { name: 'Dialogue Subtext', score: 70, weight: 20 },
    { name: 'Structural Integrity', score: 70, weight: 20 },
    { name: 'Emotional Arc', score: 70, weight: 20 },
    { name: 'Visual Storytelling', score: 70, weight: 15 },
    { name: 'Pacing & Rhythm', score: 70, weight: 15 },
    { name: 'Show vs Tell Ratio', score: 70, weight: 10 }
  ]

  // Log scene analysis results
  const sceneAnalysisCount = review.sceneAnalysis?.length || 0
  console.log(`[Audience Resonance] Scene analysis: ${sceneAnalysisCount} scenes analyzed (script has ${sceneCount} scenes)`)
  if (sceneAnalysisCount === 0) {
    console.warn('[Audience Resonance] WARNING: No scene analysis returned from AI. Response may have been truncated.')
  }

  return {
    overallScore: review.overallScore || 75,
    baseScore: 100,
    deductions: review.deductions || [],
    categories: review.categories || defaultCategories,
    showVsTellRatio: showVsTellMetrics.ratio,
    analysis: review.analysis || 'Analysis not available.',
    strengths: review.strengths || [],
    improvements: review.improvements || [],
    recommendations: review.recommendations || [],
    sceneAnalysis: review.sceneAnalysis || [],
    targetDemographic: review.targetDemographic || 'General audience',
    emotionalImpact: review.emotionalImpact || 'Varied emotional response',
    generatedAt: new Date().toISOString()
  }
}
