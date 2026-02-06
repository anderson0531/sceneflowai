import { NextRequest, NextResponse } from 'next/server'
import { generateText } from '@/lib/vertexai/gemini'

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

  const dialogueText = currentScene.dialogue?.map((d: any) => `${d.character}: ${d.line || d.text || ''}`).join('\n') || 'No dialogue'
  const characterNames = context.characters?.map((c: any) => c.name).join(', ') || 'No characters'

  const prompt = `You are a professional screenwriter revising a scene. Revise the scene according to the instructions while maintaining continuity and character consistency.

CURRENT SCENE:
Heading: ${currentScene.heading || 'Untitled Scene'}
Scene Description: ${currentScene.visualDescription || 'No dedicated scene description'}
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

CRITICAL: Maintain EXACT character names from the character list. Do not abbreviate or modify names.

REVISION INSTRUCTIONS:
${revisionInstruction}

${preserveInstructions ? `PRESERVATION REQUIREMENTS: ${preserveInstructions}` : ''}

SCOPE GUARDRAILS - WHAT YOU CAN CHANGE:
✓ Scene-level improvements: dialogue delivery, action descriptions, visual details, pacing
✓ Enhance emotional impact, clarity, and cinematography within the scene
✓ Improve character-appropriate dialogue while keeping the same characters present
✓ Refine blocking, camera work, sound design for THIS scene only

SCOPE GUARDRAILS - WHAT YOU CANNOT CHANGE:
✗ Do NOT introduce new characters or remove existing characters
✗ Do NOT change major plot points, story beats, or character motivations
✗ Do NOT alter the scene's role in the overall narrative arc
✗ Do NOT modify what happens before or after this scene

If the revision instructions request changes beyond scene-level improvements (e.g., "add a new character", "change the storyline", "make character X do something completely different from their arc"), you must respond with an error JSON instead:
{
  "error": "OUT_OF_SCOPE",
  "message": "The requested changes require script-level edits. Please revise the script itself to: [explain what needs to change at script level]",
  "suggestion": "For scene-level improvements, try: [suggest appropriate scene-level changes]"
}

DIALOGUE AUDIO TAGS (CRITICAL FOR ELEVENLABS TTS):
EVERY dialogue line MUST include emotional/vocal direction tags to guide AI voice generation.

STYLE TAGS (In square brackets BEFORE text):
Emotions: [happy], [sad], [angry], [fearful], [surprised], [disgusted], [neutral]
Intensity: [very], [slightly], [extremely]
Vocal Quality: [whispering], [shouting], [mumbling], [singing], [laughing], [crying], [gasping]
Pace: [quickly], [slowly], [hesitantly], [confidently]
Combined: [very happy], [slightly angry], [extremely fearful]

PUNCTUATION & PACING:
- Use ellipses (...) for pauses, trailing off, or hesitation
- Use dashes (—) for interruptions or sudden stops  
- Use CAPS for EMPHASIS on specific words

EXAMPLES:
  * {"character": "JOHN", "line": "[very excited] I can't believe it! This changes EVERYTHING!"}
  * {"character": "MARY", "line": "[whispering nervously] Don't tell anyone... It's our secret, okay?"}
  * {"character": "JACK", "line": "[sadly, slowly] I wish things were different— but they're not."}

CRITICAL: Every single dialogue line must start with at least one emotion/style tag in [brackets].

DIALOGUE NEGATIVE CONSTRAINTS (DO NOT DO THESE):
- ❌ Do NOT create dialogue lines that only contain stage directions without spoken words
- ❌ Do NOT put action/movement descriptions in the dialogue "line" field
- ❌ WRONG: {"character": "ALEX", "line": "[shaky breath] [Alex retrieves the cufflink]"} ← This is a stage direction, NOT dialogue!
- ❌ WRONG: {"character": "JOHN", "line": "[He walks to the door]"} ← This belongs in "action" field!
- ✅ CORRECT: {"character": "ALEX", "line": "[shaky breath, defeated] I found it... the cufflink."}
- ✅ CORRECT: Action description in "action" field + spoken words in dialogue "line"

If a character performs an action without speaking, put it in the "action" field, NOT as a dialogue entry.

REQUIREMENTS:
1. Maintain the same scene structure and format
2. Use EXACT character names as provided - no abbreviations or variations
3. Keep basic plot points and character arcs consistent with the overall script
4. Improve the specified elements while preserving others
5. Ensure smooth transitions from previous scene and to next scene
6. Make dialogue natural and character-appropriate with EMOTIONAL TAGS
7. Enhance visual storytelling and emotional impact
8. Keep the scene length appropriate (not too short, not too long)
9. Stay within scene-level scope - direct users to edit the script for broader changes

Output the revised scene as JSON with this exact structure:
{
  "heading": "Revised scene heading",
  "visualDescription": "Scene description / director notes that set the look and feel",
  "action": "Revised action description with improved visual storytelling",
  "narration": "Revised narration (if not preserved)",
  "dialogue": [
    {"character": "Character Name", "line": "[emotion tag] Revised dialogue text with emotional cues"}
  ],
  "music": "Revised music specification (if not preserved)",
  "sfx": ["Revised sound effect 1", "Revised sound effect 2"]
}

REMEMBER: ALL dialogue must include [emotional tags] at the beginning.

Focus on making the scene more engaging, clear, and emotionally impactful while following the revision instructions.`

  console.log('[Scene Revision] Calling Vertex AI Gemini...')
  const result = await generateText(prompt, {
    model: 'gemini-2.5-flash',
    temperature: 0.7,
    maxOutputTokens: 16384  // Large scenes with many dialogue lines need more tokens
  })

  console.log('[Scene Revision] Response received, finishReason:', result.finishReason, 'length:', result.text?.length || 0)

  const revisedText = result.text

  if (!revisedText) {
    throw new Error('No revised scene generated from Gemini')
  }

  // Extract JSON from markdown code blocks if present
  console.log('[Scene Revision] Raw response text:', revisedText.substring(0, 200))
  console.log('[Scene Revision] Raw response end:', revisedText.slice(-100))
  let jsonText = revisedText.trim()

  // Try multiple extraction methods
  const codeBlockMatch = jsonText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  if (codeBlockMatch) {
    jsonText = codeBlockMatch[1].trim()
    console.log('[Scene Revision] Extracted from code block')
  } else if (jsonText.startsWith('```')) {
    // Fallback: manually strip code block markers
    jsonText = jsonText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim()
    console.log('[Scene Revision] Manually stripped code blocks')
  }

  console.log('[Scene Revision] JSON to parse:', jsonText.substring(0, 200))

  // Try to repair truncated JSON if needed — don't rely only on finishReason
  // The model sometimes returns STOP even when output is incomplete
  const jsonEndsClean = jsonText.trim().endsWith('}') || jsonText.trim().endsWith(']}')
  if (!jsonEndsClean) {
    console.log('[Scene Revision] Attempting to repair truncated JSON (endsClean:', jsonEndsClean, ', finishReason:', result.finishReason, ')' )
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
    
    console.log('[Scene Revision] Repaired JSON (last 200 chars):', jsonText.slice(-200))
  }

  try {
    const revisedScene = JSON.parse(jsonText)
    
    // Apply preservation rules
    const finalScene = { ...currentScene, ...revisedScene }
    if (revisedScene.visualDescription === undefined && currentScene.visualDescription) {
      finalScene.visualDescription = currentScene.visualDescription
    }
    
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
  console.error('[Scene Revision] Failed to parse text:', jsonText.substring(0, 500))
  
  // Retry with a simpler extraction — find the outermost JSON object
  console.log('[Scene Revision] Retrying with simplified extraction...')
  try {
    const jsonObjectMatch = jsonText.match(/\{[\s\S]*\}/)
    if (jsonObjectMatch) {
      const retryParsed = JSON.parse(jsonObjectMatch[0])
      if (retryParsed.heading || retryParsed.dialogue || retryParsed.action) {
        console.log('[Scene Revision] Retry parse succeeded')
        const finalScene = { ...currentScene, ...retryParsed }
        return finalScene
      }
    }
  } catch (retryError) {
    console.error('[Scene Revision] Retry parse also failed:', retryError)
  }
  
  // If all parsing fails, throw so the client sees the error
  throw new Error('Failed to parse revised scene from AI response. The scene may be too complex for a single revision. Try again or edit the scene manually.')
}
}
