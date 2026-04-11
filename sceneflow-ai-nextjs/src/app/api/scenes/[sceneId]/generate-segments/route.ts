import { NextRequest, NextResponse } from 'next/server'
import { generateText } from '@/lib/vertexai/gemini'
import { safeParseJsonFromText } from '@/lib/safeJson'
import { moderatePrompt, getUserModerationContext, createBlockedResponse } from '@/lib/moderation'
import { SegmentDirection, detectNoTalentSegment } from '@/types/scene-direction'

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

/**
 * Detect if scene direction indicates no on-screen talent.
 * Uses two-tier detection:
 * 1. Explicit keywords: "no talent", "n/a", "abstract", etc.
 * 2. Semantic heuristic: If talent text describes abstract mood/atmosphere
 *    (e.g., "initial chaos and potential, sudden genesis") rather than
 *    human performance, AND the scene has zero dialogue, treat as no-talent.
 */
function isNoTalentScene(
  talent: string | undefined | null,
  context?: { dialogueCount?: number; characterNames?: string[] }
): boolean {
  if (!talent) return false
  const talentLower = talent.toLowerCase()
  
  // Tier 1: Explicit no-talent indicators
  const noTalentIndicators = [
    'n/a',
    'no on-screen talent',
    'no talent',
    'no actors',
    'no characters',
    'no people',
    'no human',
    'abstract',
    'title sequence',
    'text only',
    'graphics only',
    'vfx only',
    'visual effects only',
  ]
  if (noTalentIndicators.some(indicator => talentLower.includes(indicator))) {
    return true
  }
  
  // Tier 2: Semantic heuristic for abstract/atmospheric talent descriptions
  // If there's no dialogue AND the talent text doesn't reference any known
  // character names AND it reads like mood/atmosphere description, it's no-talent.
  if (context) {
    const hasDialogue = (context.dialogueCount ?? 0) > 0
    if (!hasDialogue) {
      // Check if talent text mentions any actual character names
      const mentionsCharacter = (context.characterNames || []).some(name => 
        talentLower.includes(name.toLowerCase())
      )
      if (!mentionsCharacter) {
        // Atmospheric/abstract indicators — descriptions of mood, not human action
        const abstractIndicators = [
          'chaos', 'genesis', 'dissipation', 'particles', 'luminous',
          'algorithmic', 'computational', 'vortex', 'convergence',
          'contained power', 'immense', 'cosmic', 'ethereal',
          'crystalline', 'fractal', 'nebula', 'dimensional',
          'energy', 'formation', 'implosion', 'revelation',
        ]
        const matchCount = abstractIndicators.filter(w => talentLower.includes(w)).length
        if (matchCount >= 2) {
          console.log(`[isNoTalentScene] Semantic detection: talent text is abstract (${matchCount} indicators), no dialogue, no character names -> treating as no-talent`)
          return true
        }
      }
    }
  }
  
  return false
}

/** How segment clip lengths are chosen (Veo only allows 4 / 6 / 8 s per clip). */
export interface SegmentDurationConfig {
  mode: 'auto' | 'fixed'
  /** When mode is fixed, user-chosen target in 4–8s */
  fixedSeconds: number | null
  /** Soft average from audio ÷ min segments — guides auto mode copy only */
  hintSeconds: number
}

const VEO_VALID_DURATIONS = [4, 6, 8] as const

/**
 * Snap a duration to the nearest valid Veo 3.1 duration (4, 6, or 8 seconds).
 * Always rounds down to stay within limits, with a floor of 4s.
 */
function snapToVeoDuration(duration: number): number {
  if (duration <= 5) return 4
  if (duration <= 7) return 6
  return 8
}

function resolveSegmentDurationConfig(
  body: GenerateSegmentsRequest,
  effectiveAudioDuration: number,
  minimumSegmentsRequired: number
): SegmentDurationConfig {
  const hintSeconds = snapToVeoDuration(
    Math.round(effectiveAudioDuration / Math.max(minimumSegmentsRequired, 1))
  )
  if (body.segmentDurationAuto === true) {
    return { mode: 'auto', fixedSeconds: null, hintSeconds }
  }
  if (typeof body.preferredDuration === 'number' && body.preferredDuration > 0) {
    const fixed = snapToVeoDuration(Math.round(body.preferredDuration))
    return { mode: 'fixed', fixedSeconds: fixed, hintSeconds: fixed }
  }
  return { mode: 'auto', fixedSeconds: null, hintSeconds }
}

function targetSegmentDurationForResponse(config: SegmentDurationConfig): number {
  return config.mode === 'fixed' && config.fixedSeconds != null ? config.fixedSeconds : config.hintSeconds
}

/** Prompt copy: Veo only allows 4 / 6 / 8 s; auto lets the model pick per segment. */
function segmentDurationPromptSection(config: SegmentDurationConfig): string {
  if (config.mode === 'auto') {
    return `
**DURATION (AUTO — PER SEGMENT):** Veo 3.1 accepts **only 4, 6, or 8 seconds** per generated clip (no other durations). For **each** segment, set \`estimated_duration\` to **exactly 4, 6, or 8** based on dialogue timing, breath pauses, and action cut points — **different segments may use different values**. A soft planning average from total audio ÷ minimum clip count is ~${config.hintSeconds}s; use that as a guide, not a hard target. **Never exceed 8s** for any segment. **Minimum 4s** per segment when possible.
**WHEN TO SPLIT:** Split or shorten a segment when the audio and action assigned to it would need **more than 8s** to play naturally; combine adjacent lines in the **same** visual setup when they fit within **one** 4/6/8s clip.
`
  }
  const t = config.fixedSeconds ?? 6
  return `
**DURATION (FIXED TARGET):** Prefer **${t}s** per segment (\`estimated_duration\` must still be **exactly 4, 6, or 8** — use **${t}s** as the default choice). **Never exceed 8s.** Combine lines in the same setup when their total fits; split when combined audio would require **more than 8s**.
`
}

/** Strengthen seamless stitch when dialogue/performance crosses a segment boundary. */
const SEAMLESS_CONTINUATION_PROMPT = `
**SEAMLESS CONTINUATION (MANDATORY):** When the **same** dialogue line, beat, or continuous performance spans **segment N and segment N+1** (or you split for the 8s cap), segment **N+1** MUST begin from the **exact** visual state at the end of segment **N**:
- \`reference_strategy.start_frame_description\` (Phase 2 / legacy) MUST match segment N's \`end_frame_description\` (same pose, expression, wardrobe, props, lighting, framing) — the **last frame of clip N is the first frame of clip N+1**.
- In Phase 1 directions, \`keyframe_start_description\` for segment N+1 MUST match segment N's \`keyframe_end_description\` for the same continuity.
Do **not** reset the character to a new neutral pose between parts of the same line unless the script calls for a deliberate cut.
`

interface GenerateSegmentsRequest {
  /** Target seconds when not using auto (typically 4–8). Omit or ≤0 with segmentDurationAuto for auto. */
  preferredDuration?: number
  /** When true, AI picks 4/6/8s per segment from dialogue and action cuts (default in Segment Builder). */
  segmentDurationAuto?: boolean
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
  // NEW: Audio-aware segmentation - includes dialogue duration
  totalAudioDurationSeconds?: number
  // NEW: Preview mode - returns proposals without committing
  previewMode?: boolean
  // NEW: Two-phase workflow
  phase?: 'directions' | 'prompts'
  // NEW: User-approved directions for phase 2
  approvedDirections?: SegmentDirection[]
  // NEW: Scope controls
  totalDurationTarget?: number    // Total scene duration target in seconds
  segmentCountTarget?: number     // Target number of segments
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
      narrationAudioUrl,
      // NEW: Audio-aware segmentation - includes dialogue duration
      totalAudioDurationSeconds,
      // NEW: Preview mode - returns proposals without committing to DB
      previewMode = false,
      // NEW: Scope controls
      totalDurationTarget,
      segmentCountTarget,
      // NEW: Two-phase workflow
      phase = 'prompts', // Default to legacy behavior (full prompts)
      approvedDirections,
    } = body

    if (!sceneId || !projectId) {
      return NextResponse.json(
        { error: 'Missing required fields: sceneId and projectId' },
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
    
    // Debug logging for cinematic scenes
    console.log('[Scene Segmentation] Found scenes:', allScenes.length)
    console.log('[Scene Segmentation] Looking for sceneId:', sceneId)
    console.log('[Scene Segmentation] Scene IDs available:', allScenes.map((s: any) => s.id || s.sceneId || `index-${s.sceneNumber}`))

    // Find the scene
    let scene: any = null
    scene = allScenes.find((s: any) => s.id === sceneId || s.sceneId === sceneId)
    
    // Check for cinematic scene by ID pattern (cinematic-{type}-{timestamp})
    if (!scene && sceneId.startsWith('cinematic-')) {
      // Try to find by cinematicType field or by ID prefix
      const cinematicMatch = sceneId.match(/^cinematic-(title|outro|establishing|broll|matchcut)-/)
      if (cinematicMatch) {
        const cinematicType = cinematicMatch[1] === 'matchcut' ? 'match-cut' : cinematicMatch[1]
        scene = allScenes.find((s: any) => 
          s.cinematicType === cinematicType || 
          s.id?.startsWith(`cinematic-${cinematicMatch[1]}`)
        )
      }
    }
    
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
      console.error('[Scene Segmentation] Available scene IDs:', allScenes.map((s: any) => s.id || s.sceneId))
      return NextResponse.json(
        { 
          error: 'Scene not found', 
          sceneId, 
          availableScenes: allScenes.length,
          availableIds: allScenes.map((s: any) => s.id || s.sceneId || `scene-${s.sceneNumber}`)
        },
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
      narrationAudioUrl,
      // NEW: Total audio duration for minimum segment calculation
      totalAudioDurationSeconds
    })
    
    // Calculate minimum segments required based on total audio duration
    // Each segment can be max 8 seconds (Veo 3.1 constraint)
    const MAX_SEGMENT_SECONDS = 8
    const timelineAudioSum = sceneData.combinedAudioTimeline.reduce(
      (acc, l) => acc + (typeof l.estimatedDuration === 'number' ? l.estimatedDuration : 0),
      0
    )
    const clientAudioSeconds =
      typeof totalAudioDurationSeconds === 'number' && !Number.isNaN(totalAudioDurationSeconds)
        ? totalAudioDurationSeconds
        : 0
    // Never let a bogus small client value shrink the plan below timeline or script estimate.
    const effectiveAudioDuration = Math.max(
      sceneData.estimatedTotalDuration,
      timelineAudioSum,
      clientAudioSeconds
    )
    const minimumSegmentsRequired = Math.max(1, Math.ceil(effectiveAudioDuration / MAX_SEGMENT_SECONDS))
    const durationConfig = resolveSegmentDurationConfig(body, effectiveAudioDuration, minimumSegmentsRequired)
    const targetSegmentDurationResponse = targetSegmentDurationForResponse(durationConfig)
    
    console.log(
      `[Scene Segmentation] Audio duration: ${effectiveAudioDuration}s, min segments: ${minimumSegmentsRequired}, phase: ${phase}, segmentDuration: ${durationConfig.mode} (hint ${durationConfig.hintSeconds}s)`
    )
    
    // ============================================================================
    // PHASE 1: DIRECTIONS ONLY
    // Returns lightweight segment directions for user review before prompt generation
    // ============================================================================
    if (phase === 'directions') {
      console.log(`[Scene Segmentation] Phase 1: Generating directions only for user review`)
      
      // Generate directions-only prompt (faster, smaller output)
      const directionsPrompt = generateDirectionsOnlyPrompt(sceneData, durationConfig, minimumSegmentsRequired, {
        focusMode,
        customInstructions,
        totalDurationTarget,
        segmentCountTarget,
      })
      
      // Pre-screen content
      const moderationContext = await getUserModerationContext('anonymous', projectId)
      const promptModeration = await moderatePrompt(directionsPrompt, moderationContext)
      
      if (!promptModeration.allowed) {
        return NextResponse.json(
          { error: 'Content policy violation', flaggedCategories: promptModeration.result?.flaggedCategories || [] },
          { status: 403 }
        )
      }
      
      // Call Gemini for directions only
      const rawDirections = await callGeminiForSegmentDirections(directionsPrompt)
      const directions = expandDirectionsForTimelineAudioBudget(
        rawDirections,
        sceneData,
        MAX_SEGMENT_SECONDS
      )
      if (directions.length !== rawDirections.length) {
        console.log(
          `[Scene Segmentation] Phase 1 audio-aware direction split: ${rawDirections.length} → ${directions.length} directions`
        )
      }

      // Transform to SegmentDirection objects
      const segmentDirections: SegmentDirection[] = directions.map((dir: any, idx: number) => ({
        shotType: dir.shot_type || 'Medium Shot',
        cameraMovement: dir.camera_movement || 'Static',
        cameraAngle: dir.camera_angle || 'Eye-Level',
        lens: dir.lens || '50mm',
        talentAction: dir.talent_action || '',
        emotionalBeat: dir.emotional_beat || '',
        characters: dir.characters || [],
        isNoTalent: dir.is_no_talent || detectNoTalentSegment(sceneData.sceneDirection.talent),
        lightingMood: dir.lighting_mood,
        keyProps: dir.key_props || [],
        dialogueLineIds: (dir.dialogue_indices || []).map((i: number) => `dialogue-${i}`),
        isApproved: false,
        isUserEdited: false,
        generationMethod: dir.generation_method || 'FTV',
        triggerReason: dir.trigger_reason || 'AI-determined cut point',
        confidence: dir.confidence || 75,
        transitionIn: dir.transition_in || 'cut',
        startFrameDescription: dir.start_frame_description || '',
        endFrameDescription: dir.end_frame_description || '',
        continuityNotes: dir.continuity_notes || '',
        // Phase 8: Keyframe-specific direction fields
        keyframeStartDescription: dir.keyframe_start_description || '',
        keyframeEndDescription: dir.keyframe_end_description || '',
        environmentDescription: dir.environment_description || '',
        colorPalette: dir.color_palette || '',
        depthOfField: dir.depth_of_field || '',
      }))
      
      console.log(`[Scene Segmentation] Phase 1 complete: ${segmentDirections.length} directions generated`)
      
      return NextResponse.json({
        success: true,
        phase: 'directions',
        directions: segmentDirections,
        targetSegmentDuration: targetSegmentDurationResponse,
        segmentDurationAuto: durationConfig.mode === 'auto',
        sceneData: {
          heading: sceneData.heading,
          dialogueCount: sceneData.dialogue.length,
          characterCount: sceneData.characters.length,
          estimatedDuration: sceneData.estimatedTotalDuration,
          hasSceneFrame: !!sceneData.sceneFrameUrl,
        },
      })
    }
    
    // ============================================================================
    // PHASE 2: PROMPTS FROM APPROVED DIRECTIONS
    // Generates full video prompts using user-approved directions
    // ============================================================================
    if (phase === 'prompts' && approvedDirections && approvedDirections.length > 0) {
      console.log(`[Scene Segmentation] Phase 2: Generating prompts from ${approvedDirections.length} approved directions`)
      
      // Generate prompts based on approved directions
      const promptsFromDirections = generatePromptsFromDirectionsPrompt(sceneData, approvedDirections, durationConfig)
      
      // Pre-screen content
      const moderationContext = await getUserModerationContext('anonymous', projectId)
      const promptModeration = await moderatePrompt(promptsFromDirections, moderationContext)
      
      if (!promptModeration.allowed) {
        return NextResponse.json(
          { error: 'Content policy violation', flaggedCategories: promptModeration.result?.flaggedCategories || [] },
          { status: 403 }
        )
      }
      
      // Call Gemini with approved directions to generate full prompts
      const rawSegments = await callGeminiForPromptsFromDirections(promptsFromDirections)
      
      const withAudioAwareDuration = applyAssignedAudioDurationToSegments(rawSegments, sceneData)
      const segments = enforceMaxSegmentDuration(withAudioAwareDuration, MAX_SEGMENT_SECONDS, sceneData)
      if (segments.length !== rawSegments.length) {
        console.log(`[Scene Segmentation] Post-LLM split: ${rawSegments.length} → ${segments.length} segments`)
      }
      
      // Transform to full segment structure (same as legacy flow)
      const transformedSegments = transformSegmentsToOutput(segments, sceneData, sceneId, scene, approvedDirections)
      
      console.log(`[Scene Segmentation] Phase 2 complete: ${transformedSegments.length} segments with prompts`)
      
      return NextResponse.json({
        success: true,
        phase: 'prompts',
        segments: transformedSegments,
        targetSegmentDuration: targetSegmentDurationResponse,
        segmentDurationAuto: durationConfig.mode === 'auto',
        previewMode,
        sceneBibleHash: sceneData.visualDescriptionHash || '',
      })
    }
    
    // ============================================================================
    // LEGACY FLOW: Full segments in one call (backwards compatible)
    // ============================================================================
    console.log(`[Scene Segmentation] Legacy flow: Generating full segments in one call`)
    
    // Generate intelligent segmentation prompt
    const prompt = generateIntelligentSegmentationPrompt(sceneData, durationConfig, minimumSegmentsRequired)

    // Pre-screen prompt content before generation to prevent unfunded credits
    // This runs at 100% coverage - text moderation is ~$0.0005/1K chars
    const moderationContext = await getUserModerationContext('anonymous', projectId)
    const promptModeration = await moderatePrompt(prompt, moderationContext)
    
    if (!promptModeration.allowed) {
      console.warn(`[Scene Segmentation] Prompt blocked by moderation for scene ${sceneId}`)
      return NextResponse.json(
        {
          error: 'Content policy violation',
          message: 'The scene description contains content that violates our content policy. Please modify the scene and try again.',
          flaggedCategories: promptModeration.result?.flaggedCategories || [],
        },
        { status: 403 }
      )
    }

    // Call Gemini for intelligent segmentation
    const rawSegments = await callGeminiForIntelligentSegmentation(prompt)

    const withAudioAwareDuration = applyAssignedAudioDurationToSegments(rawSegments, sceneData)
    const segments = enforceMaxSegmentDuration(withAudioAwareDuration, MAX_SEGMENT_SECONDS, sceneData)
    if (segments.length !== rawSegments.length) {
      console.log(`[Scene Segmentation] Post-LLM split: ${rawSegments.length} → ${segments.length} segments`)
    }

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
      const generatedMethod = methodMap[seg.generation_method] || 'FTV'
      
      const generationPlan = {
        recommendedMethod: generatedMethod,
        confidence: seg.generation_plan?.confidence || (isFirstSegment && hasSceneFrame ? 90 : 70),
        reasoning: seg.generation_plan?.reasoning || seg.trigger_reason || 'AI-recommended method based on segment context',
        fallbackMethod: seg.generation_plan?.fallback_method || (generatedMethod === 'I2V' ? 'FTV' : undefined),
        fallbackReason: generatedMethod === 'I2V' ? 'Use FTV if I2V produces unwanted motion' : undefined,
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
    console.log('[Scene Segmentation] Generated', transformedSegments.length, 'dialogue segments', previewMode ? '(preview mode)' : '')
    transformedSegments.forEach((seg: any, idx: number) => {
      console.log(`[Scene Segmentation] Segment ${idx + 1}: method=${seg.generationMethod}, trigger="${seg.triggerReason?.substring(0, 50)}...", prompt="${seg.generatedPrompt?.substring(0, 100)}..."`)
    })

    // Note: Establishing shots are now added manually via the UI using the "Add Establishing Shot" button
    // The user can then apply a style (Scale Switch, Living Painting, B-Roll Cutaway) to the segment

    return NextResponse.json({
      success: true,
      segments: transformedSegments,
      targetSegmentDuration: targetSegmentDurationResponse,
      segmentDurationAuto: durationConfig.mode === 'auto',
      // Preview mode indicator - segments are proposals, not committed
      previewMode,
      // Include scene bible hash for staleness detection on finalize
      sceneBibleHash: sceneData.visualDescriptionHash || '',
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

/** Normalize dialogue audio blobs from scene (en vs en-US vs array). */
function getDialogueAudioEntriesFromScene(scene: any): any[] {
  const da = scene?.dialogueAudio
  if (!da) return []
  if (Array.isArray(da)) return da
  const keyed =
    da.en ||
    da['en-US'] ||
    da.en_US ||
    da['en-GB'] ||
    null
  if (Array.isArray(keyed)) return keyed
  const first = Object.values(da).find((v): v is any[] => Array.isArray(v) && v.length > 0)
  return Array.isArray(first) ? first : []
}

/** Seconds from a dialogue audio entry; supports ms heuristics. */
function durationFromAudioEntry(entry: any, fallbackSeconds: number): number {
  if (!entry || typeof entry !== 'object') return fallbackSeconds
  const raw = entry.duration ?? entry.durationSeconds
  if (typeof raw !== 'number' || raw <= 0 || Number.isNaN(raw)) return fallbackSeconds
  if (raw > 600 && raw < 3_600_000) return raw / 1000
  return raw
}

/** Before max-duration split: if assigned audio is longer than estimated_duration, extend it. */
function applyAssignedAudioDurationToSegments(
  segments: IntelligentSegment[],
  sceneData: ComprehensiveSceneData
): IntelligentSegment[] {
  const tl = sceneData.combinedAudioTimeline
  return segments.map(seg => {
    const idxs = seg.assigned_dialogue_indices || []
    if (idxs.length === 0) return seg
    const audioSum = idxs.reduce((acc, i) => {
      const line = tl[i]
      return acc + (typeof line?.estimatedDuration === 'number' ? line.estimatedDuration : 0)
    }, 0)
    const est = typeof seg.estimated_duration === 'number' ? seg.estimated_duration : 0
    if (audioSum <= est + 0.2) return seg
    return { ...seg, estimated_duration: audioSum }
  })
}

/** Phase 1: split raw direction rows when assigned timeline audio exceeds Veo max (mirrors segment split). */
function expandDirectionsForTimelineAudioBudget(
  rawDirections: any[],
  sceneData: ComprehensiveSceneData,
  maxDuration: number
): any[] {
  const tl = sceneData.combinedAudioTimeline
  const result: any[] = []

  for (const dir of rawDirections) {
    const dialogueIndices: number[] = dir.dialogue_indices || []
    const audioSum = dialogueIndices.reduce((acc, i) => {
      const line = tl[i]
      return acc + (typeof line?.estimatedDuration === 'number' ? line.estimatedDuration : 0)
    }, 0)
    const est = typeof dir.estimated_duration === 'number' ? dir.estimated_duration : 0
    const originalDuration = Math.max(est, audioSum)

    if (originalDuration <= maxDuration + 0.2) {
      result.push(dir)
      continue
    }

    const numParts = Math.ceil(originalDuration / maxDuration)
    const rawPartDuration = originalDuration / numParts
    const subDurations: number[] = []
    let remaining = originalDuration
    for (let i = 0; i < numParts; i++) {
      if (i === numParts - 1) {
        subDurations.push(snapToVeoDuration(remaining))
      } else {
        const snapped = snapToVeoDuration(rawPartDuration)
        subDurations.push(snapped)
        remaining -= snapped
      }
    }

    const dialoguePerPart =
      dialogueIndices.length <= 1 ? 1 : Math.ceil(dialogueIndices.length / numParts)

    for (let i = 0; i < numParts; i++) {
      const partDialogue =
        dialogueIndices.length === 1
          ? [...dialogueIndices]
          : dialogueIndices.slice(i * dialoguePerPart, (i + 1) * dialoguePerPart)

      result.push({
        ...dir,
        estimated_duration: subDurations[i],
        dialogue_indices: partDialogue,
        trigger_reason:
          i === 0
            ? dir.trigger_reason
            : `Continuation ${i + 1}/${numParts} — ${dir.trigger_reason || 'split for audio length'}`,
      })
    }
  }

  return result
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
  // Unified audio timeline: narration + dialogue merged as indexed audio lines
  combinedAudioTimeline: Array<{
    index: number
    type: 'narration' | 'dialogue'
    character: string
    text: string
    emotion?: string
    estimatedDuration: number
    visualNote?: string // For narration: what visuals to show
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
    // NEW: Total audio duration (includes dialogue)
    totalAudioDurationSeconds?: number
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
  // CRITICAL: Skip character extraction for no-talent scenes to prevent injection
  const allCharacterNames = characters.map((c: any) => c.name || '').filter(Boolean)
  const sceneIsNoTalent = isNoTalentScene(sceneDirection.talent, {
    dialogueCount: dialogue.length,
    characterNames: allCharacterNames,
  })
  
  let relevantCharacters: Array<{
    name: string
    description: string
    hasReferenceImage: boolean
    referenceImageUrl?: string
    wardrobe?: string
  }> = []
  
  if (!sceneIsNoTalent) {
    const sceneText = `${heading} ${visualDescription} ${narration || ''} ${dialogue.map((d: any) => `${d.character} ${d.text}`).join(' ')}`.toLowerCase()
    
    // Filter characters: prefer selected ones, fallback to scene mentions
    const selectedIds = options?.selectedCharacterIds || []
    relevantCharacters = characters
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
  } else {
    console.log(`[buildComprehensiveSceneData] No-talent scene detected — suppressing character extraction`)
  }

  // Estimate duration based on dialogue (approx 2.5 words per second) + action
  const dialogueWords = dialogue.reduce((acc: number, d: any) => acc + (d.text?.split(' ').length || 0), 0)
  const dialogueDuration = dialogueWords / 2.5
  const actionDuration = Math.max(5, visualDescription.split(' ').length / 5) // Rough estimate
  
  // Use the LONGEST audio source as the authoritative duration:
  // 1. Total audio duration (includes both narration and dialogue) - sent from client
  // 2. Narration duration (if narration-driven mode) - narration is the primary audio
  // 3. Estimated from dialogue words + action description - fallback calculation
  let estimatedTotalDuration = Math.max(dialogueDuration, actionDuration) + 2 // Buffer
  
  // If total audio duration is provided (from actual audio files), use it as the floor
  if (options?.totalAudioDurationSeconds && options.totalAudioDurationSeconds > estimatedTotalDuration) {
    estimatedTotalDuration = options.totalAudioDurationSeconds
    console.log(`[buildComprehensiveSceneData] Using totalAudioDuration: ${estimatedTotalDuration}s (overrides estimate of ${Math.max(dialogueDuration, actionDuration) + 2}s)`)
  }
  
  // Narration duration takes highest priority when narration-driven
  if (options?.narrationDriven && options.narrationDurationSeconds) {
    estimatedTotalDuration = Math.max(estimatedTotalDuration, options.narrationDurationSeconds)
    console.log(`[buildComprehensiveSceneData] Narration-driven mode: duration = ${estimatedTotalDuration}s`)
  }
  // NEW: Analyze narration beats for segment alignment
  const narrationBeats = options?.narrationDriven && (options.narrationText || narration)
    ? analyzeNarrationBeats(options.narrationText || narration || '', estimatedTotalDuration)
    : undefined

  // Build combined audio timeline: merge narration sentences + dialogue into one indexed list
  // This is the PRIMARY input for Gemini segmentation — it sees ONE unified audio track
  const combinedAudioTimeline: ComprehensiveSceneData['combinedAudioTimeline'] = []
  
  const narrationTextForTimeline = options?.narrationText || narration || ''
  if (narrationTextForTimeline.trim()) {
    // Split narration into sentences
    const narrationSentences = narrationTextForTimeline
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
    
    // Calculate narration duration per sentence
    const narrationTotalWords = narrationSentences.reduce((acc, s) => acc + s.split(/\s+/).length, 0)
    const narrationDur = options?.narrationDurationSeconds || estimatedTotalDuration
    
    for (const sentence of narrationSentences) {
      const wordCount = sentence.split(/\s+/).length
      const sentenceDuration = narrationTotalWords > 0 
        ? (wordCount / narrationTotalWords) * narrationDur 
        : wordCount / 2.5
      
      combinedAudioTimeline.push({
        index: combinedAudioTimeline.length,
        type: 'narration',
        character: 'NARRATOR',
        text: sentence,
        estimatedDuration: Math.round(sentenceDuration * 10) / 10,
        visualNote: 'Cinematic backdrop visuals — voiceover audio, NOT lip-sync',
      })
    }
  }
  
  const dialogueAudioEntries = getDialogueAudioEntriesFromScene(scene)

  // Interleave dialogue lines after narration
  // In most scenes, narration plays OVER the scene while dialogue is interspersed
  dialogue.forEach((d: { character: string; text: string; emotion?: string | null }, di: number) => {
    const wordEst =
      Math.round(((d.text || '').split(/\s+/).filter(Boolean).length / 2.5) * 10) / 10
    const entry =
      dialogueAudioEntries.find((e: any) => e.dialogueIndex === di) ?? dialogueAudioEntries[di]
    const estimatedDuration = Math.round(durationFromAudioEntry(entry, wordEst) * 10) / 10

    combinedAudioTimeline.push({
      index: combinedAudioTimeline.length,
      type: 'dialogue',
      character: d.character,
      text: d.text,
      emotion: d.emotion || undefined,
      estimatedDuration,
    })
  })

  const timelineSum = combinedAudioTimeline.reduce(
    (acc, l) => acc + (typeof l.estimatedDuration === 'number' ? l.estimatedDuration : 0),
    0
  )
  estimatedTotalDuration = Math.max(estimatedTotalDuration, timelineSum)

  console.log(
    `[buildComprehensiveSceneData] Combined audio timeline: ${combinedAudioTimeline.length} lines (${combinedAudioTimeline.filter(l => l.type === 'narration').length} narration, ${combinedAudioTimeline.filter(l => l.type === 'dialogue').length} dialogue), ~${Math.round(timelineSum)}s audio`
  )

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
    narrationBeats,
    combinedAudioTimeline,
  }
}

/**
 * Analyze narration text to identify visual beats and estimate timing
 * Used for narration-driven segmentation to create segments that illustrate the narration
 * Enforces Veo 3.1's 8-second maximum segment duration while splitting at natural sentence boundaries
 */
function analyzeNarrationBeats(
  narrationText: string,
  totalDurationSeconds: number
): Array<{ text: string; estimatedDuration: number; visualSuggestion: string; emotionalTone: string }> {
  if (!narrationText || !narrationText.trim()) {
    return []
  }
  
  // Veo 3.1 constraint: max 8 seconds per segment
  const MAX_SEGMENT_DURATION = 8.0
  const TARGET_SEGMENT_DURATION = 6.0 // Target 6 seconds to leave room for timing variance
  const MIN_SEGMENT_DURATION = 3.0 // Minimum segment to avoid too-short clips
  
  // Split narration into sentences (preserving punctuation context)
  const sentences = narrationText
    .split(/(?<=[.!?])\s+/)
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
  
  // Group sentences into beats, enforcing MAX_SEGMENT_DURATION
  const beats: Array<{ text: string; estimatedDuration: number; visualSuggestion: string; emotionalTone: string }> = []
  
  let currentBeat = { sentences: [] as string[], duration: 0 }
  
  for (const data of sentenceData) {
    const scaledDuration = data.duration * durationScale
    
    // Case 1: Single sentence exceeds max - split at phrase/clause boundaries
    if (scaledDuration > MAX_SEGMENT_DURATION) {
      // First, finish current beat if any
      if (currentBeat.sentences.length > 0) {
        beats.push({
          text: currentBeat.sentences.join(' '),
          estimatedDuration: Math.min(currentBeat.duration, MAX_SEGMENT_DURATION),
          visualSuggestion: generateVisualSuggestion(currentBeat.sentences.join(' ')),
          emotionalTone: detectEmotionalTone(currentBeat.sentences.join(' '))
        })
        currentBeat = { sentences: [], duration: 0 }
      }
      
      // Split long sentence at clause boundaries (comma, semicolon, em-dash, or 'and')
      const clauses = data.sentence
        .split(/(?<=[,;—–])\s*|\s+(?=and\s)/i)
        .map(c => c.trim())
        .filter(c => c.length > 0)
      
      if (clauses.length > 1) {
        // Combine clauses into chunks under max duration
        let clauseChunk: string[] = []
        let chunkDuration = 0
        const clauseWordsPerSecond = 2.5
        
        for (const clause of clauses) {
          const clauseWords = clause.split(/\s+/).length
          const clauseDuration = (clauseWords / clauseWordsPerSecond) * durationScale
          
          if (chunkDuration + clauseDuration > MAX_SEGMENT_DURATION && clauseChunk.length > 0) {
            beats.push({
              text: clauseChunk.join(' '),
              estimatedDuration: Math.min(chunkDuration, MAX_SEGMENT_DURATION),
              visualSuggestion: generateVisualSuggestion(clauseChunk.join(' ')),
              emotionalTone: detectEmotionalTone(clauseChunk.join(' '))
            })
            clauseChunk = []
            chunkDuration = 0
          }
          clauseChunk.push(clause)
          chunkDuration += clauseDuration
        }
        
        // Add remaining clauses
        if (clauseChunk.length > 0) {
          beats.push({
            text: clauseChunk.join(' '),
            estimatedDuration: Math.min(chunkDuration, MAX_SEGMENT_DURATION),
            visualSuggestion: generateVisualSuggestion(clauseChunk.join(' ')),
            emotionalTone: detectEmotionalTone(clauseChunk.join(' '))
          })
        }
      } else {
        // Can't split further - cap at max duration and warn
        console.warn(`[analyzeNarrationBeats] Sentence exceeds ${MAX_SEGMENT_DURATION}s and cannot be split: "${data.sentence.substring(0, 50)}..."`)
        beats.push({
          text: data.sentence,
          estimatedDuration: MAX_SEGMENT_DURATION, // Cap at max
          visualSuggestion: generateVisualSuggestion(data.sentence),
          emotionalTone: detectEmotionalTone(data.sentence)
        })
      }
      continue
    }
    
    // Case 2: Adding this sentence would exceed max - start new beat
    if (currentBeat.duration + scaledDuration > MAX_SEGMENT_DURATION && currentBeat.sentences.length > 0) {
      beats.push({
        text: currentBeat.sentences.join(' '),
        estimatedDuration: currentBeat.duration,
        visualSuggestion: generateVisualSuggestion(currentBeat.sentences.join(' ')),
        emotionalTone: detectEmotionalTone(currentBeat.sentences.join(' '))
      })
      currentBeat = { sentences: [], duration: 0 }
    }
    
    // Case 3: If current beat would be a good size, consider starting fresh
    if (currentBeat.duration >= TARGET_SEGMENT_DURATION && 
        currentBeat.duration + scaledDuration > TARGET_SEGMENT_DURATION * 1.2 &&
        scaledDuration >= MIN_SEGMENT_DURATION) {
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
      estimatedDuration: Math.min(currentBeat.duration, MAX_SEGMENT_DURATION),
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
  durationConfig: SegmentDurationConfig,
  minimumSegmentsRequired: number = 1
): string {
  // CRITICAL: Check if this is a no-talent scene (title sequence, abstract, etc.)
  const noTalentScene = isNoTalentScene(sceneData.sceneDirection.talent, {
    dialogueCount: sceneData.dialogue.length,
    characterNames: sceneData.characters.map(c => c.name),
  })
  
  // Enhanced character list with wardrobe and reference image info
  // SKIP character list entirely for no-talent scenes
  const characterList = noTalentScene 
    ? '- NO CHARACTERS IN THIS SCENE - This is an abstract/title sequence with no on-screen talent'
    : sceneData.characters.length > 0
      ? sceneData.characters.map(c => {
          let description = `- ${c.name}: ${c.description}`
          if (c.wardrobe) description += ` | Wardrobe: ${c.wardrobe}`
          if (c.hasReferenceImage) description += ' (✓ Reference image available - USE for identity lock)'
          return description
        }).join('\n')
      : '- No specific character references available'

  // Build UNIFIED AUDIO TIMELINE for Phase 2 (same as Phase 1)
  const p2HasNarration = sceneData.combinedAudioTimeline.some(l => l.type === 'narration')
  const p2HasDialogue = sceneData.combinedAudioTimeline.some(l => l.type === 'dialogue')
  const p2TotalTimelineDuration = sceneData.combinedAudioTimeline.reduce((acc, l) => acc + l.estimatedDuration, 0)
  
  const audioTimelineText = noTalentScene && !p2HasNarration && !p2HasDialogue
    ? 'NO AUDIO LINES - No on-screen talent or narration'
    : sceneData.combinedAudioTimeline.map(line => {
        const typeTag = line.type === 'narration' ? '🎙️ VOICEOVER' : '🗣️ DIALOGUE'
        const emotionTag = line.emotion ? ` (${line.emotion})` : ''
        const visualTag = line.type === 'narration' 
          ? ' → [Backdrop visuals — NOT lip-synced]' 
          : ' → [Character lip-sync on screen]'
        return `[${line.index}] ${typeTag} | ${line.character}${emotionTag}: "${line.text}" (~${line.estimatedDuration}s)${visualTag}`
      }).join('\n')

  // Build minimum segment constraint instruction
  const minimumSegmentInstruction = minimumSegmentsRequired > 1
    ? `
**AUDIO-DURATION CONSTRAINT (MANDATORY):**
Based on the total audio duration (narration + dialogue), you MUST create at least ${minimumSegmentsRequired} segments.
This ensures that each segment stays within the 8-second maximum for Veo 3.1 video generation.
- Total audio requires minimum ${minimumSegmentsRequired} segments
- DO NOT create fewer than ${minimumSegmentsRequired} segments
- Split long narration/dialogue at natural sentence boundaries
`
    : ''

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
5. The start_frame_description MUST match the previous segment's end_frame_description (same instant — seamless stitch)
`
    : ''

  // CRITICAL: No-talent scene instructions - prevents character injection
  const noTalentInstructions = noTalentScene
    ? `
**🚫 CRITICAL: NO ON-SCREEN TALENT SCENE 🚫**
The scene direction explicitly states: "${sceneData.sceneDirection.talent}"

This means:
- DO NOT include any people, characters, faces, or human figures in video_generation_prompt
- DO NOT include any dialogue as spoken text - there are no speakers on screen
- DO NOT reference character names or appearances
- This is likely an abstract scene, title sequence, or visual-only backdrop
- Focus on: environment, VFX elements, text/graphics, atmospheric visuals
- Any audio (narration/voiceover) is a SEPARATE AUDIO TRACK played over the video, NOT generated by Veo
- Use "reference_strategy.use_character_refs": [] (empty array) for ALL segments

**WHAT TO GENERATE INSTEAD:**
- Cinematic establishing shots of environments
- Abstract visual patterns, VFX, motion graphics
- Title text reveals, logo animations
- Atmospheric B-roll footage
- Nature/cityscape/landscape shots
- Data visualizations, digital interfaces
`
    : ''

  // Voiceover note for Phase 2 (if scene has narration in timeline)
  const p2VoiceoverNote = p2HasNarration
    ? `\n**VOICEOVER AUDIO LINES:** This scene has narration (🎙️ lines in the audio timeline). The narration is a SEPARATE audio track — do NOT include narration text as spoken dialogue in video_generation_prompt. Create evocative BACKDROP visuals that ILLUSTRATE the narration content.\n`
    : ''

  return `
**SYSTEM ROLE:** You are an AI Video Director and Editor optimized for Veo 3.1 generation workflows. Your goal is to translate a linear script and scene description into distinct, generation-ready video segments with RICH CINEMATIC PROMPTS.
${noTalentInstructions}${referenceInstructions}${transitionInstructions}${SEAMLESS_CONTINUATION_PROMPT}${p2VoiceoverNote}${minimumSegmentInstruction}
**OPERATIONAL CONSTRAINTS:**
1. ${segmentDurationPromptSection(durationConfig).trim()}
2. **Continuity:** You must utilize specific **Methods** to ensure consistency (matching lighting, character appearance, and room tone).
3. **Lookahead:** Each segment must define the "End Frame State" to prepare for the *next* segment's generation method.
4. **Audio Integration:** Veo 3.1 generates speech from text. For 🗣️ DIALOGUE lines, include character dialogue directly in prompts as: Character speaks, "text". For 🎙️ VOICEOVER lines, create backdrop visuals (do NOT include narration text in video prompts).
5. **SEGMENT EFFICIENCY:** Create as FEW segments as possible while respecting the duration limit. **Combine multiple audio lines into a single segment** when they occur in the same visual setup. A segment with 2-4 adjacent audio lines is PREFERRED over creating a new segment for each line.${minimumSegmentsRequired > 1 ? `\n6. **MINIMUM SEGMENTS:** You MUST create at least ${minimumSegmentsRequired} segments to cover the audio duration.` : ''}

**INPUT DATA:**

## Scene Heading
${sceneData.heading}

## Visual Description / Action
${sceneData.visualDescription}

## Audio Timeline (${sceneData.combinedAudioTimeline.length} lines, ~${Math.round(p2TotalTimelineDuration)}s total)
${audioTimelineText}

## Audio Timeline Rules
- 🎙️ VOICEOVER lines: Narration audio track. Video shows BACKDROP visuals. Do NOT include narration text as spoken words in video_generation_prompt.
- 🗣️ DIALOGUE lines: Character speaks on screen with lip-sync. Include dialogue in video_generation_prompt as: Character speaks, "text"
- "assigned_dialogue_indices" references indices [0], [1], [2]... from the Audio Timeline
- EVERY audio line index MUST appear in exactly ONE segment
- Segment duration ≈ sum of its assigned audio line durations

## Director's Chair Notes
**Camera:** ${sceneData.sceneDirection.camera}
**Lighting:** ${sceneData.sceneDirection.lighting}
**Scene/Environment:** ${sceneData.sceneDirection.scene}
**Talent/Blocking:** ${sceneData.sceneDirection.talent}
**Audio/Atmosphere:** ${sceneData.sceneDirection.audio}

## Available Character References
${characterList}

## Scene Frame Available
${sceneData.sceneFrameUrl ? 'Yes - Master scene frame is available for I2V on Segment 1' : 'No - Use FTV with detailed keyframe descriptions'}

## Estimated Scene Duration
${Math.round(sceneData.estimatedTotalDuration)} seconds total

---

**LOGIC WORKFLOW:**
1. **Analyze Triggers:** Scan script for MAJOR changes in Action, Location, or dramatic emotional shift. These are your "Cut Points." **DO NOT create a new segment just because the speaker changes** - dialogue between characters in the same location should be combined into one segment when possible.
2. **Estimate Timing:** Assign estimated seconds to dialogue (approx. 2.5 words/sec) and action. **Combine short dialogue lines with adjacent dialogue in the same segment** when they fit in **one** Veo clip (4/6/8s). Split only when the combined audio/action for one clip would **exceed 8s** or when there is a **major** visual/camera change.
3. **Aim for Efficiency:** Target 3-6 segments for most scenes. If you have more than 8 segments, reconsider whether some can be combined.
4. **Select Method:**
   - **FTV (Frame-to-Video):** DEFAULT method. Uses start and end keyframe images to generate video between them. Use for ALL segments except segment 1 with scene frame.
   - **I2V (Image-to-Video):** STRICTLY for Segment 1 (using the Master Scene Frame) or static establishing shots.
   - **EXT (Extend):** Use ONLY when camera angle remains IDENTICAL and action simply continues (e.g., uninterrupted monologue from same angle, continuous walk). NEVER use when cutting between different characters.
   - **T2V (Text-to-Video):** FALLBACK ONLY — use when keyframes cannot be generated (pure VFX, abstract motion graphics). Never use as default.

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

Segment 2 (Character dialogue - FTV):
"Medium Shot, reflection in vanity mirror. Alex Anderson stares into the mirror, adjusting his tie with trembling hands. Alex speaks with rapid breathing, 'I don't know if we're ready for this, Dad. Vance has the entire board in her pocket.' Lighting is clinical with a soft top-light. Rack focus from reflection to actual face. High contrast, sweaty skin texture."

Segment 3 (Reverse angle, new speaker - FTV):
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
      "fallback_method": "FTV",
      "warnings": []
    }
  }
]

**GENERATION PLAN RULES:**
- Include "generation_plan" object with your confidence (0-100) and reasoning for the recommended method
- Explain WHY this method is best for this specific segment (continuity, angle change, dialogue, etc.)
- Include fallback_method if the primary method might not work (e.g., "FTV" if I2V fails)
- Add warnings for potential issues (e.g., "Speaker change may require FTV instead of EXT")
- Higher confidence (80+) for segments with clear method requirements
- Lower confidence (50-70) for ambiguous cases

**AUDIO LINE ASSIGNMENT RULES:**
- Include "assigned_dialogue_indices" array with 0-based indices from the AUDIO TIMELINE (both 🎙️ voiceover and 🗣️ dialogue lines)
- Audio lines are numbered [0], [1], [2], etc. in the Audio Timeline input
- Each audio line should appear in EXACTLY ONE segment
- If audio lines [0] and [1] are covered by segment 1, include "assigned_dialogue_indices": [0, 1]
- For 🗣️ DIALOGUE lines: include the character's spoken text in video_generation_prompt
- For 🎙️ VOICEOVER lines: do NOT include narration text in video_generation_prompt — create backdrop visuals instead

**FINAL CHECKLIST:**
✅ Every audio line from the Audio Timeline appears in a segment via assigned_dialogue_indices
✅ Each audio line is assigned to exactly one segment
✅ 🗣️ Dialogue is formatted as: [Name] speaks, "[text]" in video_generation_prompt
✅ 🎙️ Voiceover lines are NOT included as spoken text — backdrop visuals only
✅ Each prompt is 50-150 words with specific lens/camera language
✅ Segment 1 uses I2V if scene frame available, otherwise FTV
✅ NEVER use EXT when cutting between characters or changing angles
✅ End frame descriptions set up the next segment
✅ Trigger reasons explain WHY we cut here

Return ONLY valid JSON array. No markdown code blocks, no explanatory text.
`
}

/** Smart quotes, trailing commas — fixes many Gemini JSON mode slips without full repair. */
function repairModelJsonSurface(s: string): string {
  return s
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/,\s*([}\]])/g, '$1')
}

/** Model sometimes returns `{ "segments": [...] }` instead of a bare array. */
function coerceTopLevelJsonArray(v: unknown): any[] | null {
  if (Array.isArray(v) && v.length > 0) return v
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>
    for (const k of ['segments', 'directions', 'items', 'data', 'results'] as const) {
      const a = o[k]
      if (Array.isArray(a) && a.length > 0) return a
    }
  }
  return null
}

async function callGeminiForIntelligentSegmentation(prompt: string): Promise<IntelligentSegment[]> {
  console.log(`[Scene Segmentation] Calling Vertex AI Gemini...`)
  
  const result = await generateText(prompt, {
    temperature: 0.7,
    maxOutputTokens: 32768, // Increased for complex segmentation responses
    responseMimeType: 'application/json',
    timeoutMs: 100000, // 100s timeout (buffer for Vercel's 120s limit)
    thinkingLevel: 'minimal', // Disable deep thinking to reduce latency
  })
  
  console.log(`[Scene Segmentation] Success, finishReason: ${result.finishReason || 'unknown'}`)
  
  // Check for truncated response due to token limit
  if (result.finishReason === 'MAX_TOKENS') {
    console.warn('[Scene Segmentation] Response may be truncated (MAX_TOKENS), attempting parse...')
  }
  
  return parseGeminiResponseText(result.text)
}

function parseGeminiResponseText(text: string): IntelligentSegment[] {
  if (!text) {
    console.error('[Scene Segmentation] No text in response')
    throw new Error('No segments generated from Gemini')
  }

  let segments: IntelligentSegment[]
  try {
    // Remove markdown code blocks if present
    let cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    cleanedText = repairModelJsonSurface(cleanedText)

    // Try to repair truncated JSON arrays
    if (!cleanedText.endsWith(']')) {
      console.warn('[Scene Segmentation] JSON appears truncated, attempting repair...')
      
      // Find the last complete object by looking for the last "}," or "}"
      const lastCompleteObjectEnd = cleanedText.lastIndexOf('},')
      const lastObjectEnd = cleanedText.lastIndexOf('}')
      
      if (lastCompleteObjectEnd > 0) {
        // There are complete objects followed by incomplete ones
        cleanedText = cleanedText.substring(0, lastCompleteObjectEnd + 1) + ']'
        console.log('[Scene Segmentation] Repaired JSON by removing incomplete trailing object')
      } else if (lastObjectEnd > 0 && cleanedText.startsWith('[')) {
        // Only one object, try to close it
        cleanedText = cleanedText.substring(0, lastObjectEnd + 1) + ']'
        console.log('[Scene Segmentation] Repaired JSON by closing array')
      }
    }
    
    segments = JSON.parse(cleanedText)
  } catch (parseError) {
    console.error('[Scene Segmentation] JSON parse error:', parseError)
    console.error('[Scene Segmentation] Response text:', text.substring(0, 1500))
    const cleaned = repairModelJsonSurface(
      text.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim()
    )
    let segmentsFromFallback: IntelligentSegment[] | null = null
    try {
      const v = safeParseJsonFromText(cleaned)
      const arr = coerceTopLevelJsonArray(v)
      if (arr && arr.length > 0) {
        console.warn('[Scene Segmentation] Recovered via safeParseJsonFromText fallback')
        segmentsFromFallback = arr as IntelligentSegment[]
      }
    } catch {
      /* continue to slice parse */
    }
    if (segmentsFromFallback) {
      segments = segmentsFromFallback
    } else {
      const slices = extractJsonArrayObjectSlices(cleaned)
      const recovered: IntelligentSegment[] = []
      for (const sl of slices) {
        try {
          recovered.push(JSON.parse(sl) as IntelligentSegment)
        } catch {
          /* skip */
        }
      }
      if (recovered.length > 0) {
        console.warn(`[Scene Segmentation] Recovered ${recovered.length} segment(s) via slice parse`)
        segments = recovered
      } else {
        throw new Error('Failed to parse segments JSON')
      }
    }
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
      seg.generation_method = 'FTV' // Default to FTV (Frame-to-Video)
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

// ============================================================================
// PHASE 1: Directions-Only Generation
// ============================================================================

/**
 * Generate a prompt for Phase 1: Segment directions only (no full prompts)
 * This is faster and allows user review before expensive prompt generation
 */
function generateDirectionsOnlyPrompt(
  sceneData: ComprehensiveSceneData,
  durationConfig: SegmentDurationConfig,
  minimumSegmentsRequired: number,
  scopeControls?: {
    focusMode?: string
    customInstructions?: string
    totalDurationTarget?: number
    segmentCountTarget?: number
  }
): string {
  const noTalentScene = isNoTalentScene(sceneData.sceneDirection.talent, {
    dialogueCount: sceneData.dialogue.length,
    characterNames: sceneData.characters.map(c => c.name),
  })
  
  // Build UNIFIED AUDIO TIMELINE — merges narration + dialogue as indexed audio lines
  // This is the PRIMARY input for Gemini — it sees ONE timeline, not two separate blocks
  const hasNarration = sceneData.combinedAudioTimeline.some(l => l.type === 'narration')
  const hasDialogue = sceneData.combinedAudioTimeline.some(l => l.type === 'dialogue')
  const totalTimelineDuration = sceneData.combinedAudioTimeline.reduce((acc, l) => acc + l.estimatedDuration, 0)
  
  const audioTimelineList = noTalentScene && !hasNarration && !hasDialogue
    ? 'NO AUDIO LINES - No on-screen talent or narration'
    : sceneData.combinedAudioTimeline.map(line => {
        const typeTag = line.type === 'narration' 
          ? '🎙️ VOICEOVER' 
          : '🗣️ DIALOGUE'
        const emotionTag = line.emotion ? ` (${line.emotion})` : ''
        const visualTag = line.type === 'narration' 
          ? ' → [Backdrop visuals — NOT lip-synced]' 
          : ' → [Character lip-sync on screen]'
        return `[${line.index}] ${typeTag} | ${line.character}${emotionTag}: "${line.text}" (~${line.estimatedDuration}s)${visualTag}`
      }).join('\n')
    
  // Build detailed character descriptions
  const characterList = noTalentScene
    ? 'NO CHARACTERS'
    : sceneData.characters.length > 0
      ? sceneData.characters.map(c => {
          let desc = `- ${c.name}: ${c.description}`
          if (c.wardrobe) desc += ` | Wardrobe: ${c.wardrobe}`
          if (c.hasReferenceImage) desc += ' (Reference image available)'
          return desc
        }).join('\n')
      : 'None specified'

  // Build scope constraints
  const focusMode = scopeControls?.focusMode || 'balanced'
  const totalDurationTarget = scopeControls?.totalDurationTarget
  const segmentCountTarget = scopeControls?.segmentCountTarget
  const customInstructions = scopeControls?.customInstructions

  // Calculate the authoritative duration — narration/audio duration is the hard ceiling
  const authoritativeDuration = totalDurationTarget || sceneData.narrationDurationSeconds || sceneData.estimatedTotalDuration
  
  let scopeConstraints =
    durationConfig.mode === 'auto'
      ? `- **Segment length (AUTO):** Each segment \`estimated_duration\` must be **exactly 4, 6, or 8** seconds (Veo only). Pick per segment from dialogue/action cuts; soft average ~${durationConfig.hintSeconds}s. **Never exceed 8s** per segment.\n`
      : `- **Segment length (FIXED):** Target **${durationConfig.fixedSeconds ?? 6}s** per segment (\`estimated_duration\` must be **exactly 4, 6, or 8** — prefer **${durationConfig.fixedSeconds ?? 6}s**). **Never exceed 8s.**\n`
  scopeConstraints += `- **HARD CONSTRAINT: Total segment durations MUST sum to exactly ~${authoritativeDuration}s (narration/audio duration)**\n`
  scopeConstraints += `- **REQUIRED SEGMENT COUNT: exactly ${minimumSegmentsRequired} segments** (${authoritativeDuration}s ÷ ${8}s max = ${minimumSegmentsRequired} segments)\n`
  scopeConstraints += `- DO NOT create more segments than required. DO NOT exceed ${authoritativeDuration}s total duration.\n`
  
  if (segmentCountTarget) {
    scopeConstraints += `- **OVERRIDE SEGMENT COUNT: ${segmentCountTarget} segments**\n`
  }
  
  // Focus mode instructions  
  if (focusMode === 'dialogue-focused') {
    scopeConstraints += '- **FOCUS: DIALOGUE** — Prioritize dialogue coverage\n'
  } else if (focusMode === 'action-focused') {
    scopeConstraints += '- **FOCUS: ACTION** — Prioritize visual action beats\n'
  } else {
    scopeConstraints += '- **FOCUS: BALANCED** — Balance dialogue and visual action\n'
  }

  const directorNotes = customInstructions
    ? `\n**DIRECTOR'S CUSTOM INSTRUCTIONS:**\n${customInstructions}`
    : ''

  // Voiceover note (if scene has narration)
  const voiceoverNote = hasNarration
    ? `\n**VOICEOVER NOTE:** This scene has narration (🎙️ lines above). The narration audio is a SEPARATE track — do NOT include narration text in video prompts. Create evocative BACKDROP visuals that illustrate the narration emotional content.\n`
    : ''

  return `
**SYSTEM ROLE:** You are an expert AI Cinematographer and Director of Photography.
Your job is to analyze a scene and produce PRECISE, SPECIFIC segment directions that will guide both KEYFRAME IMAGE generation (Imagen 3) and VIDEO generation (Veo 3.1).

**YOUR DIRECTIONS MUST BE SPECIFIC ENOUGH TO:**
1. Generate a photorealistic START KEYFRAME image (via Imagen 3) for each segment
2. Generate a photorealistic END KEYFRAME image for each segment
3. Generate a video clip (via Veo 3.1) that animates from start to end keyframe
4. Maintain visual continuity across all segments

**ANTI-VAGUENESS RULES — CRITICAL:**
- ❌ NEVER write vague directions like "Nervous, tense" or "Character reacts"
- ❌ NEVER write "emotional moment" without specifying WHAT emotion and HOW it manifests
- ✅ ALWAYS specify: WHO (full appearance), WHERE (exact position in frame), WHAT (specific physical action), HOW (camera settings, lighting)
- ✅ Every talent_action must describe a VISIBLE, FILMABLE action with character positioning
- ✅ Every keyframe description must be a complete image generation prompt (50+ words)

${noTalentScene ? `
**NO ON-SCREEN TALENT SCENE 🚫**
Talent direction: "${sceneData.sceneDirection.talent}"
- DO NOT include any people, characters, faces, or human figures
- Focus on environment, VFX, motion graphics, atmospheric visuals
- Use environment_description instead of talent directions
` : ''}

**SCENE DATA:**
Heading: ${sceneData.heading}
Visual Description: ${sceneData.visualDescription}
Estimated Duration: ${Math.round(sceneData.estimatedTotalDuration)}s
${voiceoverNote}
**AUDIO TIMELINE (${sceneData.combinedAudioTimeline.length} lines, ~${Math.round(totalTimelineDuration)}s total):**
${audioTimelineList}

**AUDIO TIMELINE RULES:**
- 🎙️ VOICEOVER lines: Narration plays as a separate audio track. Video should show BACKDROP visuals (environments, atmospheric shots, detail inserts) that ILLUSTRATE the narration. Do NOT show a character speaking these words.
- 🗣️ DIALOGUE lines: Character speaks on screen with lip-sync. Video MUST show the character and include their speaking action.
- The "dialogue_indices" field in your output references indices [0], [1], [2]... from this AUDIO TIMELINE (both narration AND dialogue lines)
- EVERY audio line index MUST appear in exactly ONE segment's dialogue_indices
- Segments must be sized to FIT the audio lines assigned to them (sum of their durations)

**CHARACTERS:**
${characterList}

**DIRECTOR'S NOTES:**
Camera: ${sceneData.sceneDirection.camera}
Lighting: ${sceneData.sceneDirection.lighting}
Scene: ${sceneData.sceneDirection.scene}
Talent: ${sceneData.sceneDirection.talent}
Audio: ${sceneData.sceneDirection.audio}
${directorNotes}

**CONSTRAINTS:**
${scopeConstraints}

**VALID JSON — CRITICAL (parse failures break generation):**
- Return one JSON array only, no markdown fences, no commentary.
- Inside string values, escape every double quote as \\" . Do not put raw " characters inside a JSON string.
- Do not use unescaped line breaks inside strings — use spaces instead.
- If dialogue text contains quotes, escape them or shorten the quoted phrase.

**OUTPUT FORMAT:**
Return a JSON array. Each segment direction object MUST have ALL these fields:

[
  {
    "sequence": 1,
    "estimated_duration": 6.0,
    "shot_type": "Medium Close-Up",
    "talent_action": "SARAH (30s Latina) sits at mahogany desk. Her right hand grips the desk edge.",
    "dialogue_indices": [0, 1],
    "generation_method": "FTV",
    "trigger_reason": "Opening shot",
    "keyframe_start_description": "Medium close-up of SARAH, 30s Latina woman with dark curly hair pulled back in a low bun, wearing a cream silk blouse. She sits at a mahogany desk. Warm tungsten key light from brass desk lamp. 85mm f/1.2. 8K photorealistic.",
    "keyframe_end_description": "Same medium close-up composition. SARAH now clutches the manila envelope against her chest with both hands. The desk lamp flickers. Warm amber tones. 8K photorealistic."
  }
]

**FIELD REQUIREMENTS:**

1. **talent_action** (CRITICAL): Must be a SPECIFIC, FILMABLE action description including:
   - Character name and brief appearance reminder (hair, wardrobe)
   - Exact body position and posture
   - Specific physical action (not just emotion)
   - What their hands are doing

2. **keyframe_start_description** (CRITICAL): A complete 40-70 word image generation prompt describing the OPENING FRAME:
   - Shot type and lens
   - Subject with full appearance (face, hair, skin, build, wardrobe)
   - Exact pose, expression, hand position
   - Lighting setup with direction and quality
   - Background elements

3. **keyframe_end_description** (CRITICAL): A complete 40-70 word image generation prompt describing the CLOSING FRAME:
   - What has CHANGED from the start frame
   - New pose, expression, position
   - Same lighting setup and technical specs

**RULES:**
1. Split at MAJOR visual changes only (angle, location, emotional shift)
2. Combine consecutive audio lines in same shot setup — especially adjacent narration sentences
3. Each audio timeline index (dialogue_indices) appears in exactly ONE segment
4. **DURATION RULE (CRITICAL):** Total segment durations MUST sum to EXACTLY the audio timeline duration (~${Math.round(totalTimelineDuration)}s). Do NOT exceed this. Each segment \`estimated_duration\` must be **exactly 4, 6, or 8** (Veo quantization).
5. **SEGMENT COUNT RULE:** Create exactly ${minimumSegmentsRequired} segments — no more, no fewer (unless overridden above).
6. keyframe_start_description and keyframe_end_description are MANDATORY for every segment
7. **VOICEOVER SEGMENTS:** When a segment covers 🎙️ VOICEOVER lines, the talent_action should describe atmospheric/environmental action — NOT a character speaking. Show backdrop visuals.
8. **DIALOGUE SEGMENTS:** When a segment covers 🗣️ DIALOGUE lines, the talent_action MUST show the character speaking with lip-sync action.
9. **MIXED SEGMENTS:** When a segment covers both voiceover AND dialogue lines, prioritize the DIALOGUE character as the visual focus, with backdrop elements that complement the narration.

**CONTINUITY RULES (CRITICAL FOR VISUAL FLOW):**
7. For segments 2+, keyframe_start_description MUST describe the **same** visual instant as the previous segment's keyframe_end_description (seamless stitch — **last frame of N = first frame of N+1**)
8. Default transition_in to "continue" for consecutive segments in the same location/angle. Only use "cut" when the camera angle or location changes dramatically.
9. continuity_notes MUST list all visual elements that carry over: wardrobe, hair, props held, lighting setup, background elements
10. When dialogue or one continuous performance spans segments N and N+1, segment N+1 MUST open on the **exact** end state of segment N (pose, mouth position for mid-line splits, hands, gaze) — no reset between parts of the same line

**GENERATION METHOD RULES:**
11. Default generation_method is "FTV" (Frame-to-Video) — generates video between start and end keyframes
12. Use "I2V" (Image-to-Video) ONLY for segment 1 when a scene frame exists as the source image
13. Use "T2V" (Text-to-Video) ONLY as a fallback when keyframes cannot be generated (e.g., pure VFX shots)
14. NEVER use "T2V" as the default — "FTV" is the primary production method

Return ONLY valid JSON array. No markdown code blocks, no explanatory text.
`
}

/**
 * Call Gemini to generate segment directions (Phase 1)
 */
async function callGeminiForSegmentDirections(prompt: string): Promise<any[]> {
  const result = await generateText(prompt, {
    temperature: 0.5, // Lower temperature for more consistent structure
    // Long scenes: many segments × long keyframe strings — 8k often truncates mid-string (invalid JSON)
    maxOutputTokens: 32768,
    responseMimeType: 'application/json',
    // Match route maxDuration (120s): long audio timelines need more than 55s for Vertex global endpoint
    timeoutMs: 110000,
    maxRetries: 1, // Avoid stacking multiple full timeouts inside the serverless window
    thinkingLevel: 'minimal',
  })
  return parseDirectionsResponse(result.text, result.finishReason)
}

/**
 * Pull top-level `{...}` objects from a JSON array string, respecting strings and \\ escapes.
 * Used when JSON.parse fails (unterminated string, bad quote in one object, etc.).
 */
function extractJsonArrayObjectSlices(raw: string): string[] {
  const s = raw.trim()
  const firstBracket = s.indexOf('[')
  if (firstBracket === -1) return []

  const slices: string[] = []
  let i = firstBracket + 1
  let depth = 0
  let objStart = -1
  let inString = false
  let escape = false

  for (; i < s.length; i++) {
    const ch = s[i]
    if (escape) {
      escape = false
      continue
    }
    if (inString) {
      if (ch === '\\') {
        escape = true
        continue
      }
      if (ch === '"') inString = false
      continue
    }
    if (ch === '"') {
      inString = true
      continue
    }
    if (ch === '{') {
      if (depth === 0) objStart = i
      depth++
      continue
    }
    if (ch === '}') {
      depth--
      if (depth === 0 && objStart >= 0) {
        slices.push(s.slice(objStart, i + 1))
        objStart = -1
      }
    }
  }
  return slices
}

function parseDirectionsResponse(text: string, finishReason?: string): any[] {
  if (!text) throw new Error('No response for directions')

  let cleanedText = repairModelJsonSurface(
    text.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim()
  )

  const tryParseArray = (t: string): any[] | null => {
    try {
      const v = JSON.parse(t)
      const arr = coerceTopLevelJsonArray(v)
      return arr
    } catch {
      return null
    }
  }

  let directions = tryParseArray(cleanedText)
  if (directions) return directions

  if (!cleanedText.endsWith(']')) {
    const lastComplete = cleanedText.lastIndexOf('},')
    if (lastComplete > 0) {
      const repaired = cleanedText.substring(0, lastComplete + 1) + ']'
      directions = tryParseArray(repaired)
      if (directions) {
        console.warn('[parseDirectionsResponse] Parsed after truncating to last complete object')
        return directions
      }
    }
  }

  const slices = extractJsonArrayObjectSlices(cleanedText)
  const recovered: any[] = []
  for (const sl of slices) {
    try {
      recovered.push(JSON.parse(sl))
    } catch {
      // skip unparseable slice
    }
  }
  if (recovered.length > 0) {
    console.warn(
      `[parseDirectionsResponse] Recovered ${recovered.length}/${slices.length} direction objects via slice parse` +
        (finishReason === 'MAX_TOKENS' ? ' (MAX_TOKENS)' : '')
    )
    return recovered
  }

  try {
    const v = safeParseJsonFromText(cleanedText)
    const arr = coerceTopLevelJsonArray(v)
    if (arr && arr.length > 0) {
      console.warn('[parseDirectionsResponse] Recovered via safeParseJsonFromText')
      return arr
    }
  } catch {
    /* final error below */
  }

  console.error('[parseDirectionsResponse] Raw response prefix:', cleanedText.substring(0, 2000))
  throw new Error(
    'Failed to parse directions JSON (model output was not valid JSON). Try again, or shorten scene/keyframe detail.'
  )
}

// ============================================================================
// PHASE 2: Prompts from Approved Directions
// ============================================================================

/**
 * Generate prompt for Phase 2: Full video prompts based on user-approved directions
 */
function generatePromptsFromDirectionsPrompt(
  sceneData: ComprehensiveSceneData,
  approvedDirections: SegmentDirection[],
  durationConfig: SegmentDurationConfig
): string {
  // Check scene-level no-talent with semantic context
  const sceneLevelNoTalent = isNoTalentScene(sceneData.sceneDirection.talent, {
    dialogueCount: sceneData.dialogue.length,
    characterNames: sceneData.characters.map(c => c.name),
  })
  // Also check if ALL approved directions are marked no-talent
  const allDirectionsNoTalent = approvedDirections.length > 0 && approvedDirections.every(d => d.isNoTalent)
  const noTalentScene = sceneLevelNoTalent || allDirectionsNoTalent
  
  const characterDescriptions = noTalentScene
    ? ''
    : sceneData.characters.map(c => {
        let desc = `- ${c.name}: ${c.description}`
        if (c.wardrobe) desc += ` | Wardrobe: ${c.wardrobe}`
        if (c.hasReferenceImage) desc += ' (✓ Reference available)'
        return desc
      }).join('\n')
  
  // Build UNIFIED AUDIO TIMELINE for Phase 2 prompts-from-directions
  const p2dHasNarration = sceneData.combinedAudioTimeline.some(l => l.type === 'narration')
  const p2dTotalDuration = sceneData.combinedAudioTimeline.reduce((acc, l) => acc + l.estimatedDuration, 0)
  
  const p2dAudioTimeline = noTalentScene && sceneData.combinedAudioTimeline.length === 0
    ? ''
    : sceneData.combinedAudioTimeline.map(line => {
        const typeTag = line.type === 'narration' ? '🎙️ VO' : '🗣️ DLG'
        const emotionTag = line.emotion ? ` (${line.emotion})` : ''
        return `[${line.index}] ${typeTag} | ${line.character}${emotionTag}: "${line.text}" (~${line.estimatedDuration}s)`
      }).join('\n')
  
  const directionsJson = approvedDirections.map((dir, idx) => ({
    sequence: idx + 1,
    shot_type: dir.shotType,
    camera_movement: dir.cameraMovement,
    camera_angle: dir.cameraAngle,
    lens: (dir as any).lens || '50mm',
    talent_action: dir.talentAction,
    emotional_beat: dir.emotionalBeat,
    characters: dir.characters,
    is_no_talent: dir.isNoTalent,
    lighting_mood: dir.lightingMood,
    dialogue_indices: dir.dialogueLineIds?.map(id => parseInt(id.replace('dialogue-', ''))) || [],
    generation_method: dir.generationMethod,
    transition_in: (dir as any).transitionIn || 'cut',
    start_frame_description: (dir as any).startFrameDescription || '',
    end_frame_description: (dir as any).endFrameDescription || '',
    continuity_notes: (dir as any).continuityNotes || '',
    // Phase 8: Pass keyframe descriptions to Phase 2 for prompt enrichment
    keyframe_start_description: (dir as any).keyframeStartDescription || '',
    keyframe_end_description: (dir as any).keyframeEndDescription || '',
    environment_description: (dir as any).environmentDescription || '',
    color_palette: (dir as any).colorPalette || '',
    depth_of_field: (dir as any).depthOfField || '',
  }))

  return `
**SYSTEM ROLE:** You are an expert Video Director and Cinematographer generating professional-grade video prompts for Veo 3.1.
The user has APPROVED a shot breakdown. Your job is to write RICH, CINEMATIC VIDEO PROMPTS that will produce stunning results.

**SCENE DATA:**
Heading: ${sceneData.heading}
Visual Description: ${sceneData.visualDescription}
${p2dHasNarration ? `Narration: Present as 🎙️ VO lines in audio timeline — voiceover audio, NOT in video prompts` : ''}

**CHARACTERS:**
${noTalentScene ? 'NO CHARACTERS - This is a no-talent scene' : characterDescriptions || 'None specified'}

**AUDIO TIMELINE (${sceneData.combinedAudioTimeline.length} lines, ~${Math.round(p2dTotalDuration)}s):**
${noTalentScene && !p2dAudioTimeline ? 'NO AUDIO - voiceover only' : p2dAudioTimeline || 'No audio lines'}

**AUDIO LINE RULES:**
- 🗣️ DLG lines: Include character dialogue in video_generation_prompt as: Character speaks, "text"
- 🎙️ VO lines: Do NOT include narration text in video_generation_prompt — create backdrop visuals
- dialogue_indices reference the [index] numbers from the Audio Timeline above

**DIRECTOR'S NOTES:**
Camera: ${sceneData.sceneDirection.camera}
Lighting: ${sceneData.sceneDirection.lighting}
Scene: ${sceneData.sceneDirection.scene}
Talent: ${sceneData.sceneDirection.talent}
Audio: ${sceneData.sceneDirection.audio}

**SCENE FRAME:** ${sceneData.sceneFrameUrl ? 'Available for I2V on Segment 1' : 'Not available'}

**APPROVED SEGMENT DIRECTIONS:**
${JSON.stringify(directionsJson, null, 2)}

**YOUR TASK:**
For each approved direction, generate a RICH cinematic video prompt (80-150 words) following this precise formula:

**PROMPT FORMULA:**
[Shot Type] + [Lens/Focal Length] + [Subject with FULL visual description including face, hair, body, wardrobe] + [Specific Physical Action] + [DIALOGUE if any: Name speaks, "exact text"] + [Camera Movement with speed] + [Lighting setup with direction and quality] + [Depth of Field and focus target] + [Color palette/grading] + [Atmosphere/texture details]

${segmentDurationPromptSection(durationConfig)}
**CRITICAL RULES:**
1. FOLLOW the approved shot_type, camera_movement, camera_angle, and lens EXACTLY
2. INCLUDE the specified talent_action and emotional_beat
3. FOR 🗣️ DIALOGUE LINES: Include as "[Name] speaks, \\"[exact dialogue text]\\"" — Veo 3.1 generates speech from text. FOR 🎙️ VOICEOVER LINES: Do NOT include narration text — create atmospheric backdrop visuals instead.
4. **PER-SEGMENT NO-TALENT ENFORCEMENT:** For ANY segment where \`is_no_talent: true\` in the approved directions, you MUST NOT include any people, characters, faces, human figures, or dialogue in that segment's prompt — regardless of the CHARACTERS or DIALOGUE sections above. Focus ONLY on environment, VFX, abstract visuals, text/graphics, and atmosphere for those segments.
5. EVERY character mentioned in a talent segment MUST have their FULL appearance description (face, hair, skin, build, wardrobe)
6. Narration is a SEPARATE audio voiceover — NEVER include narration text in prompts
7. Frame continuity between segments (mandatory):
${SEAMLESS_CONTINUATION_PROMPT}
8. Describe specific depth-of-field: what's in focus, what's bokeh
9. Include color temperature and mood (warm amber, cool blue, desaturated, etc.)
10. Minimum 80 words per prompt — more detail = better Veo 3.1 results

**LENS/DOF GUIDELINES:**
- 24mm f/2.8: Deep DOF, wide environment, slight barrel distortion at edges
- 35mm f/1.8: Moderate DOF, group shots, natural perspective
- 50mm f/1.4: Shallow DOF, subject isolation, natural eye perspective
- 85mm f/1.2: Very shallow DOF, beautiful bokeh, subject pops from background
- 135mm f/2.0: Extremely compressed background, maximum isolation, dreamy bokeh

**EXAMPLE EXCELLENT PROMPT (92 words):**
"Medium Close-Up, 85mm f/1.2 lens. ALEX ANDERSON, a young man with short brown hair, clean-shaven, wearing a charcoal suit with loosened blue tie, stares into the vanity mirror with hollow eyes. He adjusts his collar with trembling hands. Alex speaks, \\"I don't know if we're ready for this, Dad.\\" Rack focus from mirror reflection to actual face. Single motivated key light from fluorescent overhead creates harsh shadows under eyes. Background falls to creamy bokeh. Cool blue-gray color grade. Visible perspiration on forehead. 8K photorealistic."

**OUTPUT FORMAT:**
Return a JSON array with one object per segment:
[
  {
    "sequence": 1,
    "estimated_duration": 6.0,
    "video_generation_prompt": "[80-150 word rich cinematic prompt]",
    "generation_method": "I2V",
    "reference_strategy": { "use_scene_frame": true, "use_character_refs": ["CharName"], "start_frame_description": "Description of opening frame" },
    "end_frame_description": "Detailed end state: character position, expression, camera angle, lighting",
    "camera_notes": "85mm f/1.2, rack focus from mirror to face, static locked-off",
    "trigger_reason": "From approved direction",
    "emotional_beat": "From approved direction",
    "assigned_dialogue_indices": [0, 1]
  }
]

**FINAL QUALITY CHECKLIST:**
✅ Every prompt is 80-150 words with specific lens/DOF/lighting/color language
✅ Every character has full appearance description (don't just use names)
✅ Every 🗣️ dialogue line appears in exactly one segment as: [Name] speaks, "[text]"
✅ Every 🎙️ voiceover line is assigned via assigned_dialogue_indices but NOT included as spoken text
✅ End frame descriptions are detailed enough to generate the next segment's start frame
✅ Camera notes include focal length, f-stop, and movement speed
✅ Color palette and atmosphere are specified
✅ Segment 1 uses I2V if scene frame is available, otherwise FTV
✅ No narration text in prompts (it's a separate voiceover track)

Return ONLY valid JSON array. No markdown, no explanation.
`
}

/**
 * Call Gemini to generate full prompts from approved directions (Phase 2)
 */
async function callGeminiForPromptsFromDirections(prompt: string): Promise<IntelligentSegment[]> {
  const result = await generateText(prompt, {
    temperature: 0.7,
    maxOutputTokens: 32768,
    responseMimeType: 'application/json',
    timeoutMs: 100000,
    thinkingLevel: 'minimal',
  })
  return parseGeminiResponseText(result.text)
}

// ============================================================================
// POST-LLM SEGMENT ENFORCEMENT — split oversized segments
// ============================================================================

/**
 * Enforce MAX_SEGMENT_SECONDS on AI-generated segments.
 * If any segment exceeds the limit, it is split into sub-segments that each
 * snap to a valid Veo duration. Dialogue indices are distributed across the
 * resulting sub-segments proportionally.
 *
 * This runs BEFORE transformSegmentsToOutput so it operates on IntelligentSegment[].
 */
function enforceMaxSegmentDuration(
  segments: IntelligentSegment[],
  maxDuration: number = 8,
  sceneData: ComprehensiveSceneData
): IntelligentSegment[] {
  const result: IntelligentSegment[] = []

  for (const seg of segments) {
    if (seg.estimated_duration <= maxDuration) {
      result.push(seg)
      continue
    }

    // --- Split required ---
    const originalDuration = seg.estimated_duration
    const dialogueIndices = seg.assigned_dialogue_indices || []

    // Decide how many sub-segments we need (snap each to valid Veo durations)
    const numParts = Math.ceil(originalDuration / maxDuration)

    // Build sub-segment durations that sum to originalDuration, each ≤ maxDuration
    // Strategy: distribute evenly, then snap each to a Veo-valid duration
    const rawPartDuration = originalDuration / numParts
    const subDurations: number[] = []
    let remaining = originalDuration
    for (let i = 0; i < numParts; i++) {
      if (i === numParts - 1) {
        // Last part gets whatever's left, snapped to Veo
        subDurations.push(snapToVeoDuration(remaining))
      } else {
        const snapped = snapToVeoDuration(rawPartDuration)
        subDurations.push(snapped)
        remaining -= snapped
      }
    }

    // Distribute dialogue indices across sub-segments proportionally (or repeat single long line)
    const dialoguePerPart =
      dialogueIndices.length <= 1 ? 1 : Math.ceil(dialogueIndices.length / numParts)

    console.log(
      `[Segment Split] Splitting segment seq=${seg.sequence} ` +
      `(${originalDuration.toFixed(1)}s) into ${numParts} parts: ` +
      `[${subDurations.map(d => `${d}s`).join(', ')}], ` +
      `distributing ${dialogueIndices.length} dialogue line(s)`
    )

    for (let i = 0; i < numParts; i++) {
      const partDialogue =
        dialogueIndices.length === 1
          ? [...dialogueIndices]
          : dialogueIndices.slice(i * dialoguePerPart, (i + 1) * dialoguePerPart)

      // Build dialogue context for the prompt suffix
      const partDialogueTexts = partDialogue
        .map(idx => sceneData.dialogue[idx])
        .filter(Boolean)
        .map(d => `${d.character}: "${d.text}"`)

      const isFirstPart = i === 0
      const isLastPart = i === numParts - 1

      // Build a refined prompt that specifies which portion this covers
      const splitPromptSuffix =
        partDialogueTexts.length > 0
          ? dialogueIndices.length === 1 && numParts > 1
            ? `\n\n[Continuation ${i + 1}/${numParts} of the same audio line — seamless with prior clip; dialogue: ${partDialogueTexts.join(' / ')}]`
            : `\n\n[This segment covers the following dialogue: ${partDialogueTexts.join(' / ')}]`
          : ''

      const partTriggerReason = isFirstPart
        ? seg.trigger_reason
        : `Continuation of split segment (part ${i + 1}/${numParts}) — ${seg.trigger_reason}`

      result.push({
        ...seg,
        sequence: 0, // Will be re-sequenced below
        estimated_duration: subDurations[i],
        trigger_reason: partTriggerReason,
        video_generation_prompt: seg.video_generation_prompt + splitPromptSuffix,
        assigned_dialogue_indices: partDialogue,
        emotional_beat: isFirstPart
          ? seg.emotional_beat
          : `${seg.emotional_beat} (continued)`,
        end_frame_description: isLastPart
          ? seg.end_frame_description
          : `Transition point within split segment — visual continuity maintained`,
        reference_strategy: {
          ...seg.reference_strategy,
          // Only the first part of a split should use the scene frame
          use_scene_frame: isFirstPart ? seg.reference_strategy.use_scene_frame : false,
        },
      })
    }
  }

  // Re-sequence all segments
  result.forEach((seg, idx) => {
    seg.sequence = idx + 1
  })

  return result
}

/**
 * Transform AI segments to full output structure (shared between legacy and Phase 2)
 */
function transformSegmentsToOutput(
  segments: IntelligentSegment[],
  sceneData: ComprehensiveSceneData,
  sceneId: string,
  scene: any,
  approvedDirections?: SegmentDirection[]
): any[] {
  return segments.map((seg: IntelligentSegment, idx: number) => {
    let cumulativeTime = 0
    for (let i = 0; i < idx; i++) {
      cumulativeTime += segments[i].estimated_duration
    }

    const methodMap: Record<string, string> = { 'I2V': 'I2V', 'EXT': 'EXT', 'T2V': 'T2V', 'FTV': 'FTV' }
    const isFirstSegment = idx === 0
    const useSceneFrame = seg.reference_strategy?.use_scene_frame ?? isFirstSegment
    const startFrameUrl = (isFirstSegment && useSceneFrame && sceneData.sceneFrameUrl) ? sceneData.sceneFrameUrl : null

    const dialogueLineIds = (seg.assigned_dialogue_indices || []).map((index: number) => `dialogue-${index}`)
    const assignedDialogue = sceneData.dialogue.filter((_, didx) => (seg.assigned_dialogue_indices || []).includes(didx))
    const dialogueText = assignedDialogue.map(d => `${d.character}:${d.text}`).join('|')
    const dialogueHash = simpleHash(dialogueText)
    const visualDescriptionHash = simpleHash(sceneData.visualDescription || '')

    const hasSceneFrame = !!sceneData.sceneFrameUrl
    const generatedMethod = methodMap[seg.generation_method] || 'FTV'
    
    // Include approved direction metadata if available
    const approvedDir = approvedDirections?.[idx]

    const generationPlan = {
      recommendedMethod: generatedMethod,
      confidence: seg.generation_plan?.confidence || (isFirstSegment && hasSceneFrame ? 90 : 70),
      reasoning: seg.generation_plan?.reasoning || seg.trigger_reason || 'AI-recommended method',
      fallbackMethod: seg.generation_plan?.fallback_method || (generatedMethod === 'I2V' ? 'FTV' : undefined),
      fallbackReason: generatedMethod === 'I2V' ? 'Use FTV if I2V produces unwanted motion' : undefined,
      prerequisites: [
        { type: 'scene-image', label: 'Scene keyframe image', met: hasSceneFrame, required: isFirstSegment, assetUrl: sceneData.sceneFrameUrl || undefined },
        ...(idx > 0 ? [{ type: 'previous-frame', label: 'Previous segment last frame', met: false, required: false }] : []),
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
      generatedPrompt: seg.video_generation_prompt,
      userEditedPrompt: null,
      activeAssetUrl: null,
      assetType: null as 'video' | 'image' | null,
      generationMethod: generatedMethod,
      triggerReason: seg.trigger_reason,
      endFrameDescription: seg.end_frame_description,
      cameraMovement: seg.camera_notes,
      emotionalBeat: seg.emotional_beat,
      dialogueLineIds,
      generationPlan,
      promptContext: {
        dialogueHash,
        visualDescriptionHash,
        generatedAt: new Date().toISOString(),
        sceneNumber: scene.sceneNumber || (typeof sceneId === 'string' ? parseInt(sceneId) : undefined),
      },
      isStale: false,
      // NEW: Include approved direction for reference
      segmentDirection: approvedDir || null,
      references: {
        startFrameUrl,
        endFrameUrl: null,
        useSceneFrame,
        characterRefs: seg.reference_strategy?.use_character_refs || [],
        startFrameDescription: seg.reference_strategy?.start_frame_description || null,
        characterIds: [],
        sceneRefIds: [],
        objectRefIds: [],
      },
      takes: [],
    }
  })
}