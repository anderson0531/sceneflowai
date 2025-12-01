import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60
export const runtime = 'nodejs'

interface OptimizeSceneRequest {
  projectId: string
  scene: any
  context: {
    previousScene?: any
    nextScene?: any
    characters: any[]
  }
}

export async function POST(req: NextRequest) {
  try {
    const { projectId, scene, context }: OptimizeSceneRequest = await req.json()

    if (!projectId || !scene) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    console.log('[Scene Optimization] Optimizing scene for project:', projectId)

    // Generate holistic optimization
    const result = await optimizeScene(scene, context)

    return NextResponse.json({
      success: true,
      ...result,
      generatedAt: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('[Scene Optimization] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to optimize scene' },
      { status: 500 }
    )
  }
}

async function optimizeScene(scene: any, context: any) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) throw new Error('Google API key not configured')

  const dialogueText = scene.dialogue?.map((d: any) => `${d.character}: ${d.text}`).join('\n') || 'No dialogue'
  const previousSceneText = context.previousScene ? 
    `Previous: ${context.previousScene.heading || 'Untitled'} - ${context.previousScene.action?.substring(0, 100) || 'No action'}...` : 
    'No previous scene'
  const nextSceneText = context.nextScene ? 
    `Next: ${context.nextScene.heading || 'Untitled'} - ${context.nextScene.action?.substring(0, 100) || 'No action'}...` : 
    'No next scene'

  const prompt = `You are an expert film director and screenwriting consultant. Optimize this scene holistically for both director and audience perspectives.

SCENE TO OPTIMIZE:
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

OPTIMIZATION TASK:
Optimize this scene for:

1. DIRECTOR PERSPECTIVE:
   - Visual clarity and staging opportunities
   - Pacing and dramatic beats
   - Technical feasibility
   - Strong visual imagery
   - Clear character actions

2. AUDIENCE PERSPECTIVE:
   - Emotional impact and resonance
   - Character connection and relatability
   - Entertainment value and engagement
   - Clear storytelling beats
   - Satisfying scene arc

PROVIDE:
1. A COMPLETE rewritten version of the scene (all elements: heading, action, narration, dialogue, etc.)
2. A detailed "Changes Summary" explaining what you changed and WHY
3. Rationale for each change from both director and audience perspectives

Return JSON with this exact structure:
{
  "optimizedScene": {
    "heading": "INT. LOCATION - TIME",
    "action": "Complete rewritten action...",
    "narration": "Complete rewritten narration...",
    "dialogue": [
      { "character": "CHARACTER NAME", "line": "Optimized dialogue..." }
    ],
    "music": "Music description",
    "sfx": ["SFX description"]
  },
  "changesSummary": [
    {
      "category": "Scene Description and Visual Clarity",
      "changes": "What specifically was changed in the scene...",
      "rationaleDirector": "Why this helps the director (staging, clarity, visuals)...",
      "rationaleAudience": "Why this helps the audience (engagement, emotional impact)..."
    }
  ]
}

Focus on holistic improvement that works together, not piecemeal fixes.
Make every change count toward making the scene more effective overall.`

  console.log('[Scene Optimization] Calling Gemini API...')
  
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192
        }
      })
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[Scene Optimization] Gemini API error:', response.status, errorText)
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  console.log('[Scene Optimization] Received API response')

  const analysisText = data.candidates?.[0]?.content?.parts?.[0]?.text

  if (!analysisText) {
    console.error('[Scene Optimization] No text in response')
    throw new Error('No optimization generated from Gemini')
  }

  // Extract JSON from markdown code blocks if present
  let jsonText = analysisText.trim()
  const codeBlockMatch = jsonText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  if (codeBlockMatch) {
    jsonText = codeBlockMatch[1].trim()
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim()
  }

  try {
    const optimization = JSON.parse(jsonText)
    return optimization
  } catch (parseError) {
    console.error('[Scene Optimization] JSON parse error:', parseError)
    console.error('[Scene Optimization] Failed to parse text:', jsonText.substring(0, 500))
    throw new Error('Failed to parse optimization response')
  }
}

