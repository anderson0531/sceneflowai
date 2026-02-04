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
    const { projectId, script }: ScriptReviewRequest = await req.json()

    if (!projectId || !script) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    console.log('[Script Review] Generating Audience Resonance review for project:', projectId)

    // Pre-calculate Show vs Tell ratio
    const showVsTellMetrics = calculateShowVsTellRatio(script.scenes || [])
    console.log('[Script Review] Show vs Tell metrics:', showVsTellMetrics)

    // Generate Audience Resonance review (replaces both director and audience)
    const audienceResonance = await generateAudienceResonance(script, showVsTellMetrics)

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
  showVsTellMetrics: { ratio: number; narrationWords: number; actionWords: number; dialogueWords: number }
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

  // Determine automatic score cap based on narration ratio
  let autoScoreCap = 100
  let autoCapReason = ''
  if (showVsTellMetrics.ratio > 25) {
    autoScoreCap = 65
    autoCapReason = `Narration comprises ${showVsTellMetrics.ratio.toFixed(1)}% of content (>25%). Score capped at 65.`
  } else if (showVsTellMetrics.ratio > 15) {
    autoScoreCap = 75
    autoCapReason = `Narration comprises ${showVsTellMetrics.ratio.toFixed(1)}% of content (>15%). Score capped at 75.`
  } else if (showVsTellMetrics.ratio > 10) {
    autoScoreCap = 85
    autoCapReason = `Narration comprises ${showVsTellMetrics.ratio.toFixed(1)}% of content (>10%). Score capped at 85.`
  }

  const prompt = `You are an expert screenplay analyst using a STRICT DEDUCTION-BASED RUBRIC system. You are a TOUGH CRITIC - your job is to find EVERY craft issue and apply point penalties ruthlessly.

CRITICAL SCORING RULES:
1. Start at 100 and DEDUCT points for every issue found
2. First drafts ALWAYS have issues - a score above 75 for any first draft is WRONG
3. Your final score MUST equal 100 minus the sum of all deductions
4. If you find fewer than 5 deductions, you haven't looked hard enough

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

## MANDATORY FIRST-DRAFT DEDUCTIONS (Apply if ANY apply)

For a script with ${sceneCount} scenes, check these REQUIRED issues:

${sceneCount > 80 ? `- **-10 points**: Excessive scene count (${sceneCount} scenes). Most feature films have 40-60 scenes. Many scenes may be too short or redundant.` : ''}
${showVsTellMetrics.ratio > 5 ? `- **-${Math.min(15, Math.round(showVsTellMetrics.ratio))} points**: Narration overuse (${showVsTellMetrics.ratio.toFixed(1)}% is narration). Professional scripts minimize narration.` : ''}

Scene Content:
${sceneSummaries}

## DEDUCTION RUBRIC (Apply ALL that apply)

### Dialogue Issues
- **-10 points**: "On-the-nose" dialogue - characters say exactly what they feel without subtext
- **-8 points**: Characters all sound the same (no distinct voices)
- **-5 points**: Exposition dumps through dialogue ("As you know, Bob...")
- **-5 points**: Repetitive dialogue beats (same argument repeated without progression)

### Narration/Description Issues  
- **-15 points**: Narration explains emotions instead of showing through action/behavior
- **-10 points**: "Purple prose" - overly poetic/flowery narration that slows pacing
- **-8 points**: Camera direction in action lines (unnecessary "we see", "we hear")
- **-5 points**: Telling internal thoughts that should be dramatized

### Structural Issues
- **-10 points**: No clear inciting incident in first 10% of script
- **-10 points**: Saggy middle - second act lacks escalation or new information
- **-8 points**: Rushed resolution - climax/resolution happens too abruptly
- **-5 points per instance**: Scenes that repeat same emotional beat without progression (max -25)

### Character Issues
- **-10 points**: Protagonist lacks clear want/need or motivation
- **-8 points**: Antagonist is one-dimensional or unclear
- **-8 points**: Supporting characters serve only as "validators" without agency
- **-5 points**: Character decisions don't follow established logic

### Pacing Issues
- **-10 points**: Discovery/setup phase takes >40% of the script
- **-8 points**: "Staccato" pacing - too many very short scenes (2-3 lines) without rhythm variation
- **-5 points**: Transitions between scenes are jarring or unmotivated
- **-5 points**: Choppy scene structure prevents emotional immersion

### Visual Storytelling
- **-8 points**: Reliance on dialogue to convey what should be visual
- **-5 points**: Missed opportunities for "show don't tell" moments
- **-5 points**: Lack of visual motifs or recurring imagery

### Redundancy Issues (CRITICAL - Check carefully)
- **-8 points per instance (max -24)**: Scenes that repeat the same argument/confrontation without escalation
- **-5 points**: Characters have the same conversation multiple times with same outcome
- **-10 points**: Conflict doesn't escalate between repeated confrontations (e.g., warning ignored → warning ignored → warning ignored)

## EVALUATION DIMENSIONS (Score each 1-100 AFTER deductions)

1. **Dialogue Subtext** (weight: 20) - Do characters speak around what they mean? Is there tension between text and subtext?
2. **Structural Integrity** (weight: 20) - Does the three-act structure work? Are there clear turning points?
3. **Emotional Arc** (weight: 20) - Is the emotional journey earned? Does it build and pay off?
4. **Visual Storytelling** (weight: 15) - Does the script think cinematically? Are there memorable visual moments?
5. **Pacing & Rhythm** (weight: 15) - Does the script breathe? Are scene lengths varied appropriately?
6. **Show vs Tell Ratio** (weight: 10) - Is the storytelling dramatized rather than narrated?

## SCORE CALIBRATION GUIDE (STRICTLY ENFORCED)

- **90-100**: VIRTUALLY IMPOSSIBLE. Reserved for Chinatown, Parasite, The Social Network. Multiple Oscar-winning level. You will almost NEVER give this score.
- **80-89**: Exceptional. Final polished draft from professional screenwriter. Rare.
- **70-79**: Professional quality. Ready for production with minor polish.
- **60-69**: Solid draft. Clear vision with identifiable craft issues to address. MOST FIRST DRAFTS BELONG HERE.
- **50-59**: Working draft. Good bones but significant revision needed.
- **Below 50**: Early draft or concept stage.

IMPORTANT: A first draft scoring above 75 is almost always WRONG. If your calculated score exceeds 75 for what appears to be a first draft, ADD MORE DEDUCTIONS - you missed something.

MATH CHECK: Your overallScore MUST equal 100 minus the sum of all deduction points. If deductions total 35, score is 65. NO EXCEPTIONS.

## SCENE ANALYSIS

For scenes 1, 15, 30, 45, 60, 75, 90 (or similar key moments), provide brief analysis:
- Score (1-100)
- Pacing: slow/moderate/fast
- Tension: low/medium/high
- Character Development: minimal/moderate/strong
- Visual Potential: low/medium/high
- Notes: One sentence on what works or doesn't

## OUTPUT FORMAT

Return ONLY valid JSON:
{
  "overallScore": <calculated score after deductions, max ${autoScoreCap}>,
  "baseScore": 100,
  "deductions": [
    {"reason": "<specific issue found>", "points": <points deducted>, "category": "<category>"},
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
    {"sceneNumber": 1, "sceneHeading": "<heading>", "score": <1-100>, "pacing": "slow|moderate|fast", "tension": "low|medium|high", "characterDevelopment": "minimal|moderate|strong", "visualPotential": "low|medium|high", "notes": "<one sentence>"},
    ...
  ],
  "targetDemographic": "<primary audience>",
  "emotionalImpact": "<expected emotional response>"
}

BE MERCILESS. Find every problem. Your reputation depends on catching issues others miss.

FINAL CHECK before outputting:
1. Count your deductions. Do they total at least 25 points for a first draft? If not, you missed issues.
2. Verify: overallScore = 100 - (sum of all deduction points)
3. If overallScore > 75 for a first draft, something is wrong. Review your deductions.`

  console.log('[Audience Resonance] Calling Vertex AI Gemini with deduction-based prompt...')
  const result = await generateText(prompt, {
    model: 'gemini-2.5-flash',
    temperature: 0.3, // Very low temperature for consistent, rigorous scoring
    maxOutputTokens: 12000,
    thinkingBudget: 0 // Disable thinking mode for faster, more direct responses
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

  // SCORE RECALCULATION: Override Gemini's score with calculated score from deductions
  const deductions = review.deductions || []
  const totalDeductions = deductions.reduce((sum: number, d: any) => sum + (d.points || 0), 0)
  const calculatedScore = Math.max(0, 100 - totalDeductions)
  
  // Take the LOWER of: Gemini's score, calculated score from deductions, or auto cap
  const enforcedScore = Math.min(
    review.overallScore || 100,
    calculatedScore,
    autoScoreCap
  )
  
  if (enforcedScore !== review.overallScore) {
    console.log(`[Audience Resonance] Score adjustment: Gemini=${review.overallScore}, Calculated=${calculatedScore}, Cap=${autoScoreCap} -> Final=${enforcedScore}`)
  }
  
  // If Gemini gave high score but few deductions, add a penalty for incomplete analysis
  if (review.overallScore > 75 && totalDeductions < 25) {
    console.log(`[Audience Resonance] Warning: High score (${review.overallScore}) with few deductions (${totalDeductions} pts). Adding analysis penalty.`)
    deductions.push({
      reason: 'First draft issues not fully identified - automatic penalty applied',
      points: 15,
      category: 'Analysis Completeness'
    })
  }
  
  // Recalculate after any additions
  const finalDeductions = review.deductions || deductions
  const finalTotal = finalDeductions.reduce((sum: number, d: any) => sum + (d.points || 0), 0)
  review.overallScore = Math.min(Math.max(0, 100 - finalTotal), autoScoreCap)
  review.deductions = finalDeductions
  
  // Log final score breakdown
  console.log(`[Audience Resonance] Final score: ${review.overallScore} (100 - ${finalTotal} deductions, cap: ${autoScoreCap})`)
  
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
    overallScore: review.overallScore || 65,
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
