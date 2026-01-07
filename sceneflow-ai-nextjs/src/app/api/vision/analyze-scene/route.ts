import { NextRequest, NextResponse } from 'next/server'
import { 
  RecommendationPriority, 
  PRIORITY_SCORE_WEIGHTS 
} from '@/types/story'
import {
  generateDirectorCriteriaPrompt,
  generateAudienceCriteriaPrompt,
  calculateScoreFloor,
  getScoreTier
} from '@/lib/review-criteria'
import { generateText } from '@/lib/vertexai/gemini'

export const maxDuration = 60
export const runtime = 'nodejs'

interface SceneAnalysisRequest {
  projectId: string
  sceneIndex: number
  scene: {
    heading: string
    action: string
    narration?: string
    dialogue?: Array<{ character: string; text: string }>
    music?: string
    sfx?: string[]
  }
  context: {
    previousScene?: any
    nextScene?: any
    characters: any[]
    scriptReview?: { director: any; audience: any }
    // Previous analysis context for scoring consistency and stabilization
    previousAnalysis?: {
      score: number
      directorScore?: number
      audienceScore?: number
      appliedRecommendations?: Array<{ id: string; priority: RecommendationPriority }> // Enhanced with priority
      appliedRecommendationIds?: string[]
      iterationCount?: number
    }
  }
}

interface Recommendation {
  id: string
  category: 'pacing' | 'dialogue' | 'visual' | 'character' | 'emotion' | 'clarity'
  priority: RecommendationPriority // Enhanced: critical | high | medium | optional
  title: string
  description: string
  before: string
  after: string
  rationale: string
  impact: string
}

interface QuickFix {
  id: string
  label: string
  instruction: string
  icon: string
}

interface SceneAnalysisResponse {
  directorRecommendations: Recommendation[]
  audienceRecommendations: Recommendation[]
  quickFixes: QuickFix[]
  overallScore: number
  directorScore: number
  audienceScore: number
  categoryScores?: {
    director: Array<{ category: string; score: number; weight: number }>
    audience: Array<{ category: string; score: number; weight: number }>
  }
  iteration: number
  scoreFloor: number
}

export async function POST(req: NextRequest) {
  try {
    const { projectId, sceneIndex, scene, context }: SceneAnalysisRequest = await req.json()

    if (!projectId || sceneIndex === undefined || !scene) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    console.log('[Scene Analysis] Analyzing scene:', sceneIndex, 'for project:', projectId)
    console.log('[Scene Analysis] Scene data:', JSON.stringify(scene, null, 2))
    console.log('[Scene Analysis] API Key present:', !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY))

    // Generate both director and audience analysis
    let directorAnalysis, audienceAnalysis
    try {
      [directorAnalysis, audienceAnalysis] = await Promise.all([
        generateDirectorAnalysis(scene, context),
        generateAudienceAnalysis(scene, context)
      ])
    } catch (error) {
      console.error('[Scene Analysis] Generation error:', error)
      return NextResponse.json(
        { 
          error: 'Failed to generate scene analysis', 
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      )
    }

    // Generate quick fixes
    const quickFixes = generateQuickFixes(scene)

    // Calculate overall score
    const overallScore = Math.round(
      (directorAnalysis.score + audienceAnalysis.score) / 2
    )

    const response: SceneAnalysisResponse = {
      directorRecommendations: directorAnalysis.recommendations,
      audienceRecommendations: audienceAnalysis.recommendations,
      quickFixes,
      overallScore,
      directorScore: directorAnalysis.score,
      audienceScore: audienceAnalysis.score
    }

    return NextResponse.json({
      success: true,
      analysis: response,
      generatedAt: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('[Scene Analysis] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to analyze scene' },
      { status: 500 }
    )
  }
}

async function generateDirectorAnalysis(scene: any, context: any): Promise<{
  score: number
  recommendations: Recommendation[]
  categoryScores?: Array<{ category: string; score: number; weight: number }>
  scoreFloor: number
  iteration: number
}> {

  const dialogueText = scene.dialogue?.map((d: any) => `${d.character}: ${d.text}`).join('\n') || 'No dialogue'
  const previousSceneText = context.previousScene ? 
    `Previous: ${context.previousScene.heading || 'Untitled'} - ${context.previousScene.action?.substring(0, 100) || 'No action'}...` : 
    'No previous scene'
  const nextSceneText = context.nextScene ? 
    `Next: ${context.nextScene.heading || 'Untitled'} - ${context.nextScene.action?.substring(0, 100) || 'No action'}...` : 
    'No next scene'

  // Enhanced score stabilization with priority-weighted floor calculation
  const previousScore = context.previousAnalysis?.directorScore || context.previousAnalysis?.score || 0
  const iterationCount = (context.previousAnalysis?.iterationCount || 0) + 1
  const appliedRecs = context.previousAnalysis?.appliedRecommendations || []
  const appliedRecIds = context.previousAnalysis?.appliedRecommendationIds || []
  
  // Calculate score floor based on priority weights: Critical +5, High +3, Medium +2, Optional +1
  let scoreFloorIncrement = 0
  if (Array.isArray(appliedRecs) && appliedRecs.length > 0) {
    for (const rec of appliedRecs) {
      const priority = typeof rec === 'object' ? rec.priority : 'medium'
      scoreFloorIncrement += PRIORITY_SCORE_WEIGHTS[priority as RecommendationPriority] || 2
    }
  } else if (appliedRecIds.length > 0) {
    // Fallback: assume medium priority for legacy IDs
    scoreFloorIncrement = appliedRecIds.length * 2
  }
  
  const scoreFloor = scoreFloorIncrement > 0 ? Math.min(92, previousScore + scoreFloorIncrement) : 0
  const isConverged = iterationCount >= 3 && (appliedRecs.length > 0 || appliedRecIds.length > 0)
  
  console.log('[Director Analysis] Score stabilization:', { previousScore, iterationCount, appliedRecs: appliedRecs.length, scoreFloor, isConverged })

  // Build previous analysis context with enhanced scoring rules
  const previousScoreContext = context.previousAnalysis ? `
SCORE STABILIZATION CONTEXT:
- Previous Director Score: ${previousScore}/100
- Analysis Iteration: ${iterationCount}
- Applied Recommendations: ${appliedRecs.length || appliedRecIds.length} recommendation(s) were implemented
- Score Floor: ${scoreFloor} (score MUST NOT drop below this value)
- Applied Recommendation IDs to EXCLUDE: ${appliedRecIds.join(', ') || 'none'}

CRITICAL SCORING RULES:
1. Score MUST be >= ${scoreFloor} since the user applied recommendations
2. Do NOT re-suggest recommendations with these IDs: ${appliedRecIds.join(', ')}
3. Only suggest NEW issues not previously identified
4. ${isConverged ? 'CONVERGENCE MODE: After 3+ iterations, assume quality is acceptable. Score should be 90+ unless there is a CRITICAL NEW issue. Return empty recommendations array if no critical issues remain.' : 'Focus on remaining high-impact issues only.'}
5. Weight your recommendations by priority:
   - CRITICAL: Fundamental issues that break the scene (rare)
   - HIGH: Significant issues affecting quality
   - MEDIUM: Noticeable improvements worth making
   - OPTIONAL: Nice-to-have polish suggestions
` : ''

  // Use structured criteria from review-criteria.ts
  const criteriaPrompt = generateDirectorCriteriaPrompt()

  const prompt = `You are an expert film director analyzing a scene. Provide specific, actionable recommendations for improvement.

${previousScoreContext}

SCENE TO ANALYZE:
Heading: ${scene.heading || 'Untitled Scene'}
Action: ${scene.action || 'No action description'}
Narration: ${scene.narration || 'No narration'}
Dialogue:
${dialogueText}
Music: ${scene.music || 'No music specified'}
SFX: ${scene.sfx?.join(', ') || 'No sound effects'}

CONTEXT:
${previousSceneText}
${nextSceneText}

Characters: ${context.characters?.map((c: any) => c.name).join(', ') || 'No characters'}

DIRECTOR'S PERSPECTIVE - Analyze for:
1. Pacing & Rhythm (scene flow, timing, momentum)
2. Visual Storytelling (cinematic potential, shot opportunities, visual elements)
3. Character Development (arc progression, motivation clarity, depth)
4. Technical Execution (scene structure, transitions, production feasibility)
5. Dialogue Quality (natural flow, character voice, subtext, purpose)

SCORING RUBRIC (be generous - assume the writer is competent):
- 95-100: Excellent. No issues or only trivial polish suggestions. Ready for production.
- 90-94: Very Good. Minor refinements possible but scene works well. Most scenes should fall here.
- 85-89: Good. A few noticeable issues but fundamentally solid.
- 80-84: Needs Work. Multiple issues that affect scene quality.
- 70-79: Significant Issues. Structural or major problems need addressing.
- Below 70: Major Rewrite Needed. Fundamental problems with the scene.

IMPORTANT SCORING GUIDANCE:
- If your recommendations are minor polish or "nice to have" improvements, score should be 90+
- Only give scores below 85 if there are genuine structural, clarity, or quality problems
- The presence of recommendations does NOT automatically mean a low score
- A scene can be very good (90+) while still having room for optional improvements

For each issue found, provide:
- Specific problem identified
- Before/after text examples
- Clear rationale for the change
- Expected impact on the scene

Format as JSON with this exact structure:
{
  "score": 92,
  "recommendations": [
    {
      "id": "pacing-1",
      "category": "pacing",
      "priority": "medium",
      "title": "Tighten Opening",
      "description": "The scene opening could be slightly tighter for better momentum",
      "before": "Current opening text...",
      "after": "Revised opening text...",
      "rationale": "A more concise opening creates immediate engagement",
      "impact": "Minor improvement to scene energy and pacing flow"
    }
  ]
}

Focus on practical, implementable suggestions that a director would give to improve the scene.

IMPORTANT: Be concise and focused. Provide 2-3 high-impact recommendations maximum. Remember: recommendations for polish don't mean the scene is bad - score generously!`

  console.log('[Director Analysis] Sending prompt (first 500 chars):', prompt.substring(0, 500))
  console.log('[Director Analysis] Calling Vertex AI Gemini...')

  const result = await generateText(prompt, {
    model: 'gemini-2.0-flash',
    temperature: 0.3,  // Lower temperature for scoring consistency
    maxOutputTokens: 8192  // Doubled to accommodate longer responses
  })

  console.log('[Director Analysis] Response received, finishReason:', result.finishReason)

  const analysisText = result.text

  if (!analysisText) {
    console.error('[Director Analysis] No text found in response')
    throw new Error('No analysis generated from Gemini')
  }

  // Check if response was blocked by safety filters
  if (result.finishReason === 'SAFETY') {
    console.error('[Director Analysis] Response blocked by safety filters')
    console.error('[Director Analysis] Safety ratings:', result.safetyRatings)
    throw new Error('Analysis blocked by content safety filters')
  }

  // Check if response was truncated
  if (result.finishReason === 'MAX_TOKENS') {
    console.warn('[Director Analysis] Response truncated due to MAX_TOKENS')
  }

  // Extract JSON from markdown code blocks if present
  console.log('[Director Analysis] Raw response text:', analysisText.substring(0, 200))
  let jsonText = analysisText.trim()

  // Try multiple extraction methods
  const codeBlockMatch = jsonText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  if (codeBlockMatch) {
    jsonText = codeBlockMatch[1].trim()
    console.log('[Director Analysis] Extracted from code block')
  } else if (jsonText.startsWith('```')) {
    // Fallback: manually strip code block markers
    jsonText = jsonText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim()
    console.log('[Director Analysis] Manually stripped code blocks')
  }

  console.log('[Director Analysis] JSON to parse:', jsonText.substring(0, 200))

  // Try to repair truncated JSON if needed
  if (data.candidates?.[0]?.finishReason === 'MAX_TOKENS' && !jsonText.trim().endsWith('}')) {
    console.log('[Director Analysis] Attempting to repair truncated JSON')
    // Count open braces/brackets and close them
    const openBraces = (jsonText.match(/{/g) || []).length
    const closeBraces = (jsonText.match(/}/g) || []).length
    const openBrackets = (jsonText.match(/\[/g) || []).length
    const closeBrackets = (jsonText.match(/\]/g) || []).length
    
    // Close any open strings
    const quoteCount = (jsonText.match(/"/g) || []).length
    if (quoteCount % 2 !== 0) {
      jsonText += '"'
    }
    
    // Close open brackets and braces
    for (let i = 0; i < (openBrackets - closeBrackets); i++) {
      jsonText += ']'
    }
    for (let i = 0; i < (openBraces - closeBraces); i++) {
      jsonText += '}'
    }
    
    console.log('[Director Analysis] Repaired JSON (last 200 chars):', jsonText.slice(-200))
  }

  try {
    const analysis = JSON.parse(jsonText)
    const rawScore = analysis.score || 75
    
    // Enforce score floor for stabilization
    const finalScore = Math.max(rawScore, scoreFloor)
    if (finalScore !== rawScore) {
      console.log(`[Director Analysis] Score floor enforced: ${rawScore} -> ${finalScore}`)
    }
    
    // Filter out previously-applied recommendations by ID or title match
    let filteredRecs = (analysis.recommendations || []).filter((rec: Recommendation) => {
      const recId = rec.id?.toLowerCase() || ''
      const recTitle = rec.title?.toLowerCase() || ''
      const isApplied = appliedRecIds.some((appliedId: string) => {
        const appliedLower = appliedId.toLowerCase()
        return recId.includes(appliedLower) || 
               appliedLower.includes(recId) ||
               recTitle.includes(appliedLower)
      })
      if (isApplied) {
        console.log(`[Director Analysis] Filtered out already-applied recommendation: ${rec.id}`)
      }
      return !isApplied
    })
    
    // If score is 90+ or converged, only keep high-priority issues (max 2)
    if (finalScore >= 90 || isConverged) {
      filteredRecs = filteredRecs
        .filter((rec: Recommendation) => rec.priority === 'high')
        .slice(0, 2)
      if (isConverged && filteredRecs.length === 0) {
        console.log('[Director Analysis] Convergence reached - no recommendations needed')
      }
    }
    
    return {
      score: finalScore,
      recommendations: filteredRecs
    }
  } catch (parseError) {
    console.error('[Director Analysis] JSON parse error:', parseError)
    console.error('[Director Analysis] Failed to parse text:', jsonText)
    
    // Return minimal valid response instead of failing completely
    // Use score floor if available, otherwise default to 70
    console.warn('[Director Analysis] Returning fallback response due to parse error')
    return {
      score: Math.max(70, scoreFloor),
      recommendations: [
        {
          id: 'fallback-1',
          category: 'clarity',
          priority: 'medium',
          title: 'Scene Analysis Unavailable',
          description: 'The AI analysis could not be completed. Please try again or use Direct Edit mode.',
          before: '',
          after: '',
          rationale: 'Analysis service temporarily unavailable',
          impact: 'N/A'
        }
      ]
    }
  }
}

async function generateAudienceAnalysis(scene: any, context: any): Promise<{
  score: number
  recommendations: Recommendation[]
  categoryScores?: Array<{ category: string; score: number; weight: number }>
  scoreFloor: number
  iteration: number
}> {
  const dialogueText = scene.dialogue?.map((d: any) => `${d.character}: ${d.text}`).join('\n') || 'No dialogue'

  // Enhanced score stabilization with priority-weighted floor calculation
  const previousScore = context.previousAnalysis?.audienceScore || context.previousAnalysis?.score || 0
  const iterationCount = (context.previousAnalysis?.iterationCount || 0) + 1
  const appliedRecs = context.previousAnalysis?.appliedRecommendations || []
  const appliedRecIds = context.previousAnalysis?.appliedRecommendationIds || []
  
  // Calculate score floor based on priority weights: Critical +5, High +3, Medium +2, Optional +1
  let scoreFloorIncrement = 0
  if (Array.isArray(appliedRecs) && appliedRecs.length > 0) {
    for (const rec of appliedRecs) {
      const priority = typeof rec === 'object' ? rec.priority : 'medium'
      scoreFloorIncrement += PRIORITY_SCORE_WEIGHTS[priority as RecommendationPriority] || 2
    }
  } else if (appliedRecIds.length > 0) {
    // Fallback: assume medium priority for legacy IDs
    scoreFloorIncrement = appliedRecIds.length * 2
  }
  
  const scoreFloor = scoreFloorIncrement > 0 ? Math.min(92, previousScore + scoreFloorIncrement) : 0
  const isConverged = iterationCount >= 3 && (appliedRecs.length > 0 || appliedRecIds.length > 0)
  
  console.log('[Audience Analysis] Score stabilization:', { previousScore, iterationCount, appliedRecs: appliedRecs.length, scoreFloor, isConverged })

  // Build previous analysis context with enhanced scoring rules
  const previousScoreContext = context.previousAnalysis ? `
SCORE STABILIZATION CONTEXT:
- Previous Audience Score: ${previousScore}/100
- Analysis Iteration: ${iterationCount}
- Applied Recommendations: ${appliedRecs.length || appliedRecIds.length} recommendation(s) were implemented
- Score Floor: ${scoreFloor} (score MUST NOT drop below this value)
- Applied Recommendation IDs to EXCLUDE: ${appliedRecIds.join(', ') || 'none'}

CRITICAL SCORING RULES:
1. Score MUST be >= ${scoreFloor} since the user applied recommendations
2. Do NOT re-suggest recommendations with these IDs: ${appliedRecIds.join(', ')}
3. Only suggest NEW issues not previously identified
4. ${isConverged ? 'CONVERGENCE MODE: After 3+ iterations, assume quality is acceptable. Score should be 90+ unless there is a CRITICAL NEW issue. Return empty recommendations array if no critical issues remain.' : 'Focus on remaining high-impact issues only.'}
5. Weight your recommendations by priority:
   - CRITICAL: Fundamental issues that break audience engagement (rare)
   - HIGH: Significant issues affecting audience connection
   - MEDIUM: Noticeable improvements worth making
   - OPTIONAL: Nice-to-have polish suggestions
` : ''

  const prompt = `You are a film critic representing audience perspective. Analyze this scene for entertainment value and emotional impact.

${previousScoreContext}

SCENE TO ANALYZE:
Heading: ${scene.heading || 'Untitled Scene'}
Action: ${scene.action || 'No action description'}
Narration: ${scene.narration || 'No narration'}
Dialogue:
${dialogueText}
Music: ${scene.music || 'No music specified'}
SFX: ${scene.sfx?.join(', ') || 'No sound effects'}

AUDIENCE PERSPECTIVE - Analyze for:
1. Entertainment Value (engaging, compelling, holds attention)
2. Emotional Impact (resonance, connection, emotional journey)
3. Clarity & Accessibility (easy to follow, understandable, clear stakes)
4. Character Relatability (audience connection, likable characters, investment)
5. Satisfying Payoff (fulfilling conclusion, resolution, closure)

SCORING RUBRIC (be generous - assume the writer is competent):
- 95-100: Excellent. Highly engaging, emotionally resonant, audience will love it.
- 90-94: Very Good. Entertaining and clear with minor polish opportunities. Most scenes should fall here.
- 85-89: Good. Engaging but with a few areas that could connect better with audiences.
- 80-84: Needs Work. Some disconnect with audience or clarity issues.
- 70-79: Significant Issues. Audience may struggle to engage or follow the scene.
- Below 70: Major Rewrite Needed. Fundamental engagement or clarity problems.

IMPORTANT SCORING GUIDANCE:
- If your recommendations are minor polish or "nice to have" improvements, score should be 90+
- Only give scores below 85 if there are genuine engagement, clarity, or connection problems
- The presence of recommendations does NOT automatically mean a low score
- A scene can be very good (90+) while still having room for optional improvements

For each issue found, provide:
- Specific problem identified
- Before/after text examples
- Clear rationale for the change
- Expected impact on audience engagement

Format as JSON with this exact structure:
{
  "score": 91,
  "recommendations": [
    {
      "id": "emotion-1",
      "category": "emotion",
      "priority": "medium",
      "title": "Strengthen Emotional Stakes",
      "description": "Scene could benefit from slightly more emotional grounding",
      "before": "Current text...",
      "after": "Revised text with emotional stakes...",
      "rationale": "Adding a small emotional beat helps audiences connect more deeply",
      "impact": "Minor improvement to audience engagement and emotional investment"
    }
  ]
}

Focus on what audiences will love and what will make them more engaged with the story.

IMPORTANT: Be concise and focused. Provide 2-3 high-impact recommendations maximum. Remember: recommendations for polish don't mean the scene is bad - score generously!`

  console.log('[Audience Analysis] Sending prompt (first 500 chars):', prompt.substring(0, 500))
  console.log('[Audience Analysis] Calling Vertex AI Gemini...')

  const result = await generateText(prompt, {
    model: 'gemini-2.0-flash',
    temperature: 0.3,  // Lower temperature for scoring consistency
    maxOutputTokens: 8192  // Doubled to accommodate longer responses
  })

  console.log('[Audience Analysis] Response received, finishReason:', result.finishReason)

  const analysisText = result.text

  if (!analysisText) {
    console.error('[Audience Analysis] No text found in response')
    throw new Error('No analysis generated from Gemini')
  }

  // Check if response was blocked by safety filters
  if (result.finishReason === 'SAFETY') {
    console.error('[Audience Analysis] Response blocked by safety filters')
    console.error('[Audience Analysis] Safety ratings:', result.safetyRatings)
    throw new Error('Analysis blocked by content safety filters')
  }

  // Check if response was truncated
  if (result.finishReason === 'MAX_TOKENS') {
    console.warn('[Audience Analysis] Response truncated due to MAX_TOKENS')
  }

  // Extract JSON from markdown code blocks if present
  console.log('[Audience Analysis] Raw response text:', analysisText.substring(0, 200))
  let jsonText = analysisText.trim()

  // Try multiple extraction methods
  const codeBlockMatch = jsonText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  if (codeBlockMatch) {
    jsonText = codeBlockMatch[1].trim()
    console.log('[Audience Analysis] Extracted from code block')
  } else if (jsonText.startsWith('```')) {
    // Fallback: manually strip code block markers
    jsonText = jsonText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim()
    console.log('[Audience Analysis] Manually stripped code blocks')
  }

  console.log('[Audience Analysis] JSON to parse:', jsonText.substring(0, 200))

  // Try to repair truncated JSON if needed
  if (result.finishReason === 'MAX_TOKENS' && !jsonText.trim().endsWith('}')) {
    console.log('[Audience Analysis] Attempting to repair truncated JSON')
    // Count open braces/brackets and close them
    const openBraces = (jsonText.match(/{/g) || []).length
    const closeBraces = (jsonText.match(/}/g) || []).length
    const openBrackets = (jsonText.match(/\[/g) || []).length
    const closeBrackets = (jsonText.match(/\]/g) || []).length
    
    // Close any open strings
    const quoteCount = (jsonText.match(/"/g) || []).length
    if (quoteCount % 2 !== 0) {
      jsonText += '"'
    }
    
    // Close open brackets and braces
    for (let i = 0; i < (openBrackets - closeBrackets); i++) {
      jsonText += ']'
    }
    for (let i = 0; i < (openBraces - closeBraces); i++) {
      jsonText += '}'
    }
    
    console.log('[Audience Analysis] Repaired JSON (last 200 chars):', jsonText.slice(-200))
  }

  try {
    const analysis = JSON.parse(jsonText)
    const rawScore = analysis.score || 78
    
    // Enforce score floor for stabilization
    const finalScore = Math.max(rawScore, scoreFloor)
    if (finalScore !== rawScore) {
      console.log(`[Audience Analysis] Score floor enforced: ${rawScore} -> ${finalScore}`)
    }
    
    // Filter out previously-applied recommendations by ID or title match
    let filteredRecs = (analysis.recommendations || []).filter((rec: Recommendation) => {
      const recId = rec.id?.toLowerCase() || ''
      const recTitle = rec.title?.toLowerCase() || ''
      const isApplied = appliedRecIds.some((appliedId: string) => {
        const appliedLower = appliedId.toLowerCase()
        return recId.includes(appliedLower) || 
               appliedLower.includes(recId) ||
               recTitle.includes(appliedLower)
      })
      if (isApplied) {
        console.log(`[Audience Analysis] Filtered out already-applied recommendation: ${rec.id}`)
      }
      return !isApplied
    })
    
    // If score is 90+ or converged, only keep high-priority issues (max 2)
    if (finalScore >= 90 || isConverged) {
      filteredRecs = filteredRecs
        .filter((rec: Recommendation) => rec.priority === 'critical' || rec.priority === 'high')
        .slice(0, 2)
      if (isConverged && filteredRecs.length === 0) {
        console.log('[Audience Analysis] Convergence reached - no recommendations needed')
      }
    }
    
    return {
      score: finalScore,
      recommendations: filteredRecs,
      scoreFloor,
      iteration: iterationCount
    }
  } catch (parseError) {
    console.error('[Audience Analysis] JSON parse error:', parseError)
    console.error('[Audience Analysis] Failed to parse text:', jsonText)
    
    // Return minimal valid response instead of failing completely
    // Use score floor if available, otherwise default to 70
    console.warn('[Audience Analysis] Returning fallback response due to parse error')
    return {
      score: Math.max(70, scoreFloor),
      recommendations: [
        {
          id: 'fallback-1',
          category: 'clarity',
          priority: 'medium',
          title: 'Scene Analysis Unavailable',
          description: 'The AI analysis could not be completed. Please try again or use Direct Edit mode.',
          before: '',
          after: '',
          rationale: 'Analysis service temporarily unavailable',
          impact: 'N/A'
        }
      ],
      scoreFloor,
      iteration: iterationCount
    }
  }
}

function generateQuickFixes(scene: any): QuickFix[] {
  const quickFixes: QuickFix[] = []

  // Check for common issues and provide quick fixes
  if (!scene.dialogue || scene.dialogue.length === 0) {
    quickFixes.push({
      id: 'add-dialogue',
      label: 'Add Dialogue',
      instruction: 'Add character dialogue to make this scene more dynamic and engaging.',
      icon: '💬'
    })
  }

  if (!scene.narration || scene.narration.length < 50) {
    quickFixes.push({
      id: 'expand-narration',
      label: 'Expand Narration',
      instruction: 'Add more detailed narration to enhance visual storytelling and scene atmosphere.',
      icon: '📝'
    })
  }

  if (!scene.music) {
    quickFixes.push({
      id: 'add-music',
      label: 'Add Music',
      instruction: 'Specify background music to enhance the emotional tone of this scene.',
      icon: '🎵'
    })
  }

  if (!scene.sfx || scene.sfx.length === 0) {
    quickFixes.push({
      id: 'add-sfx',
      label: 'Add Sound Effects',
      instruction: 'Add sound effects to make the scene more immersive and realistic.',
      icon: '🔊'
    })
  }

  if (scene.action && scene.action.length < 100) {
    quickFixes.push({
      id: 'expand-action',
      label: 'Expand Action',
      instruction: 'Add more detailed action description to improve visual storytelling.',
      icon: '🎬'
    })
  }

  return quickFixes
}
