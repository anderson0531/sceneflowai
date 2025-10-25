import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60
export const runtime = 'nodejs'

interface SceneRevisionRequest {
  projectId: string
  sceneIndex: number
  currentScene: any
  revisionMode: 'recommendations' | 'instruction' | 'hybrid'
  selectedRecommendations?: string[]
  customInstruction?: string
  preserveElements?: ('narration' | 'dialogue' | 'music' | 'sfx')[]
  context: {
    characters: any[]
    previousScene?: any
    nextScene?: any
  }
}

export async function POST(req: NextRequest) {
  try {
    const {
      projectId,
      sceneIndex,
      currentScene,
      revisionMode,
      selectedRecommendations = [],
      customInstruction = '',
      preserveElements = [],
      context
    }: SceneRevisionRequest = await req.json()

    if (!projectId || sceneIndex === undefined || !currentScene) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    console.log('[Scene Revision] Revising scene:', sceneIndex, 'mode:', revisionMode)

    // Generate revised scene based on mode
    const revisedScene = await generateRevisedScene({
      currentScene,
      revisionMode,
      selectedRecommendations,
      customInstruction,
      preserveElements,
      context
    })

    return NextResponse.json({
      success: true,
      revisedScene,
      generatedAt: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('[Scene Revision] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to revise scene' },
      { status: 500 }
    )
  }
}

async function generateRevisedScene({
  currentScene,
  revisionMode,
  selectedRecommendations,
  customInstruction,
  preserveElements,
  context
}: {
  currentScene: any
  revisionMode: string
  selectedRecommendations: string[]
  customInstruction: string
  preserveElements: string[]
  context: any
}): Promise<any> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) throw new Error('Google API key not configured')

  // Build the revision instruction based on mode
  let revisionInstruction = ''
  
  if (revisionMode === 'recommendations' && selectedRecommendations.length > 0) {
    revisionInstruction = `Apply these specific recommendations: ${selectedRecommendations.join(', ')}`
  } else if (revisionMode === 'instruction' && customInstruction) {
    revisionInstruction = customInstruction
  } else if (revisionMode === 'hybrid') {
    revisionInstruction = `Apply recommendations: ${selectedRecommendations.join(', ')}. Additional instruction: ${customInstruction}`
  } else {
    revisionInstruction = 'Improve the scene for better storytelling and audience engagement.'
  }

  // Add preservation instructions
  const preserveInstructions = preserveElements.map(element => {
    switch (element) {
      case 'narration': return 'Keep the existing narration unchanged'
      case 'dialogue': return 'Keep the existing dialogue unchanged'
      case 'music': return 'Keep the existing music specification unchanged'
      case 'sfx': return 'Keep the existing sound effects unchanged'
      default: return ''
    }
  }).filter(Boolean).join('. ')

  const dialogueText = currentScene.dialogue?.map((d: any) => `${d.character}: ${d.text}`).join('\n') || 'No dialogue'
  const characterNames = context.characters?.map((c: any) => c.name).join(', ') || 'No characters'

  const prompt = `You are a professional screenwriter revising a scene. Revise the scene according to the instructions while maintaining continuity and character consistency.

CURRENT SCENE:
Heading: ${currentScene.heading || 'Untitled Scene'}
Action: ${currentScene.action || 'No action description'}
Narration: ${currentScene.narration || 'No narration'}
Dialogue:
${dialogueText}
Music: ${currentScene.music || 'No music specified'}
SFX: ${currentScene.sfx?.join(', ') || 'No sound effects'}

CONTEXT:
Characters: ${characterNames}
Previous Scene: ${context.previousScene?.heading || 'None'}
Next Scene: ${context.nextScene?.heading || 'None'}

REVISION INSTRUCTIONS:
${revisionInstruction}

${preserveInstructions ? `PRESERVATION REQUIREMENTS: ${preserveInstructions}` : ''}

REQUIREMENTS:
1. Maintain the same scene structure and format
2. Keep character names and basic plot points consistent
3. Improve the specified elements while preserving others
4. Ensure smooth transitions from previous scene and to next scene
5. Make dialogue natural and character-appropriate
6. Enhance visual storytelling and emotional impact
7. Keep the scene length appropriate (not too short, not too long)

Output the revised scene as JSON with this exact structure:
{
  "heading": "Revised scene heading",
  "action": "Revised action description with improved visual storytelling",
  "narration": "Revised narration (if not preserved)",
  "dialogue": [
    {"character": "Character Name", "text": "Revised dialogue text"}
  ],
  "music": "Revised music specification (if not preserved)",
  "sfx": ["Revised sound effect 1", "Revised sound effect 2"]
}

Focus on making the scene more engaging, clear, and emotionally impactful while following the revision instructions.`

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
    throw new Error(`Gemini API error: ${response.status}`)
  }

  const data = await response.json()
  const revisedText = data.candidates?.[0]?.content?.parts?.[0]?.text

  if (!revisedText) {
    throw new Error('No revised scene generated from Gemini')
  }

  // Extract JSON from markdown code blocks if present
  let jsonText = revisedText.trim()
  const codeBlockMatch = jsonText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  if (codeBlockMatch) {
    jsonText = codeBlockMatch[1].trim()
  }

  try {
    const revisedScene = JSON.parse(jsonText)
    
    // Apply preservation rules
    const finalScene = { ...currentScene, ...revisedScene }
    
    if (preserveElements.includes('narration')) {
      finalScene.narration = currentScene.narration
    }
    if (preserveElements.includes('dialogue')) {
      finalScene.dialogue = currentScene.dialogue
    }
    if (preserveElements.includes('music')) {
      finalScene.music = currentScene.music
    }
    if (preserveElements.includes('sfx')) {
      finalScene.sfx = currentScene.sfx
    }

    return finalScene
  } catch (parseError) {
    console.error('[Scene Revision] JSON parse error:', parseError)
    throw new Error('Failed to parse revised scene JSON')
  }
}
