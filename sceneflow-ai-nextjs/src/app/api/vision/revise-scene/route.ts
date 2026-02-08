import { NextRequest, NextResponse } from 'next/server'
import { generateText } from '@/lib/vertexai/gemini'

export const maxDuration = 60
export const runtime = 'nodejs'

interface SceneRevisionRequest {
  projectId: string
  sceneIndex: number
  currentScene: any
  revisionMode: 'recommendations' | 'instruction' | 'hybrid'
  selectedRecommendations?: (string | { text: string; category?: string; impact?: 'structural' | 'polish' })[]
  customInstruction?: string
  preserveElements?: ('narration' | 'dialogue' | 'music' | 'sfx')[]
  revisionDepth?: 'light' | 'moderate' | 'deep' // light=polish, moderate=rewrite, deep=restructure
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
      revisionDepth = 'moderate', // Default to moderate (substantive rewrite)
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
      revisionDepth,
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
  revisionDepth,
  context
}: {
  currentScene: any
  revisionMode: string
  selectedRecommendations: (string | { text: string; category?: string; impact?: 'structural' | 'polish' })[]
  customInstruction: string
  preserveElements: string[]
  revisionDepth: 'light' | 'moderate' | 'deep'
  context: any
}): Promise<any> {
  // Normalize recommendations to extract text and categorize by impact
  const structuralRecs: string[] = []
  const polishRecs: string[] = []
  
  selectedRecommendations.forEach(rec => {
    if (typeof rec === 'string') {
      // Legacy string format - assume moderate impact
      structuralRecs.push(rec)
    } else {
      const text = rec.text
      if (rec.impact === 'structural') {
        structuralRecs.push(text)
      } else {
        polishRecs.push(text)
      }
    }
  })

  // Build the revision instruction based on mode and depth
  let revisionInstruction = ''
  
  const depthGuidance = {
    light: 'Make targeted polish edits. Keep the core structure and flow intact. Focus on wording refinements.',
    moderate: 'REWRITE the scene to fully address each issue. Make substantive changes to dialogue, action, and flow—not just surface-level rewording. Restructure dialogue order, combine/split lines, and add/remove beats as needed.',
    deep: 'COMPLETELY RESTRUCTURE this scene. Rewrite from scratch if necessary to achieve the goals. Transform the dialogue, pacing, and visual storytelling. Do not be constrained by the original structure—reimagine how this scene should unfold.'
  }[revisionDepth]
  
  if (revisionMode === 'recommendations' && selectedRecommendations.length > 0) {
    const allRecs = [...structuralRecs, ...polishRecs]
    revisionInstruction = `REWRITE this scene to address these specific issues:

${allRecs.map((r, i) => `${i + 1}. ${r}`).join('\n')}

${depthGuidance}

For each recommendation, make the necessary STRUCTURAL or CONTENT changes. Do NOT make superficial rewording that leaves the underlying problem intact.`
  } else if (revisionMode === 'instruction' && customInstruction) {
    revisionInstruction = `${customInstruction}\n\n${depthGuidance}`
  } else if (revisionMode === 'hybrid') {
    const allRecs = [...structuralRecs, ...polishRecs]
    revisionInstruction = `REWRITE this scene to address these issues:\n\n${allRecs.map((r, i) => `${i + 1}. ${r}`).join('\n')}\n\nAdditional instruction: ${customInstruction}\n\n${depthGuidance}`
  } else {
    revisionInstruction = `Rewrite the scene for better storytelling and audience engagement.\n\n${depthGuidance}`
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

  const prompt = `You are a professional screenwriter REWRITING a scene. Your task is to make SUBSTANTIVE changes—not cosmetic polishing. When recommendations call for change, CHANGE THE ACTUAL CONTENT, not just the wording.

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

REWRITE INSTRUCTIONS:
${revisionInstruction}

${preserveInstructions ? `PRESERVATION REQUIREMENTS: ${preserveInstructions}` : ''}

WHAT SUBSTANTIVE REWRITING MEANS:
✓ RESTRUCTURE dialogue: reorder lines, combine redundant exchanges, split long speeches, add/remove beats
✓ REWRITE dialogue content: change what characters actually SAY, not just how they say it
✓ ADD subtext: replace on-the-nose dialogue with indirect, layered communication
✓ SHOW don't tell: replace narration explaining emotions with visual action beats
✓ CONDENSE or EXPAND: adjust scene pacing by adding or removing content
✓ TRANSFORM delivery: change a character's approach entirely (e.g., dismissive → subtly manipulative)

WHAT COSMETIC POLISHING IS (AVOID THIS):
✗ Keeping the same dialogue with slightly different words ("I understand" → "I appreciate")
✗ Keeping the same structure with minor adjective swaps
✗ Adding flourishes without changing substance
✗ Rewording narration that explains emotions instead of removing it

SCOPE GUARDRAILS - WHAT YOU CANNOT CHANGE:
✗ Do NOT introduce new characters or remove existing characters
✗ Do NOT change the fundamental plot outcome of the scene
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

REWRITE REQUIREMENTS:
1. Make SUBSTANTIVE changes that address the recommendations—not surface-level rewording
2. Use EXACT character names as provided - no abbreviations or variations
3. Keep the scene's role in the plot consistent with the overall script
4. RESTRUCTURE dialogue order, beats, and flow when needed to fix pacing issues
5. REPLACE on-the-nose dialogue with subtext-rich alternatives
6. CONVERT "telling" narration to "showing" through visual action beats
7. Make dialogue natural and character-appropriate with EMOTIONAL TAGS
8. The rewritten scene may be shorter OR longer than the original if that serves the story

Output the REWRITTEN scene as JSON with this exact structure:
{
  "heading": "Scene heading",
  "visualDescription": "Scene description / director notes that set the look and feel",
  "action": "Rewritten action description with improved visual storytelling",
  "narration": "Rewritten narration (or removed if converted to action)",
  "dialogue": [
    {"character": "Character Name", "line": "[emotion tag] Rewritten dialogue text with emotional cues"}
  ],
  "music": "Music specification",
  "sfx": ["Sound effect 1", "Sound effect 2"]
}

REMEMBER: ALL dialogue must include [emotional tags] at the beginning.

CRITICAL SUCCESS CRITERIA:
- A successful rewrite will have DIFFERENT dialogue content, not just different wording
- A successful rewrite will have STRUCTURAL changes (line order, beat placement, etc.)
- If the recommendation says "condense" the result should have FEWER lines
- If the recommendation says "add subtext" the result should have INDIRECT dialogue
- Do NOT return a scene that could be described as "the same with minor polish"`

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
