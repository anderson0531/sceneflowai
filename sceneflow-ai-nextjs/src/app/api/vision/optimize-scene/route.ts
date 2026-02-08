import { NextRequest, NextResponse } from 'next/server'
import { generateText } from '@/lib/vertexai/gemini'

export const maxDuration = 300 // Increased for complex optimization
export const runtime = 'nodejs'

// Model fallback sequence for optimization
const MODEL_SEQUENCE = [
  'gemini-2.5-flash',     // Best quality, may be slower
  'gemini-2.5-flash-lite'          // Fast fallback
]

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
  const dialogueText = scene.dialogue?.map((d: any) => `${d.character}: ${d.text}`).join('\n') || 'No dialogue'
  const previousSceneText = context.previousScene ? 
    `Previous: ${context.previousScene.heading || 'Untitled'} - ${context.previousScene.action?.substring(0, 100) || 'No action'}...` : 
    'No previous scene'
  const nextSceneText = context.nextScene ? 
    `Next: ${context.nextScene.heading || 'Untitled'} - ${context.nextScene.action?.substring(0, 100) || 'No action'}...` : 
    'No next scene'

  // Try models in sequence with fallback
  let lastError: Error | null = null
  
  for (const model of MODEL_SEQUENCE) {
    try {
      console.log(`[Scene Optimization] Trying model: ${model}`)
      const result = await tryOptimizeWithModel(model, scene, context, dialogueText, previousSceneText, nextSceneText)
      console.log(`[Scene Optimization] Success with model: ${model}`)
      return result
    } catch (error: any) {
      console.error(`[Scene Optimization] Model ${model} failed:`, error.message)
      lastError = error
      // Continue to next model
    }
  }
  
  // All models failed
  throw lastError || new Error('All optimization models failed')
}

async function tryOptimizeWithModel(
  model: string,
  scene: any,
  context: any,
  dialogueText: string,
  previousSceneText: string,
  nextSceneText: string
) {
  const prompt = `You are an expert film director and screenwriting consultant. REWRITE this scene with SUBSTANTIVE improvements—not cosmetic polishing.

SCENE TO REWRITE:
Heading: ${scene.heading || 'Untitled Scene'}
Scene Description: ${scene.visualDescription || 'No dedicated scene description'}
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

REWRITE MANDATE:
This is NOT a polish pass. You must make STRUCTURAL and CONTENT changes, including:

1. DIALOGUE RESTRUCTURING:
   - Reorder dialogue exchanges for better flow
   - Combine redundant lines or split overlong speeches
   - ADD or REMOVE beats as needed for pacing
   - REPLACE on-the-nose dialogue with subtext-rich alternatives
   - Change WHAT characters say, not just HOW they say it

2. SHOW DON'T TELL:
   - Convert narration that EXPLAINS emotions into action that SHOWS them
   - Replace "He felt nervous" with visible behaviors
   - Transform internal states into external manifestations

3. PACING OPTIMIZATION:
   - Condense slow sections by cutting unnecessary exchanges
   - Expand rushed moments by adding tension-building beats
   - Restructure the scene arc for maximum impact

4. DIRECTOR PERSPECTIVE:
   - Visual clarity and staging opportunities
   - Technical feasibility with strong visual imagery
   - Clear character actions and blocking

5. AUDIENCE PERSPECTIVE:
   - Emotional impact and resonance
   - Character connection and relatability
   - Satisfying scene arc

WHAT SUCCESSFUL OPTIMIZATION LOOKS LIKE:
✓ The dialogue has DIFFERENT content, not just different wording
✓ Lines may be reordered, combined, or split
✓ Narration explaining feelings is converted to visual action
✓ The scene may be shorter OR longer if that serves the story
✓ Subtext replaces explicit statements

WHAT UNSUCCESSFUL OPTIMIZATION LOOKS LIKE (AVOID):
✗ Same dialogue with synonym substitutions
✗ Same structure with minor adjective changes
✗ Keeping problematic narration with slightly different words

DIALOGUE AUDIO TAGS (CRITICAL FOR ELEVENLABS TTS):
EVERY dialogue line MUST include emotional/vocal direction tags to guide AI voice generation.

STYLE TAGS (In square brackets BEFORE text):
Emotions: [happy], [sad], [angry], [fearful], [surprised], [disgusted], [neutral]
Intensity: [very], [slightly], [extremely]
Vocal Quality: [whispering], [shouting], [mumbling], [singing], [laughing], [crying], [gasping]
Pace: [quickly], [slowly], [hesitantly], [confidently]

PUNCTUATION & PACING:
- Use ellipses (...) for pauses, trailing off, or hesitation
- Use dashes (—) for interruptions or sudden stops
- Use CAPS for EMPHASIS on specific words

EXAMPLES:
  * {"character": "JOHN", "line": "[very excited] I can't believe it!"}
  * {"character": "MARY", "line": "[whispering nervously] Don't tell anyone..."}

CRITICAL: Every single dialogue line must start with at least one emotion/style tag in [brackets].

DIALOGUE NEGATIVE CONSTRAINTS (DO NOT DO THESE):
- ❌ Do NOT create dialogue lines that only contain stage directions without spoken words
- ❌ Do NOT put action/movement descriptions in the dialogue "line" field
- ❌ WRONG: {"character": "ALEX", "line": "[shaky breath] [Alex retrieves the cufflink]"} ← This is a stage direction, NOT dialogue!
- ❌ WRONG: {"character": "JOHN", "line": "[He walks to the door]"} ← This belongs in "action" field!
- ✅ CORRECT: {"character": "ALEX", "line": "[shaky breath, defeated] I found it... the cufflink."}
- ✅ CORRECT: Action description in "action" field + spoken words in dialogue "line"

If a character performs an action without speaking, put it in the "action" field, NOT as a dialogue entry.

PROVIDE:
1. A COMPLETELY REWRITTEN version of the scene (all elements: heading, action, narration, dialogue, etc.)
2. A detailed "Changes Summary" explaining STRUCTURAL changes you made and WHY
3. Rationale for each change from both director and audience perspectives

Return JSON with this exact structure:
{
  "optimizedScene": {
    "heading": "INT. LOCATION - TIME",
    "visualDescription": "Scene description / director notes that reinforce the cinematic look",
    "action": "REWRITTEN action with show-don't-tell visual storytelling...",
    "narration": "REWRITTEN narration (or removed if converted to action)...",
    "dialogue": [
      { "character": "CHARACTER NAME", "line": "[emotion tag] REWRITTEN dialogue with subtext..." }
    ],
    "music": "Music description",
    "sfx": ["SFX description"]
  },
  "changesSummary": [
    {
      "category": "Dialogue Restructuring",
      "changes": "STRUCTURAL changes made: lines reordered/combined/split, content changed...",
      "rationaleDirector": "Why this helps the director (staging, clarity, visuals)...",
      "rationaleAudience": "Why this helps the audience (engagement, emotional impact)..."
    }
  ]
}

REMEMBER: ALL dialogue must include [emotional tags] at the beginning.

CRITICAL SUCCESS CRITERIA:
- The rewritten dialogue must have DIFFERENT CONTENT, not just different wording
- The changesSummary must describe STRUCTURAL changes (reordering, combining, adding/removing)
- If the original had narration explaining emotions, convert it to visual action
- Do NOT return a scene that could be described as "polished" - return one that is "restructured"`

  console.log('[Scene Optimization] Calling Vertex AI Gemini...')
  const result = await generateText(prompt, {
    model: model,
    temperature: 0.7,
    maxOutputTokens: 8192
  })

  const analysisText = result.text

  if (!analysisText) {
    throw new Error('No optimization generated')
  }

  // Extract JSON from markdown code blocks if present
  let jsonText = analysisText.trim()
  const codeBlockMatch = jsonText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  if (codeBlockMatch) {
    jsonText = codeBlockMatch[1].trim()
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim()
  }

  const optimization = JSON.parse(jsonText)
  if (optimization?.optimizedScene && optimization.optimizedScene.visualDescription === undefined) {
    optimization.optimizedScene.visualDescription = scene.visualDescription || ''
  }
  return optimization
}