import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const maxDuration = 120
export const runtime = 'nodejs'

// Simple hash function for staleness detection
function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16)
}

interface GenerateSegmentsRequest {
  preferredDuration: number
  sceneId?: string
  projectId?: string
  focusMode?: string
  customInstructions?: string
  // Reference library integration
  selectedCharacterIds?: string[]
  includeReferencesInPrompts?: boolean
  optimizeForTransitions?: boolean
  // NEW: Narration-driven segmentation
  narrationDriven?: boolean
  narrationDurationSeconds?: number
  narrationText?: string
  narrationAudioUrl?: string
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
  // Phase 8: AI-assigned dialogue coverage
  assigned_dialogue_indices?: number[] // 0-based indices of dialogue lines covered by this segment
  // NEW: AI-recommended generation plan
  generation_plan?: {
    confidence: number
    reasoning: string
    fallback_method?: string
    warnings?: string[]
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sceneId: string }> }
) {
  try {
    const { sceneId } = await params
    const body: GenerateSegmentsRequest = await req.json()
    const { 
      preferredDuration, 
      projectId, 
      focusMode, 
      customInstructions,
      selectedCharacterIds = [],
      includeReferencesInPrompts = true,
      optimizeForTransitions = true,
      // NEW: Narration-driven segmentation options
      narrationDriven = false,
      narrationDurationSeconds,
      narrationText,
      narrationAudioUrl
    } = body

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
    const sceneData = buildComprehensiveSceneData(scene, characters, {
      selectedCharacterIds,
      includeReferencesInPrompts,
      optimizeForTransitions,
      // NEW: Narration-driven options
      narrationDriven,
      narrationDurationSeconds,
      narrationText,
      narrationAudioUrl
    })
    
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

      // Phase 8: Transform dialogue indices to dialogue line IDs
      const dialogueLineIds = (seg.assigned_dialogue_indices || []).map((index: number) => 
        `dialogue-${index}`
      )

      // Build prompt context for staleness detection
      const assignedDialogue = sceneData.dialogue
        .filter((_, didx) => (seg.assigned_dialogue_indices || []).includes(didx))
      const dialogueText = assignedDialogue.map(d => `${d.character}:${d.text}`).join('|')
      const dialogueHash = simpleHash(dialogueText)
      const visualDescriptionHash = simpleHash(sceneData.visualDescription || '')

      // Build generation plan with prerequisites
      const hasSceneFrame = !!sceneData.sceneFrameUrl
      const generatedMethod = methodMap[seg.generation_method] || 'T2V'
      
      const generationPlan = {
        recommendedMethod: generatedMethod,
        confidence: seg.generation_plan?.confidence || (isFirstSegment && hasSceneFrame ? 90 : 70),
        reasoning: seg.generation_plan?.reasoning || seg.trigger_reason || 'AI-recommended method based on segment context',
        fallbackMethod: seg.generation_plan?.fallback_method || (generatedMethod === 'I2V' ? 'T2V' : undefined),
        fallbackReason: generatedMethod === 'I2V' ? 'Use T2V if I2V produces unwanted motion' : undefined,
        prerequisites: [
          {
            type: 'scene-image',
            label: 'Scene keyframe image',
            met: hasSceneFrame,
            required: isFirstSegment,
            assetUrl: sceneData.sceneFrameUrl || undefined,
          },
          ...(idx > 0 ? [{
            type: 'previous-frame',
            label: 'Previous segment last frame',
            met: false, // Will be updated at runtime
            required: false,
          }] : []),
        ],
        batchPriority: idx,
        qualityEstimate: hasSceneFrame ? 85 : 65,
        warnings: seg.generation_plan?.warnings,
      }

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
        generationMethod: generatedMethod,
        triggerReason: seg.trigger_reason,
        endFrameDescription: seg.end_frame_description,
        cameraMovement: seg.camera_notes,
        emotionalBeat: seg.emotional_beat,
        // Phase 8: AI-assigned dialogue coverage (persisted to DB)
        dialogueLineIds,
        // NEW: Generation plan for batch automation
        generationPlan,
        // NEW: Prompt context for staleness detection
        promptContext: {
          dialogueHash,
          visualDescriptionHash,
          generatedAt: new Date().toISOString(),
          sceneNumber: scene.sceneNumber || (typeof sceneId === 'string' ? parseInt(sceneId) : undefined),
        },
        isStale: false,
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
    console.log('[Scene Segmentation] Generated', transformedSegments.length, 'dialogue segments')
    transformedSegments.forEach((seg: any, idx: number) => {
      console.log(`[Scene Segmentation] Segment ${idx + 1}: method=${seg.generationMethod}, trigger="${seg.triggerReason?.substring(0, 50)}...", prompt="${seg.generatedPrompt?.substring(0, 100)}..."`)
    })

    // Note: Establishing shots are now added manually via the UI using the "Add Establishing Shot" button
    // The user can then apply a style (Scale Switch, Living Painting, B-Roll Cutaway) to the segment

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
    referenceImageUrl?: string
    wardrobe?: string
  }>
  estimatedTotalDuration: number
  // Reference options
  includeReferencesInPrompts?: boolean
  optimizeForTransitions?: boolean
  // NEW: Narration-driven segmentation data
  narrationDriven?: boolean
  narrationDurationSeconds?: number
  narrationText?: string
  narrationAudioUrl?: string
  narrationBeats?: Array<{
    text: string
    estimatedDuration: number
    visualSuggestion: string
    emotionalTone: string
  }>
}

function buildComprehensiveSceneData(
  scene: any, 
  characters: any[],
  options?: {
    selectedCharacterIds?: string[]
    includeReferencesInPrompts?: boolean
    optimizeForTransitions?: boolean
    // NEW: Narration-driven options
    narrationDriven?: boolean
    narrationDurationSeconds?: number
    narrationText?: string
    narrationAudioUrl?: string
  }
): ComprehensiveSceneData {
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

  // Extract relevant characters based on selection and scene mentions
  const sceneText = `${heading} ${visualDescription} ${narration || ''} ${dialogue.map((d: any) => `${d.character} ${d.text}`).join(' ')}`.toLowerCase()
  
  // Filter characters: prefer selected ones, fallback to scene mentions
  const selectedIds = options?.selectedCharacterIds || []
  const relevantCharacters = characters
    .filter((c: any) => {
      // If specific characters are selected, use those
      if (selectedIds.length > 0) {
        return selectedIds.includes(c.id)
      }
      // Otherwise, include characters mentioned in the scene
      const charName = (c.name || '').toLowerCase()
      return sceneText.includes(charName)
    })
    .map((c: any) => ({
      name: c.name || 'Unknown',
      description: c.appearanceDescription || c.description || '',
      hasReferenceImage: !!(c.referenceImageUrl || c.imageUrl || c.referenceImage),
      referenceImageUrl: c.referenceImageUrl || c.imageUrl || c.referenceImage || undefined,
      wardrobe: c.defaultWardrobe || c.wardrobe || undefined
    }))

  // Estimate duration based on dialogue (approx 2.5 words per second) + action
  const dialogueWords = dialogue.reduce((acc: number, d: any) => acc + (d.text?.split(' ').length || 0), 0)
  const dialogueDuration = dialogueWords / 2.5
  const actionDuration = Math.max(5, visualDescription.split(' ').length / 5) // Rough estimate
  
  // NEW: Use narration duration if narration-driven mode is enabled
  let estimatedTotalDuration = Math.max(dialogueDuration, actionDuration) + 2 // Buffer
  if (options?.narrationDriven && options.narrationDurationSeconds) {
    estimatedTotalDuration = options.narrationDurationSeconds
  }
  
  // NEW: Analyze narration beats for segment alignment
  const narrationBeats = options?.narrationDriven && (options.narrationText || narration)
    ? analyzeNarrationBeats(options.narrationText || narration || '', estimatedTotalDuration)
    : undefined

  return {
    heading,
    visualDescription,
    narration,
    dialogue,
    sceneDirection,
    sceneFrameUrl,
    characters: relevantCharacters,
    estimatedTotalDuration,
    includeReferencesInPrompts: options?.includeReferencesInPrompts ?? true,
    optimizeForTransitions: options?.optimizeForTransitions ?? true,
    // NEW: Narration-driven data
    narrationDriven: options?.narrationDriven ?? false,
    narrationDurationSeconds: options?.narrationDurationSeconds,
    narrationText: options?.narrationText || narration,
    narrationAudioUrl: options?.narrationAudioUrl,
    narrationBeats
  }
}

/**
 * Analyze narration text to identify visual beats and estimate timing
 * Used for narration-driven segmentation to create segments that illustrate the narration
 */
function analyzeNarrationBeats(
  narrationText: string,
  totalDurationSeconds: number
): Array<{ text: string; estimatedDuration: number; visualSuggestion: string; emotionalTone: string }> {
  if (!narrationText || !narrationText.trim()) {
    return []
  }
  
  // Split narration into sentences
  const sentences = narrationText
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
  
  if (sentences.length === 0) {
    return []
  }
  
  // Estimate duration per sentence based on word count
  const wordsPerSecond = 2.5
  const sentenceData = sentences.map(sentence => {
    const wordCount = sentence.split(/\s+/).length
    const duration = wordCount / wordsPerSecond
    return { sentence, wordCount, duration }
  })
  
  const totalEstimatedDuration = sentenceData.reduce((acc, s) => acc + s.duration, 0)
  const durationScale = totalDurationSeconds / Math.max(totalEstimatedDuration, 1)
  
  // Group sentences into beats (target 6-8 seconds per beat)
  const targetBeatDuration = 7
  const beats: Array<{ text: string; estimatedDuration: number; visualSuggestion: string; emotionalTone: string }> = []
  
  let currentBeat = { sentences: [] as string[], duration: 0 }
  
  for (const data of sentenceData) {
    const scaledDuration = data.duration * durationScale
    
    // If adding this sentence would exceed target, start new beat
    if (currentBeat.duration + scaledDuration > targetBeatDuration * 1.3 && currentBeat.sentences.length > 0) {
      beats.push({
        text: currentBeat.sentences.join(' '),
        estimatedDuration: currentBeat.duration,
        visualSuggestion: generateVisualSuggestion(currentBeat.sentences.join(' ')),
        emotionalTone: detectEmotionalTone(currentBeat.sentences.join(' '))
      })
      currentBeat = { sentences: [], duration: 0 }
    }
    
    currentBeat.sentences.push(data.sentence)
    currentBeat.duration += scaledDuration
  }
  
  // Add remaining sentences as final beat
  if (currentBeat.sentences.length > 0) {
    beats.push({
      text: currentBeat.sentences.join(' '),
      estimatedDuration: currentBeat.duration,
      visualSuggestion: generateVisualSuggestion(currentBeat.sentences.join(' ')),
      emotionalTone: detectEmotionalTone(currentBeat.sentences.join(' '))
    })
  }
  
  return beats
}

/**
 * Generate visual suggestion for a narration beat based on text analysis
 */
function generateVisualSuggestion(text: string): string {
  const lowerText = text.toLowerCase()
  
  // Location/setting keywords
  if (lowerText.includes('city') || lowerText.includes('building') || lowerText.includes('street')) {
    return 'Urban establishing shot or city environment'
  }
  if (lowerText.includes('forest') || lowerText.includes('nature') || lowerText.includes('tree')) {
    return 'Natural environment wide shot'
  }
  if (lowerText.includes('ocean') || lowerText.includes('water') || lowerText.includes('sea')) {
    return 'Water/ocean vista or waterside scene'
  }
  
  // Action keywords
  if (lowerText.includes('run') || lowerText.includes('chase') || lowerText.includes('escape')) {
    return 'Dynamic action sequence with movement'
  }
  if (lowerText.includes('walk') || lowerText.includes('journey') || lowerText.includes('travel')) {
    return 'Walking/traveling sequence'
  }
  
  // Emotional keywords
  if (lowerText.includes('alone') || lowerText.includes('lonely') || lowerText.includes('silent')) {
    return 'Solitary character in contemplative moment'
  }
  if (lowerText.includes('together') || lowerText.includes('friend') || lowerText.includes('family')) {
    return 'Group interaction or relationship moment'
  }
  
  // Default: atmospheric backdrop
  return 'Atmospheric visual that captures the mood of the narration'
}

/**
 * Detect emotional tone of narration text
 */
function detectEmotionalTone(text: string): string {
  const lowerText = text.toLowerCase()
  
  // Positive tones
  if (lowerText.match(/happy|joy|hope|bright|love|warm|beautiful/)) {
    return 'hopeful'
  }
  if (lowerText.match(/excit|thrill|adventure|discover/)) {
    return 'exciting'
  }
  
  // Negative tones
  if (lowerText.match(/dark|fear|danger|threat|shadow/)) {
    return 'ominous'
  }
  if (lowerText.match(/sad|loss|grief|pain|sorrow/)) {
    return 'melancholic'
  }
  if (lowerText.match(/anger|fury|rage|fight|battle/)) {
    return 'intense'
  }
  
  // Neutral/contemplative
  if (lowerText.match(/think|wonder|remember|past|history/)) {
    return 'contemplative'
  }
  if (lowerText.match(/mystery|secret|hidden|unknown/)) {
    return 'mysterious'
  }
  
  return 'neutral'
}

function generateIntelligentSegmentationPrompt(
  sceneData: ComprehensiveSceneData,
  preferredDuration: number
): string {
  // Enhanced character list with wardrobe and reference image info
  const characterList = sceneData.characters.length > 0
    ? sceneData.characters.map(c => {
        let description = `- ${c.name}: ${c.description}`
        if (c.wardrobe) description += ` | Wardrobe: ${c.wardrobe}`
        if (c.hasReferenceImage) description += ' (✓ Reference image available - USE for identity lock)'
        return description
      }).join('\n')
    : '- No specific character references available'

  const dialogueText = sceneData.dialogue.length > 0
    ? sceneData.dialogue.map((d, idx) => `[${idx}] ${d.character}${d.emotion ? ` (${d.emotion})` : ''}: "${d.text}"`).join('\n')
    : 'No dialogue in this scene.'

  // Build additional instructions based on reference options
  const referenceInstructions = sceneData.includeReferencesInPrompts
    ? `
**CHARACTER REFERENCE INTEGRATION (ENABLED):**
For EVERY segment featuring a character with a reference image:
1. Include their FULL appearance description in the prompt (face, hair, body type, ethnicity)
2. Add "reference_strategy.use_character_refs" with their names
3. Describe wardrobe specifically if available
4. Use consistent character descriptions across ALL segments to prevent identity drift
`
    : ''

  const transitionInstructions = sceneData.optimizeForTransitions
    ? `
**FRAME TRANSITION OPTIMIZATION (ENABLED):**
1. End frame descriptions MUST be detailed and actionable for the next segment
2. Describe character positions, expressions, and camera angles precisely
3. For action sequences, describe the exact motion state at frame boundaries
4. Include lighting continuity notes (e.g., "warm sunset glow from left")
5. The start_frame_description should match the previous segment's end_frame_description
`
    : ''

  // NEW: Narration-driven segmentation instructions
  const narrationInstructions = sceneData.narrationDriven
    ? `
**NARRATION-DRIVEN SEGMENTATION (ENABLED):**
This scene has narration that will be played as a cinematic voiceover. Your segments MUST:
1. **ALIGN with narration timing**: Total segment duration must match narration duration (${sceneData.narrationDurationSeconds || sceneData.estimatedTotalDuration} seconds)
2. **ILLUSTRATE the narration**: Each segment's visuals should be an effective BACKDROP to the narration being spoken
3. **DO NOT include narration text in video prompts**: The narration is a separate audio track, not in-video speech
4. **Create EVOCATIVE visuals**: Focus on cinematic imagery that enhances the emotional impact of the narration
5. **Use atmospheric shots**: Wide establishing shots, detail inserts, and mood-setting visuals work well for narration
6. **Match emotional beats**: Segment visuals should match the emotional tone of the corresponding narration section

**NARRATION BEATS TO ILLUSTRATE:**
${sceneData.narrationBeats?.map((beat, idx) => 
  `Beat ${idx + 1} (~${beat.estimatedDuration.toFixed(1)}s): "${beat.text.substring(0, 100)}${beat.text.length > 100 ? '...' : ''}"
   - Suggested visual: ${beat.visualSuggestion}
   - Emotional tone: ${beat.emotionalTone}`
).join('\n\n') || 'Analyze narration and create segments that effectively illustrate the story.'}
`
    : ''

  return `
**SYSTEM ROLE:** You are an AI Video Director and Editor optimized for Veo 3.1 generation workflows. Your goal is to translate a linear script and scene description into distinct, generation-ready video segments with RICH CINEMATIC PROMPTS.
${referenceInstructions}${transitionInstructions}${narrationInstructions}
**OPERATIONAL CONSTRAINTS:**
1. **Duration:** Target ${preferredDuration} seconds per segment (8 seconds absolute max for Veo 3.1). **MINIMUM 4 seconds per segment** unless absolutely necessary for a dramatic cut.
2. **Continuity:** You must utilize specific **Methods** to ensure consistency (matching lighting, character appearance, and room tone).
3. **Lookahead:** Each segment must define the "End Frame State" to prepare for the *next* segment's generation method.
4. **Dialogue Integration:** Veo 3.1 generates speech from text. You MUST include character dialogue directly in prompts.
5. **SEGMENT EFFICIENCY:** Create as FEW segments as possible while respecting the duration limit. **Combine multiple dialogue lines into a single segment** when they occur in the same shot/angle or in a two-shot conversation. A segment with 2-4 lines of back-and-forth dialogue is PREFERRED over creating a new segment for each line.

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
1. **Analyze Triggers:** Scan script for MAJOR changes in Action, Location, or dramatic emotional shift. These are your "Cut Points." **DO NOT create a new segment just because the speaker changes** - dialogue between characters in the same location should be combined into one segment when possible.
2. **Estimate Timing:** Assign estimated seconds to dialogue (approx. 2.5 words/sec) and action. **Combine short dialogue lines (under 3 seconds each) with adjacent dialogue in the same segment.** Only split into Part A and Part B if the combined duration exceeds ${preferredDuration} seconds.
3. **Aim for Efficiency:** Target 3-6 segments for most scenes. If you have more than 8 segments, reconsider whether some can be combined.
4. **Select Method:
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
    "emotional_beat": "Tension building",
    "assigned_dialogue_indices": [0, 1],
    "generation_plan": {
      "confidence": 90,
      "reasoning": "I2V recommended for segment 1 with available scene frame - provides best visual continuity",
      "fallback_method": "T2V",
      "warnings": []
    }
  }
]

**GENERATION PLAN RULES:**
- Include "generation_plan" object with your confidence (0-100) and reasoning for the recommended method
- Explain WHY this method is best for this specific segment (continuity, angle change, dialogue, etc.)
- Include fallback_method if the primary method might not work (e.g., "T2V" if I2V fails)
- Add warnings for potential issues (e.g., "Speaker change may require T2V instead of EXT")
- Higher confidence (80+) for segments with clear method requirements
- Lower confidence (50-70) for ambiguous cases

**DIALOGUE ASSIGNMENT RULES:**
- Include "assigned_dialogue_indices" array with 0-based indices of dialogue lines covered by this segment
- Dialogue lines are numbered [0], [1], [2], etc. in the input
- Each dialogue line should appear in EXACTLY ONE segment
- If dialogue [0] and [1] are spoken in segment 1, include "assigned_dialogue_indices": [0, 1]
- Empty segments (establishing shots, reactions) should have "assigned_dialogue_indices": []

**FINAL CHECKLIST:**
✅ Every line of dialogue from the script appears in a segment prompt
✅ Each dialogue line is assigned to exactly one segment via assigned_dialogue_indices
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

