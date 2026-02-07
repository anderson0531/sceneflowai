import { NextRequest, NextResponse } from 'next/server'
import { RecommendationPriority } from '@/types/story'
import { generateText } from '@/lib/vertexai/gemini'

export const maxDuration = 60
export const runtime = 'nodejs'

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
  /** Previous dimensional scores for hysteresis smoothing (prevents score volatility) */
  previousScores?: {
    overallScore: number
    categories: { name: string; score: number; weight: number }[]
  }
  /** Hash of the script content — if unchanged from last analysis, stronger smoothing is applied */
  scriptHash?: string
  /** Hash from the previous analysis — compared to scriptHash to detect changes */
  previousScriptHash?: string
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
    const { projectId, script, previousScores, scriptHash, previousScriptHash }: ScriptReviewRequest = await req.json()

    if (!projectId || !script) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    console.log('[Script Review] Generating Audience Resonance review for project:', projectId)
    
    // Detect if script has changed since last analysis
    const scriptUnchanged = scriptHash && previousScriptHash && scriptHash === previousScriptHash
    if (scriptUnchanged) {
      console.log('[Script Review] Script unchanged since last analysis — applying strong score anchoring')
    }

    // Pre-calculate Show vs Tell ratio
    const showVsTellMetrics = calculateShowVsTellRatio(script.scenes || [])
    console.log('[Script Review] Show vs Tell metrics:', showVsTellMetrics)
    
    // Generate deterministic seed from scriptHash (covers scene content) for reproducible scoring
    const seedContent = scriptHash || JSON.stringify({ title: script.title, logline: script.logline, sceneCount: script.scenes?.length })
    let contentSeed = 0
    for (let i = 0; i < seedContent.length; i++) {
      contentSeed = ((contentSeed << 5) - contentSeed) + seedContent.charCodeAt(i)
      contentSeed = contentSeed & contentSeed
    }
    contentSeed = Math.abs(contentSeed)
    console.log('[Script Review] Content seed:', contentSeed, '| from scriptHash:', !!scriptHash, '| scriptUnchanged:', scriptUnchanged)

    // Generate Audience Resonance review (replaces both director and audience)
    const audienceResonance = await generateAudienceResonance(script, showVsTellMetrics, contentSeed, previousScores, scriptUnchanged)

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
      generatedAt: new Date().toISOString()
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
  scriptUnchanged?: boolean
): Promise<AudienceResonanceReview> {
  const sceneCount = script.scenes?.length || 0
  const characterCount = script.characters?.length || 0
  
  // Extract full scene content for analysis
  const sceneSummaries = script.scenes?.map((scene: any, idx: number) => {
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
  let autoScoreCap = 100
  let autoCapReason = ''
  if (showVsTellMetrics.ratio > 40) {
    autoScoreCap = 75
    autoCapReason = `Narration comprises ${showVsTellMetrics.ratio.toFixed(1)}% of content (>40%). Consider reducing narration.`
  } else if (showVsTellMetrics.ratio > 30) {
    autoScoreCap = 85
    autoCapReason = `Narration comprises ${showVsTellMetrics.ratio.toFixed(1)}% of content (>30%). Some narration reduction recommended.`
  } else if (showVsTellMetrics.ratio > 20) {
    autoScoreCap = 90
    autoCapReason = `Narration comprises ${showVsTellMetrics.ratio.toFixed(1)}% of content (>20%). Minor narration adjustment may help.`
  }

  const prompt = `You are an expert screenplay analyst using a DEDUCTION-BASED RUBRIC system. Your job is to provide fair, constructive feedback that helps writers improve their scripts.

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

## CONDITIONAL DEDUCTIONS (Apply only if metrics warrant)

For a script with ${sceneCount} scenes, check these issues:

${sceneCount > 80 ? `- **-10 points**: Excessive scene count (${sceneCount} scenes). Most feature films have 40-60 scenes. Many scenes may be too short or redundant.` : ''}
${showVsTellMetrics.ratio > 15 ? `- **-${Math.min(15, Math.round(showVsTellMetrics.ratio - 10))} points**: Narration overuse (${showVsTellMetrics.ratio.toFixed(1)}% is narration). Professional scripts aim for under 15%.` : `Note: Narration ratio is ${showVsTellMetrics.ratio.toFixed(1)}% which is within acceptable range (under 15%). Do NOT deduct for narration.`}

Scene Content:
${sceneSummaries}

## DEDUCTION RUBRIC WITH IMPORTANCE LEVELS

Each deduction has an importance level that affects how much it impacts the audience experience:
- **critical**: Major issue that breaks immersion or confuses audience (full point value)
- **high**: Noticeable issue that detracts from the experience (full point value)
- **medium**: Minor issue that most viewers would overlook (half point value for scoring)
- **low**: Polish issue for final drafts only (quarter point value for scoring)

### Dialogue Issues
- **-5 points** (high): "On-the-nose" dialogue - characters say exactly what they feel without subtext
- **-4 points** (medium): Characters all sound the same (no distinct voices)
- **-3 points** (low): Exposition dumps through dialogue ("As you know, Bob...")
- **-3 points** (low): Repetitive dialogue beats (same argument repeated without progression)

### Narration/Description Issues  
- **-7 points** (high): Narration explains emotions instead of showing through action/behavior
- **-5 points** (medium): "Purple prose" - overly poetic/flowery narration that slows pacing
- **-4 points** (low): Camera direction in action lines (unnecessary "we see", "we hear")
- **-3 points** (low): Telling internal thoughts that should be dramatized

### Structural Issues
- **-5 points** (critical): No clear inciting incident in first 10% of script
- **-5 points** (high): Saggy middle - second act lacks escalation or new information
- **-4 points** (medium): Rushed resolution - climax/resolution happens too abruptly
- **-3 points per instance** (medium): Scenes that repeat same emotional beat without progression (max -12)

### Character Issues
- **-5 points** (critical): Protagonist lacks clear want/need or motivation
- **-4 points** (high): Antagonist is one-dimensional or unclear
- **-4 points** (medium): Supporting characters serve only as "validators" without agency
- **-3 points** (low): Character decisions don't follow established logic

### Pacing Issues
- **-5 points** (high): Discovery/setup phase takes >40% of the script
- **-4 points** (medium): "Staccato" pacing - too many very short scenes (2-3 lines) without rhythm variation
- **-3 points** (low): Transitions between scenes are jarring or unmotivated
- **-3 points** (low): Choppy scene structure prevents emotional immersion

### Visual Storytelling
- **-4 points** (medium): Reliance on dialogue to convey what should be visual
- **-3 points** (low): Missed opportunities for "show don't tell" moments
- **-3 points** (low): Lack of visual motifs or recurring imagery

### Redundancy Issues
- **-4 points per instance** (medium, max -12): Scenes that repeat the same argument/confrontation without escalation
- **-3 points** (low): Characters have the same conversation multiple times with same outcome
- **-5 points** (high): Conflict doesn't escalate between repeated confrontations

IMPORTANT: Include the "importance" field in each deduction. Be selective - focus on critical and high importance issues. Low importance issues are polish items that shouldn't heavily impact the score.

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

MATH CHECK: Your overallScore MUST equal 100 minus the sum of all deduction points.

## SCENE ANALYSIS

${sceneCount <= 30
  ? `Provide brief analysis for EVERY scene (1 through ${sceneCount}). This data drives targeted per-scene optimization, so completeness matters.`
  : `For scenes 1, 15, 30, 45, 60, 75, 90 (or similar key moments spaced ~15 scenes apart), provide brief analysis:`
}
- Score (1-100)
- Pacing: slow/moderate/fast
- Tension: low/medium/high
- Character Development: minimal/moderate/strong
- Visual Potential: low/medium/high
- Notes: One sentence identifying what works OR the single most impactful fix for this scene
- Recommendations: 2-4 specific, actionable fixes for scenes scoring below 80. Each recommendation should be a concrete instruction that can be applied independently (e.g., "Add subtext to Alexander's dialogue — he agrees too quickly without internal conflict", "Replace the narration explaining Lena's feelings with a visual reaction shot"). For scenes scoring 80+, provide 1-2 polish suggestions. These recommendations will be sent directly to a scene revision AI, so make them precise and self-contained.

## OUTPUT FORMAT

Return ONLY valid JSON:
{
  "overallScore": <calculated score after deductions, max ${autoScoreCap}>,
  "baseScore": 100,
  "deductions": [
    {"reason": "<specific issue found>", "points": <points deducted>, "category": "<category>", "importance": "critical|high|medium|low"},
    ...
  ],
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
    {"sceneNumber": 1, "sceneHeading": "<heading>", "score": <1-100>, "pacing": "slow|moderate|fast", "tension": "low|medium|high", "characterDevelopment": "minimal|moderate|strong", "visualPotential": "low|medium|high", "notes": "<one sentence>", "recommendations": ["<specific fix 1>", "<specific fix 2>"]},
    ...
  ],
  "targetDemographic": "<primary audience>",
  "emotionalImpact": "<expected emotional response>"
}

Provide constructive, actionable feedback. Acknowledge what works well while identifying genuine areas for improvement.

FINAL CHECK before outputting:
1. Verify: overallScore = 100 - (sum of all deduction points)
2. Ensure deductions are for real issues, not invented problems
3. Balance criticism with recognition of strengths`

  console.log('[Audience Resonance] Calling Vertex AI Gemini with deduction-based prompt...')
  // Token budget: 12k base + 300 per scene for full scene analysis with recommendations (≤30 scenes)
  const reviewTokenBudget = Math.min(22000, 12000 + (sceneCount <= 30 ? sceneCount * 300 : 0))
  const result = await generateText(prompt, {
    model: 'gemini-2.5-flash',
    temperature: 0, // Deterministic scoring — same script should yield same scores
    maxOutputTokens: reviewTokenBudget,
    thinkingBudget: 0, // Disable thinking mode for faster, more direct responses
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
  // Strategy:
  // - Script unchanged: 60% previous + 40% new (strong anchoring)
  // - Script changed: 30% previous + 70% new (moderate anchoring, max ±10 points)
  //   This prevents score regression when optimizations are applied — the score
  //   can improve but won't suddenly drop by 20 points due to evaluation variance.
  // =========================================================================
  if (previousScores?.categories && categories.length > 0) {
    // Strong anchoring for unchanged scripts, moderate for changed scripts
    const anchorStrength = scriptUnchanged ? 0.6 : 0.3
    const maxDelta = scriptUnchanged ? Infinity : 10 // Max ±10 points when script changed
    
    // Build lookup of previous dimensional scores
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
        
        // For changed scripts, also enforce max delta cap to prevent regression
        if (!scriptUnchanged && maxDelta < Infinity) {
          const delta = anchoredScore - prevScore
          if (Math.abs(delta) > maxDelta) {
            // Clamp to max delta
            anchoredScore = prevScore + (delta > 0 ? maxDelta : -maxDelta)
            console.log(`[Audience Resonance] Delta clamped: ${cat.name}: raw ${rawScore} → anchored ${anchoredScore} (prev ${prevScore}, max delta ±${maxDelta})`)
          }
        }
        
        cat.score = anchoredScore
        if (rawScore !== cat.score) {
          console.log(`[Audience Resonance] Hysteresis: ${cat.name}: ${rawScore} → ${cat.score} (anchored to prev ${prevScore}, scriptChanged: ${!scriptUnchanged})`)
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
  
  // Calculate overall score from weighted dimensional average
  const weightedScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 70
  
  // Apply auto cap if needed (for high narration scripts)
  const enforcedScore = Math.min(weightedScore, autoScoreCap)
  
  if (enforcedScore !== review.overallScore) {
    console.log(`[Audience Resonance] Score calculation: AI returned ${review.overallScore}, Weighted dimensional avg: ${weightedScore}, Cap: ${autoScoreCap} -> Final: ${enforcedScore}`)
  }
  
  // Apply the weighted score (aligned with dimensional analysis)
  review.overallScore = enforcedScore
  
  // Log the calculation breakdown
  const totalDeductions = deductions.reduce((sum: number, d: any) => sum + (d.points || 0), 0)
  console.log(`[Audience Resonance] Final score: ${review.overallScore} (weighted avg of ${categories.length} dimensions, deductions for feedback: ${totalDeductions} pts)`)
  
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
