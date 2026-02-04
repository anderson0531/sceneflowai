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

  const prompt = `You are an expert screenplay analyst using a DEDUCTION-BASED RUBRIC system. Your job is to find specific craft issues and apply point penalties.

CRITICAL INSTRUCTION: You are NOT here to praise the script. You are here to find problems. Start at 100 and DEDUCT points for every issue you find.

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
- **-8 points**: "Staccato" pacing - too many very short scenes without rhythm variation
- **-5 points**: Transitions between scenes are jarring or unmotivated

### Visual Storytelling
- **-8 points**: Reliance on dialogue to convey what should be visual
- **-5 points**: Missed opportunities for "show don't tell" moments
- **-5 points**: Lack of visual motifs or recurring imagery

## EVALUATION DIMENSIONS (Score each 1-100 AFTER deductions)

1. **Dialogue Subtext** (weight: 20) - Do characters speak around what they mean? Is there tension between text and subtext?
2. **Structural Integrity** (weight: 20) - Does the three-act structure work? Are there clear turning points?
3. **Emotional Arc** (weight: 20) - Is the emotional journey earned? Does it build and pay off?
4. **Visual Storytelling** (weight: 15) - Does the script think cinematically? Are there memorable visual moments?
5. **Pacing & Rhythm** (weight: 15) - Does the script breathe? Are scene lengths varied appropriately?
6. **Show vs Tell Ratio** (weight: 10) - Is the storytelling dramatized rather than narrated?

## SCORE CALIBRATION GUIDE

- **90-100**: Masterwork level. Chinatown, Parasite, The Social Network. Virtually no craft issues.
- **80-89**: Professional quality. Ready for production with minor polish. Most produced films.
- **70-79**: Solid draft. Clear vision with identifiable craft issues to address.
- **60-69**: Working draft. Good bones but significant revision needed.
- **50-59**: Early draft. Core concept works but execution needs substantial work.
- **Below 50**: Concept stage. Fundamental storytelling issues throughout.

A typical FIRST DRAFT should score 55-70. A polished spec script 70-80. Only exceptional work exceeds 85.

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

BE RIGOROUS. Find the problems. A 94 is reserved for scripts that rival Oscar winners.`

  console.log('[Audience Resonance] Calling Vertex AI Gemini with deduction-based prompt...')
  const result = await generateText(prompt, {
    model: 'gemini-2.5-flash',
    temperature: 0.5, // Lower temperature for more consistent scoring
    maxOutputTokens: 12000
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

  // Validate and enforce score cap
  if (review.overallScore > autoScoreCap) {
    console.log(`[Audience Resonance] Enforcing score cap: ${review.overallScore} -> ${autoScoreCap}`)
    review.overallScore = autoScoreCap
    if (!review.deductions) review.deductions = []
    review.deductions.push({
      reason: autoCapReason,
      points: 100 - autoScoreCap,
      category: 'Show vs Tell'
    })
  }
  
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
