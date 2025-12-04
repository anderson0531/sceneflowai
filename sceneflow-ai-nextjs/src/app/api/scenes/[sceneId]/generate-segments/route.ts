import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const maxDuration = 120
export const runtime = 'nodejs'

interface GenerateSegmentsRequest {
  preferredDuration: number
  sceneId?: string
  projectId?: string
}

// Enhanced segment structure for Veo 3.1 intelligent generation
interface IntelligentSegment {
  sequence: number
  estimated_duration: number
  trigger_reason: string // Why we cut here
  generation_method: 'I2V' | 'EXT' | 'T2V' | 'FTV' // Veo 3.1 methods
  video_generation_prompt: string
  reference_strategy: {
    use_scene_frame: boolean
    use_character_refs: string[] // Character names to reference
    start_frame_description?: string
  }
  end_frame_description: string // For lookahead/continuity
  camera_notes: string
  emotional_beat: string
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sceneId: string }> }
) {
  try {
    const { sceneId } = await params
    const body: GenerateSegmentsRequest = await req.json()
    const { preferredDuration, projectId } = body

    if (!sceneId || !projectId) {
      return NextResponse.json(
        { error: 'Missing required fields: sceneId and projectId' },
        { status: 400 }
      )
    }

    if (!preferredDuration || preferredDuration <= 0) {
      return NextResponse.json(
        { error: 'preferredDuration must be a positive number' },
        { status: 400 }
      )
    }

    console.log('[Scene Segmentation] Generating intelligent segments for scene:', sceneId)

    // Fetch project and scene data
    const projectResponse = await fetch(`${req.nextUrl.origin}/api/projects/${projectId}`)
    if (!projectResponse.ok) {
      throw new Error('Failed to fetch project')
    }
    const responseData = await projectResponse.json()
    const project = responseData.project || responseData

    // Extract scene data from both possible locations
    const visionPhase = project.metadata?.visionPhase || {}
    const scenesFromDirect = visionPhase.scenes || []
    const scenesFromScript = visionPhase.script?.script?.scenes || []
    
    // Combine scenes
    const allScenes = [...scenesFromDirect]
    scenesFromScript.forEach((s: any) => {
      const existingIndex = allScenes.findIndex((existing: any) => 
        existing.id === s.id || 
        (existing.sceneNumber && s.sceneNumber && existing.sceneNumber === s.sceneNumber)
      )
      if (existingIndex === -1) {
        allScenes.push(s)
      }
    })
    
    console.log('[Scene Segmentation] Found scenes:', allScenes.length)

    // Find the scene
    let scene: any = null
    scene = allScenes.find((s: any) => s.id === sceneId)
    
    if (!scene && !isNaN(parseInt(sceneId))) {
      const sceneNumber = parseInt(sceneId)
      scene = allScenes.find((s: any) => s.sceneNumber === sceneNumber)
    }
    
    if (!scene && sceneId.startsWith('scene-')) {
      const indexMatch = sceneId.match(/^scene-(\d+)$/)
      if (indexMatch) {
        const index = parseInt(indexMatch[1])
        if (index >= 0 && index < allScenes.length) {
          scene = allScenes[index]
        }
      }
    }
    
    if (!scene && !isNaN(parseInt(sceneId))) {
      const index = parseInt(sceneId) - 1
      if (index >= 0 && index < allScenes.length) {
        scene = allScenes[index]
      }
    }
    
    if (!scene) {
      console.error('[Scene Segmentation] Scene not found. SceneId:', sceneId)
      return NextResponse.json(
        { error: 'Scene not found', sceneId, availableScenes: allScenes.length },
        { status: 404 }
      )
    }
    
    console.log('[Scene Segmentation] Found scene:', scene.id || scene.sceneNumber || 'unknown')

    // Extract characters from project
    const characters = visionPhase.characters || project.metadata?.characters || []
    
    // Build comprehensive scene data for intelligent segmentation
    const sceneData = buildComprehensiveSceneData(scene, characters)
    
    // Generate intelligent segmentation prompt
    const prompt = generateIntelligentSegmentationPrompt(sceneData, preferredDuration)

    // Call Gemini for intelligent segmentation
    const segments = await callGeminiForIntelligentSegmentation(prompt)

    // Transform segments to match our enhanced data structure
    const transformedSegments = segments.map((seg: IntelligentSegment, idx: number) => {
      let cumulativeTime = 0
      for (let i = 0; i < idx; i++) {
        cumulativeTime += segments[i].estimated_duration
      }

      // Map generation method to our types
      const methodMap: Record<string, string> = {
        'I2V': 'I2V',
        'EXT': 'EXT', 
        'T2V': 'T2V',
        'FTV': 'FTV'
      }
      
      // For segment 1 with use_scene_frame, set the start frame to scene image
      const isFirstSegment = idx === 0
      const useSceneFrame = seg.reference_strategy?.use_scene_frame ?? isFirstSegment
      const startFrameUrl = (isFirstSegment && useSceneFrame && sceneData.sceneFrameUrl) 
        ? sceneData.sceneFrameUrl 
        : null

      return {
        segmentId: `seg_${sceneId}_${seg.sequence}`,
        sequenceIndex: Math.max(0, (Number(seg.sequence) || (idx + 1)) - 1),
        startTime: cumulativeTime,
        endTime: cumulativeTime + seg.estimated_duration,
        status: 'DRAFT' as const,
        // Enhanced prompt data
        generatedPrompt: seg.video_generation_prompt,
        userEditedPrompt: null,
        activeAssetUrl: null,
        assetType: null as 'video' | 'image' | null,
        // Enhanced metadata for Veo 3.1
        generationMethod: methodMap[seg.generation_method] || 'T2V',
        triggerReason: seg.trigger_reason,
        endFrameDescription: seg.end_frame_description,
        cameraMovement: seg.camera_notes,
        emotionalBeat: seg.emotional_beat,
        references: {
          startFrameUrl: startFrameUrl,
          endFrameUrl: null,
          useSceneFrame: useSceneFrame,
          characterRefs: seg.reference_strategy?.use_character_refs || [],
          startFrameDescription: seg.reference_strategy?.start_frame_description || null,
          characterIds: [],
          sceneRefIds: [],
          objectRefIds: [],
        },
        takes: [],
      }
    })
    
    // Log segment generation results
    console.log('[Scene Segmentation] Generated', transformedSegments.length, 'segments')
    transformedSegments.forEach((seg: any, idx: number) => {
      console.log(`[Scene Segmentation] Segment ${idx + 1}: method=${seg.generationMethod}, trigger="${seg.triggerReason?.substring(0, 50)}...", prompt="${seg.generatedPrompt?.substring(0, 100)}..."`)
    })

    return NextResponse.json({
      success: true,
      segments: transformedSegments,
      targetSegmentDuration: preferredDuration,
    })
  } catch (error: any) {
    console.error('[Scene Segmentation] Error:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to generate segments',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

interface ComprehensiveSceneData {
  heading: string
  visualDescription: string
  narration: string | null
  dialogue: Array<{ character: string; text: string; emotion?: string }>
  sceneDirection: {
    camera: string
    lighting: string
    scene: string
    talent: string
    audio: string
  }
  sceneFrameUrl: string | null
  characters: Array<{
    name: string
    description: string
    hasReferenceImage: boolean
  }>
  estimatedTotalDuration: number
}

function buildComprehensiveSceneData(scene: any, characters: any[]): ComprehensiveSceneData {
  // Extract heading
  const heading = typeof scene.heading === 'string' 
    ? scene.heading 
    : scene.heading?.text || 'UNKNOWN LOCATION'

  // Extract visual description
  const visualDescription = scene.visualDescription || scene.action || scene.summary || ''

  // Extract narration
  const narration = scene.narration || null

  // Extract and normalize dialogue
  const dialogue = (scene.dialogue || []).map((d: any) => ({
    character: d.character || d.name || 'UNKNOWN',
    text: d.text || d.dialogue || d.line || '',
    emotion: d.emotion || d.mood || null
  }))

  // Extract scene direction with fallbacks
  const dir = scene.sceneDirection || {}
  const sceneDirection = {
    camera: typeof dir.camera === 'string' ? dir.camera : JSON.stringify(dir.camera || 'Standard coverage'),
    lighting: typeof dir.lighting === 'string' ? dir.lighting : JSON.stringify(dir.lighting || 'Natural lighting'),
    scene: typeof dir.scene === 'string' ? dir.scene : JSON.stringify(dir.scene || visualDescription),
    talent: typeof dir.talent === 'string' ? dir.talent : JSON.stringify(dir.talent || 'Standard blocking'),
    audio: typeof dir.audio === 'string' ? dir.audio : JSON.stringify(dir.audio || 'Ambient room tone')
  }

  // Get scene frame URL
  const sceneFrameUrl = scene.imageUrl || scene.thumbnailUrl || null

  // Extract relevant characters
  const sceneText = `${heading} ${visualDescription} ${narration || ''} ${dialogue.map((d: any) => `${d.character} ${d.text}`).join(' ')}`.toLowerCase()
  
  const relevantCharacters = characters
    .filter((c: any) => {
      const charName = (c.name || '').toLowerCase()
      return sceneText.includes(charName)
    })
    .map((c: any) => ({
      name: c.name || 'Unknown',
      description: c.appearanceDescription || c.description || '',
      hasReferenceImage: !!(c.referenceImageUrl || c.imageUrl)
    }))

  // Estimate duration based on dialogue (approx 2.5 words per second) + action
  const dialogueWords = dialogue.reduce((acc: number, d: any) => acc + (d.text?.split(' ').length || 0), 0)
  const dialogueDuration = dialogueWords / 2.5
  const actionDuration = Math.max(5, visualDescription.split(' ').length / 5) // Rough estimate
  const estimatedTotalDuration = Math.max(dialogueDuration, actionDuration) + 2 // Buffer

  return {
    heading,
    visualDescription,
    narration,
    dialogue,
    sceneDirection,
    sceneFrameUrl,
    characters: relevantCharacters,
    estimatedTotalDuration
  }
}

function generateIntelligentSegmentationPrompt(
  sceneData: ComprehensiveSceneData,
  preferredDuration: number
): string {
  const characterList = sceneData.characters.length > 0
    ? sceneData.characters.map(c => `- ${c.name}: ${c.description} ${c.hasReferenceImage ? '(Reference image available)' : ''}`).join('\n')
    : '- No specific character references available'

  const dialogueText = sceneData.dialogue.length > 0
    ? sceneData.dialogue.map(d => `${d.character}${d.emotion ? ` (${d.emotion})` : ''}: "${d.text}"`).join('\n')
    : 'No dialogue in this scene.'

  return `
**SYSTEM ROLE:** You are an AI Video Director and Editor optimized for Veo 3.1 generation workflows. Your goal is to translate a linear script and scene description into distinct, generation-ready video segments with RICH CINEMATIC PROMPTS.

**OPERATIONAL CONSTRAINTS:**
1. **Duration:** Maximum ${preferredDuration} seconds per segment (8 seconds absolute max for Veo 3.1).
2. **Continuity:** You must utilize specific **Methods** to ensure consistency (matching lighting, character appearance, and room tone).
3. **Lookahead:** Each segment must define the "End Frame State" to prepare for the *next* segment's generation method.
4. **Dialogue Integration:** Veo 3.1 generates speech from text. You MUST include character dialogue directly in prompts.

**INPUT DATA:**

## Scene Heading
${sceneData.heading}

## Visual Description / Action
${sceneData.visualDescription}

${sceneData.narration ? `## Narration (Audio Voiceover - NOT in video prompts)\n${sceneData.narration}` : ''}

## Dialogue (MUST BE INCLUDED IN PROMPTS for Veo 3.1 speech generation)
${dialogueText}

## Director's Chair Notes
**Camera:** ${sceneData.sceneDirection.camera}
**Lighting:** ${sceneData.sceneDirection.lighting}
**Scene/Environment:** ${sceneData.sceneDirection.scene}
**Talent/Blocking:** ${sceneData.sceneDirection.talent}
**Audio/Atmosphere:** ${sceneData.sceneDirection.audio}

## Available Character References
${characterList}

## Scene Frame Available
${sceneData.sceneFrameUrl ? 'Yes - Master scene frame is available for I2V on Segment 1' : 'No - Use T2V with detailed prompts'}

## Estimated Scene Duration
${Math.round(sceneData.estimatedTotalDuration)} seconds total

---

**LOGIC WORKFLOW:**
1. **Analyze Triggers:** Scan script for changes in Action, Speaker, Emotion, or Location. These are your "Cut Points."
2. **Estimate Timing:** Assign estimated seconds to dialogue (approx. 2.5 words/sec) and action. If a specific beat exceeds ${preferredDuration} seconds, split it into Part A and Part B.
3. **Select Method:**
   - **I2V (Image-to-Video):** STRICTLY for Segment 1 (using the Master Scene Frame) or static establishing shots.
   - **EXT (Extend):** Use ONLY when camera angle remains IDENTICAL and action simply continues (e.g., uninterrupted monologue from same angle, continuous walk). NEVER use when cutting between different characters.
   - **T2V (Text-to-Video with References):** Use for ALL angle changes (Wide to Close-Up, cutting from Character A to Character B). Reference Scene Frame + Character Reference images.
   - **FTV (Frame-to-Video):** When transitioning from a specific end frame.

**CRITICAL PROMPT CONSTRUCTION RULES:**
Your video_generation_prompt field MUST follow this formula:

[Shot Type] + [Lens] + [Subject with full visual description] + [Specific Action] + [DIALOGUE with exact text] + [Camera Movement] + [Lighting/Mood] + [Technical Specs]

**DIALOGUE FORMAT IN PROMPTS:**
When a character speaks, you MUST include it as: [Character Name] speaks, "[exact dialogue text]"
Example: Alex speaks, "I don't know if we're ready for this, Dad."

**EXAMPLE OF EXCELLENT SEGMENT PROMPTS:**

For a scene with dialogue between Alex (anxious, pacing) and Ben (calm, authoritative):

Segment 1 (Establishing - I2V):
"Cinematic Wide Shot of Upscale TV Studio Green Room, high-end beige box. Alex Anderson is pacing nervously from left to right, checking his watch and smoothing his suit. Ben Anderson sits perfectly still on the leather sofa, swiping a tablet with minimal movement. Atmosphere is cold, sterile, and pressurized. Anamorphic 35mm lens, visible condensation on fruit basket in foreground. 8k, photorealistic."

Segment 2 (Character dialogue - T2V):
"Medium Shot, reflection in vanity mirror. Alex Anderson stares into the mirror, adjusting his tie with trembling hands. Alex speaks with rapid breathing, 'I don't know if we're ready for this, Dad. Vance has the entire board in her pocket.' Lighting is clinical with a soft top-light. Rack focus from reflection to actual face. High contrast, sweaty skin texture."

Segment 3 (Reverse angle, new speaker - T2V):
"Low Angle Medium Close-Up on Ben Anderson sitting on the sofa. He looks up from his tablet slowly, authoritative and calm. Ben speaks, 'We have the files, Alex. That's all that matters.' Rigid, locked-off camera. Background is out of focus beige walls. OLED screen pulsing blue in background. 85mm lens."

**LENS LANGUAGE GUIDELINES:**
- Use "Handheld" for anxious/nervous characters
- Use "Locked-off/Static" for authoritative/controlled characters  
- 35mm anamorphic for wide establishing shots
- 85mm for intimate close-ups and dialogue
- 24mm for environmental wides
- Specify rack focus, shallow DOF, motivated lighting

**OUTPUT FORMAT:**
Return a JSON array. Each segment object MUST have these fields:

[
  {
    "sequence": 1,
    "estimated_duration": 6.0,
    "trigger_reason": "Establishing shot - Set geography and mood",
    "generation_method": "I2V",
    "video_generation_prompt": "[RICH 50-150 word cinematic prompt with exact dialogue if any, shot type, lens, character actions, camera movement, lighting, tech specs]",
    "reference_strategy": {
      "use_scene_frame": true,
      "use_character_refs": ["CharacterName"],
      "start_frame_description": "Wide establishing shot showing full room"
    },
    "end_frame_description": "Character positioned near [location], facing [direction], expression [mood]",
    "camera_notes": "Slow push-in, anamorphic 35mm, motivated key light from window",
    "emotional_beat": "Tension building"
  }
]

**FINAL CHECKLIST:**
✅ Every line of dialogue from the script appears in a segment prompt
✅ Dialogue is formatted as: [Name] speaks, "[text]"
✅ Each prompt is 50-150 words with specific lens/camera language
✅ Segment 1 uses I2V if scene frame available
✅ NEVER use EXT when cutting between characters or changing angles
✅ End frame descriptions set up the next segment
✅ Trigger reasons explain WHY we cut here
✅ Narration is NOT included in prompts (it's a separate audio voiceover)

Return ONLY valid JSON array. No markdown code blocks, no explanatory text.
`
}

async function callGeminiForIntelligentSegmentation(prompt: string): Promise<IntelligentSegment[]> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY
  if (!apiKey) {
    throw new Error('Google Gemini API key not configured')
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  
  // Try models in order of preference: Gemini 3.0 Pro for highest intelligence
  const modelsToTry = ['gemini-3-pro-preview', 'gemini-3.0-flash', 'gemini-2.5-flash']
  
  let lastError: Error | null = null

  for (const modelName of modelsToTry) {
    try {
      console.log(`[Scene Segmentation] Attempting with model: ${modelName}`)
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 16384,
          responseMimeType: 'application/json',
        },
      })

      const result = await model.generateContent(prompt)
      const response = await result.response
      const text = response.text()
      
      console.log(`[Scene Segmentation] Success with model: ${modelName}`)
      return parseGeminiResponseText(text)
    } catch (error) {
      console.warn(`[Scene Segmentation] Failed with model ${modelName}:`, error instanceof Error ? error.message : error)
      lastError = error instanceof Error ? error : new Error(String(error))
      // Continue to next model
    }
  }

  throw lastError || new Error('All Gemini model attempts failed')
}

function parseGeminiResponseText(text: string): IntelligentSegment[] {
  if (!text) {
    console.error('[Scene Segmentation] No text in response')
    throw new Error('No segments generated from Gemini')
  }

  let segments: IntelligentSegment[]
  try {
    // Remove markdown code blocks if present
    const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    segments = JSON.parse(cleanedText)
  } catch (parseError) {
    console.error('[Scene Segmentation] JSON parse error:', parseError)
    console.error('[Scene Segmentation] Response text:', text.substring(0, 1000))
    throw new Error('Failed to parse segments JSON')
  }

  // Validate segments
  if (!Array.isArray(segments) || segments.length === 0) {
    throw new Error('Invalid segments format: expected non-empty array')
  }

  // Validate and normalize each segment
  const validMethods = ['I2V', 'EXT', 'T2V', 'FTV']
  for (const seg of segments) {
    if (!seg.sequence || !seg.estimated_duration || !seg.video_generation_prompt) {
      throw new Error('Invalid segment format: missing required fields')
    }
    
    // Normalize generation method
    if (!seg.generation_method || !validMethods.includes(seg.generation_method)) {
      seg.generation_method = 'T2V' // Default to T2V
    }
    
    // Ensure reference_strategy exists
    if (!seg.reference_strategy) {
      seg.reference_strategy = {
        use_scene_frame: seg.sequence === 1,
        use_character_refs: []
      }
    }
    
    // Ensure end_frame_description exists
    if (!seg.end_frame_description) {
      seg.end_frame_description = 'Standard end position'
    }
    
    // Ensure trigger_reason exists
    if (!seg.trigger_reason) {
      seg.trigger_reason = seg.sequence === 1 ? 'Establishing shot' : 'Scene continuation'
    }
    
    // Ensure camera_notes exists
    if (!seg.camera_notes) {
      seg.camera_notes = 'Standard coverage'
    }
    
    // Ensure emotional_beat exists
    if (!seg.emotional_beat) {
      seg.emotional_beat = 'Neutral'
    }
  }

  console.log('[Scene Segmentation] Successfully parsed', segments.length, 'intelligent segments')
  return segments
}

