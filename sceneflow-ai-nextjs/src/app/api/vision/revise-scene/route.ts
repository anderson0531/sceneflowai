import { NextRequest, NextResponse } from 'next/server'
import { generateTextCacheAware } from '@/lib/vertexai/gemini'
import { logCacheEvent } from '@/lib/vertexai/cacheObservability'
import { safeParseJsonFromText, strictJsonPromptSuffix } from '@/lib/safeJson'
import {
  formatMusicForPrompt,
  formatSfxForPrompt,
  normalizePreserveElements,
  type PreserveElementInput,
} from '@/lib/audio/cleanupAudio'
import { getSceneBeats } from '@/lib/script/beatMigration'
import {
  formatBeatsForRevisionPrompt,
  finalizeFlatRevisedScene,
  finalizeStructuredRevisedScene,
  isStructuredRevisionResponse,
} from '@/lib/script/structuredSceneRevision'
import { attachCoGeneratedSceneDirection } from '@/lib/sceneGeneration/attachRevisedSceneDirection'

export const maxDuration = 120
export const runtime = 'nodejs'

interface SceneRevisionRequest {
  projectId: string
  sceneIndex: number
  currentScene: any
  revisionMode: 'recommendations' | 'instruction' | 'hybrid'
  selectedRecommendations?: (string | { text: string; category?: string; impact?: 'structural' | 'polish' })[]
  customInstruction?: string
  /** Target audience profile + optional user direction */
  targetDemographic?: string
  preserveElements?: PreserveElementInput[]
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
      targetDemographic = '',
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
        projectId,
      currentScene,
      sceneIndex,
      revisionMode,
      selectedRecommendations,
      customInstruction,
      targetDemographic,
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
    projectId,
  currentScene,
  sceneIndex,
  revisionMode,
  selectedRecommendations,
  customInstruction,
  targetDemographic,
  preserveElements,
  revisionDepth,
  context
}: {
    projectId: string
  currentScene: any
  sceneIndex: number
  revisionMode: string
  selectedRecommendations: (string | { text: string; category?: string; impact?: 'structural' | 'polish' })[]
  customInstruction: string
  targetDemographic: string
  preserveElements: PreserveElementInput[]
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
  const normalizedPreserve = normalizePreserveElements(preserveElements)
  const preserveInstructions = normalizedPreserve.map((element) => {
    switch (element) {
      case 'dialogueBeats':
        return 'Keep the existing dialogue lines unchanged'
      case 'actionBeats':
        return 'Keep the existing action/visual description and sound effects unchanged'
      case 'music':
        return 'Keep the existing music specification unchanged'
      case 'sceneDirection':
        return 'Keep the existing scene direction unchanged (do not rewrite blocking or camera notes)'
      case 'beatFrames':
        return 'Do not alter storyboard frame references (handled separately after revision)'
      default:
        return ''
    }
  }).filter(Boolean).join('. ')

  const dialogueText = currentScene.dialogue?.map((d: any) => `${d.character}: ${d.line || d.text || ''}`).join('\n') || 'No dialogue'
  const characterNames = context.characters?.map((c: any) => c.name).join(', ') || 'No characters'
  const currentBeats = getSceneBeats(currentScene)
  const beatsText = formatBeatsForRevisionPrompt(currentBeats)

    // ── Cache-aware prompt splitting ──
    // Cacheable context: scene data, formatting rules, dialogue tags, constraints
    // These are heavy content parts that remain stable during iterative revisions.
    const audienceContext = targetDemographic?.trim()
      ? `\nTARGET AUDIENCE:\n${targetDemographic.trim()}\nRewrite this scene so it resonates more strongly with this audience.\n\n`
      : ''

    const cacheableContext = `${audienceContext}CURRENT SCENE (structured beats timeline — edit this directly):
Heading: ${currentScene.heading || 'Untitled Scene'}

BEATS (ordered timeline — keep beatId for kept/edited beats, omit for new beats, drop removed beats):
${beatsText}

Legacy flat fields (derived from beats — do not output these separately):
Scene Description: ${currentScene.visualDescription || 'No dedicated scene description'}
Action: ${currentScene.action || 'No action description'}
Narration: ${currentScene.narration || 'No narration'}
Dialogue:
${dialogueText}
Music: ${formatMusicForPrompt(currentScene.music)}
SFX: ${formatSfxForPrompt(currentScene.sfx)}

CONTEXT:
Characters: ${characterNames}
Previous Scene: ${context.previousScene?.heading || 'None'}
Next Scene: ${context.nextScene?.heading || 'None'}

CRITICAL: Maintain EXACT character names from the character list. Do not abbreviate or modify names.

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
  "beats": [
    { "beatId": "existing-id", "kind": "action", "actionDescription": "Visual beat description" },
    { "beatId": "existing-id", "kind": "dialogue", "character": "CHARACTER NAME", "line": "[emotion] One sentence of dialogue", "voiceDirection": "[emotion]" },
    { "kind": "narration", "character": "NARRATOR", "line": "[calm] Narration line" }
  ],
  "music": "Music specification or empty string",
  "sfx": ["Sound effect 1", "Sound effect 2"]
}

STRUCTURED BEATS RULES:
- Return the FULL ordered beats[] array for the revised scene.
- Keep beatId for beats you keep or edit; omit beatId for new beats; remove beats that should be deleted.
- One sentence per spoken line (dialogue/narration).
- Do NOT emit sceneDirection, storyboard images, or frame URLs.
- Action beats use kind "action" with actionDescription only.
- Dialogue beats use kind "dialogue" with character + line.
- Narration beats use kind "narration" with character "NARRATOR" unless narrator is already a dialogue character.

REMEMBER: ALL dialogue/narration lines must include [emotional tags] at the beginning.

CRITICAL SUCCESS CRITERIA:
- A successful rewrite will have DIFFERENT dialogue content, not just different wording
- A successful rewrite will have STRUCTURAL changes (line order, beat placement, etc.)
- If the recommendation says "condense" the result should have FEWER lines
- If the recommendation says "add subtext" the result should have INDIRECT dialogue
- Do NOT return a scene that could be described as "the same with minor polish"`

    // User delta: only the revision instruction changes between iterative calls
    const userPrompt = `REWRITE INSTRUCTIONS:
${revisionInstruction}

${preserveInstructions ? `PRESERVATION REQUIREMENTS: ${preserveInstructions}` : ''}

Now rewrite the scene following all the rules, constraints, and formatting requirements provided in the context above.${strictJsonPromptSuffix}`

    // System instruction for the screenwriter persona
    const systemInstruction = `You are a professional screenwriter REWRITING a scene. Your task is to make SUBSTANTIVE changes—not cosmetic polishing. When recommendations call for change, CHANGE THE ACTUAL CONTENT, not just the wording.`

    console.log('[Scene Revision] Calling Vertex AI Gemini (cache-aware, zone: script_doctor)...')
    const _startTime = Date.now()
    const result = await generateTextCacheAware(userPrompt, {
      cacheZone: 'script_doctor',
      sceneflowProjectId: projectId,
      systemInstruction,
      cacheContextParts: [{ text: cacheableContext }],
      model: 'gemini-2.5-flash',
      temperature: 0.7,
      maxOutputTokens: 16384,
      responseMimeType: 'application/json',
      cacheTtlMinutes: 60
    })

    if (result.usedCache) {
      console.log('[Scene Revision] ✅ Used cached context, cache:', result.cacheEntry?.cacheId)
    } else {
      console.log('[Scene Revision] Cache not used (first call or below threshold)')
    }

    // Fire-and-forget cache observability
    logCacheEvent({
      zone: 'script_doctor',
      projectId,
      cacheHit: result.usedCache ?? false,
      cacheId: result.cacheEntry?.cacheId,
      model: 'gemini-2.5-flash',
      usageMetadata: result.usageMetadata,
      taskType: 'scene_revision',
      duration: Date.now() - _startTime,
      success: true,
    }).catch(() => {})


  console.log('[Scene Revision] Response received, finishReason:', result.finishReason, 'length:', result.text?.length || 0)

  if (result.finishReason === 'SAFETY') {
    throw new Error('Scene revision blocked by safety filters. Try rephrasing your direction.')
  }
  if (result.finishReason === 'MAX_TOKENS') {
    throw new Error('Scene revision response was truncated. Try a shorter direction or fewer changes at once.')
  }

  const revisedText = result.text
  if (!revisedText) {
    throw new Error('No revised scene generated from Gemini')
  }

  let parsed: any
  try {
    parsed = safeParseJsonFromText(revisedText)
  } catch (parseError) {
    console.error('[Scene Revision] JSON parse error:', parseError)
    throw new Error(
      'Failed to parse revised scene from AI response. Try again or simplify your direction.'
    )
  }

  if (parsed?.error === 'OUT_OF_SCOPE') {
    throw new Error(
      typeof parsed.message === 'string'
        ? parsed.message
        : 'The requested changes are outside scene-level edit scope.'
    )
  }

  if (isStructuredRevisionResponse(parsed)) {
    console.log('[Scene Revision] Using structured beats response:', parsed.beats.length, 'beats')
    const finalized = finalizeStructuredRevisedScene(parsed, currentScene, preserveElements, context)
    return attachCoGeneratedSceneDirection({
      finalizedScene: finalized,
      currentScene,
      context,
      sceneIndex,
      preserveElements,
      skipDirection: true,
    })
  }

  console.warn('[Scene Revision] Structured beats missing — falling back to flat-field merge')
  const finalized = finalizeFlatRevisedScene(parsed, currentScene, preserveElements, context)
  return attachCoGeneratedSceneDirection({
    finalizedScene: finalized,
    currentScene,
    context,
    sceneIndex,
    preserveElements,
    skipDirection: true,
  })
}
