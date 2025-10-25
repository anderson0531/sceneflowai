import { NextRequest, NextResponse } from 'next/server'

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
  }
}

interface Recommendation {
  id: string
  category: 'pacing' | 'dialogue' | 'visual' | 'character' | 'emotion' | 'clarity'
  priority: 'high' | 'medium' | 'low'
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
    console.log('[Scene Analysis] API Key present:', !!process.env.GOOGLE_GEMINI_API_KEY)

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
      overallScore
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
}> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) throw new Error('Google API key not configured')

  const dialogueText = scene.dialogue?.map((d: any) => `${d.character}: ${d.text}`).join('\n') || 'No dialogue'
  const previousSceneText = context.previousScene ? 
    `Previous: ${context.previousScene.heading || 'Untitled'} - ${context.previousScene.action?.substring(0, 100) || 'No action'}...` : 
    'No previous scene'
  const nextSceneText = context.nextScene ? 
    `Next: ${context.nextScene.heading || 'Untitled'} - ${context.nextScene.action?.substring(0, 100) || 'No action'}...` : 
    'No next scene'

  const prompt = `You are an expert film director analyzing a scene. Provide specific, actionable recommendations for improvement.

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

For each issue found, provide:
- Specific problem identified
- Before/after text examples
- Clear rationale for the change
- Expected impact on the scene

Format as JSON with this exact structure:
{
  "score": 75,
  "recommendations": [
    {
      "id": "pacing-1",
      "category": "pacing",
      "priority": "high",
      "title": "Tighten Opening",
      "description": "The scene opening is too slow and loses momentum",
      "before": "Current opening text...",
      "after": "Revised opening text...",
      "rationale": "Faster opening creates immediate engagement and maintains audience attention",
      "impact": "Will increase scene energy by 40% and improve pacing flow"
    }
  ]
}

Focus on practical, implementable suggestions that a director would give to improve the scene.`

  console.log('[Director Analysis] Sending prompt (first 500 chars):', prompt.substring(0, 500))
  console.log('[Director Analysis] API endpoint:', `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`)

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096
        }
      })
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[Scene Analysis] Gemini API error:', response.status, errorText)
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  console.log('[Director Analysis] Full API response:', JSON.stringify(data, null, 2))
  console.log('[Director Analysis] Candidates:', data.candidates)
  console.log('[Director Analysis] First candidate:', data.candidates?.[0])

  const analysisText = data.candidates?.[0]?.content?.parts?.[0]?.text

  if (!analysisText) {
    console.error('[Director Analysis] No text found in response')
    console.error('[Director Analysis] Response structure:', {
      hasCandidates: !!data.candidates,
      candidatesLength: data.candidates?.length,
      firstCandidate: data.candidates?.[0],
      hasContent: !!data.candidates?.[0]?.content,
      hasParts: !!data.candidates?.[0]?.content?.parts,
      partsLength: data.candidates?.[0]?.content?.parts?.length
    })
    throw new Error('No analysis generated from Gemini')
  }

  // Check if response was blocked by safety filters
  if (data.candidates?.[0]?.finishReason === 'SAFETY') {
    console.error('[Director Analysis] Response blocked by safety filters')
    console.error('[Director Analysis] Safety ratings:', data.candidates[0].safetyRatings)
    throw new Error('Analysis blocked by content safety filters')
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

  try {
    const analysis = JSON.parse(jsonText)
    return {
      score: analysis.score || 75,
      recommendations: analysis.recommendations || []
    }
  } catch (parseError) {
    console.error('[Director Analysis] JSON parse error:', parseError)
    console.error('[Director Analysis] Failed to parse text:', jsonText)
    throw new Error('Failed to parse director analysis JSON')
  }
}

async function generateAudienceAnalysis(scene: any, context: any): Promise<{
  score: number
  recommendations: Recommendation[]
}> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) throw new Error('Google API key not configured')

  const dialogueText = scene.dialogue?.map((d: any) => `${d.character}: ${d.text}`).join('\n') || 'No dialogue'

  const prompt = `You are a film critic representing audience perspective. Analyze this scene for entertainment value and emotional impact.

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

For each issue found, provide:
- Specific problem identified
- Before/after text examples
- Clear rationale for the change
- Expected impact on audience engagement

Format as JSON with this exact structure:
{
  "score": 78,
  "recommendations": [
    {
      "id": "emotion-1",
      "category": "emotion",
      "priority": "high",
      "title": "Add Emotional Stakes",
      "description": "Scene lacks emotional connection for audience",
      "before": "Current text...",
      "after": "Revised text with emotional stakes...",
      "rationale": "Audiences need to care about what happens to connect emotionally",
      "impact": "Will increase audience engagement by 60% and emotional investment"
    }
  ]
}

Focus on what audiences will love and what will make them more engaged with the story.`

  console.log('[Audience Analysis] Sending prompt (first 500 chars):', prompt.substring(0, 500))
  console.log('[Audience Analysis] API endpoint:', `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`)

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096
        }
      })
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[Scene Analysis] Gemini API error:', response.status, errorText)
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  console.log('[Audience Analysis] Full API response:', JSON.stringify(data, null, 2))
  console.log('[Audience Analysis] Candidates:', data.candidates)
  console.log('[Audience Analysis] First candidate:', data.candidates?.[0])

  const analysisText = data.candidates?.[0]?.content?.parts?.[0]?.text

  if (!analysisText) {
    console.error('[Audience Analysis] No text found in response')
    console.error('[Audience Analysis] Response structure:', {
      hasCandidates: !!data.candidates,
      candidatesLength: data.candidates?.length,
      firstCandidate: data.candidates?.[0],
      hasContent: !!data.candidates?.[0]?.content,
      hasParts: !!data.candidates?.[0]?.content?.parts,
      partsLength: data.candidates?.[0]?.content?.parts?.length
    })
    throw new Error('No analysis generated from Gemini')
  }

  // Check if response was blocked by safety filters
  if (data.candidates?.[0]?.finishReason === 'SAFETY') {
    console.error('[Audience Analysis] Response blocked by safety filters')
    console.error('[Audience Analysis] Safety ratings:', data.candidates[0].safetyRatings)
    throw new Error('Analysis blocked by content safety filters')
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

  try {
    const analysis = JSON.parse(jsonText)
    return {
      score: analysis.score || 78,
      recommendations: analysis.recommendations || []
    }
  } catch (parseError) {
    console.error('[Audience Analysis] JSON parse error:', parseError)
    console.error('[Audience Analysis] Failed to parse text:', jsonText)
    throw new Error('Failed to parse audience analysis JSON')
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
