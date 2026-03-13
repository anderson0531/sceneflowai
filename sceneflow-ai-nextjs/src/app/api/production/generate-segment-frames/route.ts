import { NextRequest, NextResponse } from 'next/server'
// NOTE: Vertex AI Imagen import removed - using Gemini Studio exclusively due to Vertex auth issues
// import { callVertexAIImagen } from '@/lib/vertexai/client'
import { generateImageWithGeminiStudio } from '@/lib/gemini/geminiStudioImageClient'
import { uploadImageToBlob } from '@/lib/storage/blob'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { 
  inferActionType, 
  getActionWeights,
  buildEndFramePrompt,
  enhancePrompt,
  determineTransitionType,
  buildKeyframePrompt,
  type KeyframeContext
} from '@/lib/intelligence'
import { artStylePresets } from '@/constants/artStylePresets'
import type { TransitionType, ActionType, AnchorStatus } from '@/components/vision/scene-production/types'
import type { DetailedSceneDirection } from '@/types/scene-direction'

export const maxDuration = 120 // 2 minutes for potentially generating both frames
export const runtime = 'nodejs'

interface FrameGenerationRequest {
  // Required fields
  sceneId: string
  segmentId: string
  segmentIndex: number
  actionPrompt: string
  duration: number
  
  // Which frame to generate
  frameType: 'start' | 'end' | 'both'
  
  // Transition from previous segment (affects start frame generation)
  transitionType?: TransitionType
  
  // Reference images
  previousEndFrameUrl?: string | null  // For CONTINUE transitions
  sceneImageUrl?: string | null         // Fallback reference
  startFrameUrl?: string | null         // Required for end frame generation
  
  // Character data for identity lock
  characters?: Array<{
    name: string
    appearance?: string
    ethnicity?: string
    age?: string
    wardrobe?: string
    referenceUrl?: string
  }>
  
  // Scene context for prompt enhancement
  sceneContext?: {
    location?: string
    timeOfDay?: string
    atmosphere?: string
    lighting?: string
    heading?: string
  }
  
  // Trigger reason (for transition type determination)
  triggerReason?: string
  
  // Aspect ratio
  aspectRatio?: '16:9' | '9:16' | '1:1'
  
  // NEW: User customization options from FramePromptDialog
  customPrompt?: string          // User-edited prompt to use instead of actionPrompt
  negativePrompt?: string        // Elements to avoid in generation
  usePreviousEndFrame?: boolean  // Copy previous end frame as start frame (skip generation)
  
  // NEW: Visual setup from guided mode (for prompt construction)
  visualSetup?: {
    location: string
    timeOfDay: string
    weather: string
    atmosphere: string
    shotType: string
    cameraAngle: string
    lighting: string
  }
  
  // NEW: Scene direction for intelligent prompt building
  sceneDirection?: DetailedSceneDirection | null
  
  // Shot metadata for keyframe rules
  previousShotType?: string      // For shot consistency on CONTINUE
  isPanTransition?: boolean      // Whether this is a pan/dolly transition
  
  // Object references (auto-detected from segment text for prop/set consistency)
  objectReferences?: Array<{
    name: string
    description?: string
    category?: 'prop' | 'vehicle' | 'set-piece' | 'costume' | 'technology' | 'other'
    importance?: 'critical' | 'important' | 'background'
    imageUrl?: string
  }>
  
  // Location references for environment consistency (from dialog selection)
  locationReferences?: Array<{
    name: string
    description?: string
    imageUrl?: string
  }>
  
  // Art style for frame generation (default: photorealistic)
  artStyle?: string
  
  // Phase 8: Per-segment direction with keyframe-specific descriptions
  segmentDirection?: {
    keyframeStartDescription?: string
    keyframeEndDescription?: string
    environmentDescription?: string
    colorPalette?: string
    depthOfField?: string
    shotType?: string
    cameraMovement?: string
    emotionalBeat?: string
    lightingMood?: string
    isNoTalent?: boolean
    talentAction?: string
  } | null
  
  // Model quality tier for generation
  modelTier?: 'eco' | 'designer' | 'director'
  
  // Thinking level for complex prompts
  thinkingLevel?: 'low' | 'high'
  
  // Phase 11: Segment content context for intelligent end frames
  segmentContent?: {
    /** Dialogue lines spoken during this segment */
    dialogueLines?: Array<{ character: string; text: string; emotion?: string }>
    /** Narration text playing over this segment */
    narrationText?: string
    /** Emotional arc: start → end */
    emotionalArc?: { start: string; end: string }
    /** Camera movement during segment */
    cameraMovement?: string
    /** Talent action during this segment */
    talentAction?: string
    /** Start frame description for explicit delta */
    startFrameDescription?: string
  }
  
  // Phase 11: Previous segment's end frame URL for continuity chain
  // When generating start frame of segment N, use segment N-1's end frame
  previousSegmentEndFrameUrl?: string | null
}

interface FrameGenerationResponse {
  success: boolean
  segmentId: string
  
  // Generated frames
  startFrameUrl?: string
  startFramePrompt?: string
  endFrameUrl?: string
  endFramePrompt?: string
  
  // Metadata
  actionType: ActionType
  transitionType: TransitionType
  anchorStatus: AnchorStatus
  
  // Generation parameters used
  imageStrength?: number
  guidanceScale?: number
  
  error?: string
}

/**
 * Phase 11: Build a content delta string from segment content
 * Describes what CHANGED during the segment for end frame generation
 */
function buildContentDelta(
  content: FrameGenerationRequest['segmentContent'],
  duration: number
): string {
  if (!content) return ''
  
  const parts: string[] = []
  
  // Dialogue-driven changes
  if (content.dialogueLines?.length) {
    const lastLine = content.dialogueLines[content.dialogueLines.length - 1]
    if (content.dialogueLines.length === 1) {
      parts.push(`After ${lastLine.character} says: "${lastLine.text.substring(0, 70)}"${lastLine.emotion ? ` (${lastLine.emotion})` : ''}`)
    } else {
      const speakers = [...new Set(content.dialogueLines.map(d => d.character))]
      parts.push(`After exchange between ${speakers.join(' and ')}, ending with ${lastLine.character}: "${lastLine.text.substring(0, 50)}"`)
    }
  }
  
  // Narration context
  if (content.narrationText) {
    const hint = content.narrationText.length > 80 
      ? content.narrationText.substring(0, 80) + '...' 
      : content.narrationText
    parts.push(`Narration context: "${hint}"`)
  }
  
  // Talent action
  if (content.talentAction) {
    parts.push(`Action: ${content.talentAction}`)
  }
  
  // Emotional arc
  if (content.emotionalArc?.end) {
    parts.push(`Expression: ${content.emotionalArc.end}`)
  }
  
  // Camera movement end state
  if (content.cameraMovement && content.cameraMovement !== 'Static') {
    const m = content.cameraMovement.toLowerCase()
    if (m.includes('dolly in') || m.includes('push in')) {
      parts.push('Camera closer — tighter framing')
    } else if (m.includes('pull back') || m.includes('dolly out')) {
      parts.push('Camera pulled back — wider framing')
    } else if (m.includes('pan')) {
      parts.push('Camera panned — shifted composition')
    }
  }
  
  return parts.length > 0 ? `[Content delta: ${parts.join('. ')}]` : ''
}

/**
 * Phase 11: Determine if camera movement is "static-ish" (end frame should
 * preserve start frame composition closely) or "dynamic" (end frame can 
 * differ more in composition).
 * 
 * Used to choose SUBJECT (strict) vs STYLE (loose) reference type.
 */
function isStaticCamera(cameraMovement?: string): boolean {
  if (!cameraMovement) return true
  const m = cameraMovement.toLowerCase()
  // Static or very subtle movements = strict reference
  return m === 'static' || m.includes('locked') || m.includes('tripod') || 
    m.includes('subtle') || m.includes('steady') || m === ''
}

/**
 * Generate Segment Frames API
 * 
 * Keyframe State Machine implementation for generating Start and End frames.
 * 
 * Principles:
 * - CONTINUE transitions: Start frame inherits from previous segment's end frame
 * - CUT transitions: Start frame is freshly generated from scene image or prompt
 * - End frames use inverse proportionality: low action = high identity lock
 * 
 * This enables Frame-Anchored Video Production where Veo 3.1 FTV mode uses
 * both start AND end frames for constrained video generation with minimal character drift.
 */
export async function POST(req: NextRequest) {
  try {
    const body: FrameGenerationRequest = await req.json()
    const {
      sceneId,
      segmentId,
      segmentIndex,
      actionPrompt,
      duration,
      frameType,
      transitionType: requestedTransition,
      previousEndFrameUrl,
      sceneImageUrl,
      startFrameUrl: providedStartFrameUrl,
      characters = [],
      sceneContext = {},
      triggerReason,
      aspectRatio = '16:9',
      // NEW: User customization options
      customPrompt,
      negativePrompt,
      usePreviousEndFrame = false,
      // NEW: Visual setup from guided mode
      visualSetup,
      // NEW: Scene direction for intelligent prompts
      sceneDirection,
      previousShotType,
      isPanTransition = false,
      // Phase 8: Per-segment direction
      segmentDirection: segmentDir,
      // NEW: Object references for prop consistency
      objectReferences = [],
      // NEW: Location references for environment consistency
      locationReferences = [],
      // NEW: Art style for frame generation
      artStyle = 'photorealistic',
      // Model quality tier: 'eco' (Draft) for cost-optimized iteration, 'designer' (Final) for production
      modelTier = 'eco',
      // Thinking level: 'low' for fast iteration, 'high' for complex multi-character scenes
      thinkingLevel = 'low',
      // Phase 11: Segment content context for intelligent end frames
      segmentContent,
      // Phase 11: Previous segment end frame for continuity chain
      previousSegmentEndFrameUrl,
    } = body
    
    // Use custom prompt if provided, otherwise fall back to action prompt
    const effectivePrompt = customPrompt?.trim() || actionPrompt

    // Get user session for authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate required fields
    if (!sceneId || !segmentId || !actionPrompt) {
      return NextResponse.json(
        { error: 'Missing required fields: sceneId, segmentId, actionPrompt' },
        { status: 400 }
      )
    }

    console.log('[Generate Frames] Starting for segment:', segmentId)
    console.log('[Generate Frames] Action prompt:', actionPrompt.substring(0, 100))
    console.log('[Generate Frames] Frame type requested:', frameType)

    // Analyze the action to determine weights
    const actionType = inferActionType(actionPrompt)
    const weights = getActionWeights(actionType)
    
    console.log('[Generate Frames] Inferred action type:', actionType)
    console.log('[Generate Frames] Image strength:', weights.imageStrength)

    // Determine transition type if not explicitly provided
    const transitionType = requestedTransition || determineTransitionType(
      segmentIndex,
      actionPrompt,
      undefined, // Previous segment action not available
      triggerReason
    )
    
    console.log('[Generate Frames] Transition type:', transitionType)

    // Get art style info for explicit style injection in prompts
    // This is defined at the top level so both start and end frame generation can use it
    const selectedStyle = artStylePresets.find(s => s.id === artStyle) || artStylePresets.find(s => s.id === 'photorealistic')!
    const isPhotorealistic = artStyle === 'photorealistic' || !artStyle
    
    console.log(`[Generate Frames] Art style: ${selectedStyle.name} (photorealistic: ${isPhotorealistic})`)

    let generatedStartFrameUrl: string | undefined
    let startFramePrompt: string | undefined
    let generatedEndFrameUrl: string | undefined
    let endFramePrompt: string | undefined

    // ========================================================================
    // GENERATE START FRAME
    // ========================================================================
    if (frameType === 'start' || frameType === 'both') {
      console.log('[Generate Frames] Generating start frame...')
      
      // Check if user wants to use previous segment's end frame directly (seamless continuity)
      if (usePreviousEndFrame && previousEndFrameUrl) {
        console.log('[Generate Frames] Using previous end frame as start frame (seamless continuity)')
        generatedStartFrameUrl = previousEndFrameUrl
        startFramePrompt = 'Copied from previous segment end frame for seamless continuity'
      } else {
        // Generate a new start frame
        
        // Determine which reference image to use for start frame
        let referenceImageUrl: string | undefined
        let imageStrength = 0 // T2I mode by default
        
        if (transitionType === 'CONTINUE' && previousEndFrameUrl) {
          // Continuation: use previous segment's end frame with high strength
          referenceImageUrl = previousEndFrameUrl
          imageStrength = Math.min(0.90, weights.imageStrength + 0.1) // Boost for continuation
          console.log('[Generate Frames] Using previous end frame for continuation')
        } else if (sceneImageUrl) {
          // CUT transition: use scene image as reference
          referenceImageUrl = sceneImageUrl
          imageStrength = 0.75 // Moderate strength for establishing
          console.log('[Generate Frames] Using scene image for new shot')
        }
        
        // Phase 8: If segment direction has keyframe-specific descriptions, use them directly
        // These are rich, AI-generated descriptions specifically designed for keyframe generation
        if (!customPrompt && segmentDir?.keyframeStartDescription && segmentDir.keyframeStartDescription.trim().length > 20) {
          let keyframePrompt = segmentDir.keyframeStartDescription.trim()
          // Enrich with color palette and DOF if not already present
          if (segmentDir.colorPalette && !keyframePrompt.toLowerCase().includes('color palette')) {
            keyframePrompt += ` Color palette: ${segmentDir.colorPalette}.`
          }
          if (segmentDir.depthOfField && !keyframePrompt.toLowerCase().includes('dof') && !keyframePrompt.toLowerCase().includes('depth of field')) {
            keyframePrompt += ` ${segmentDir.depthOfField}.`
          }
          startFramePrompt = keyframePrompt
          console.log('[Generate Frames] Using segment direction keyframe start description (Phase 8)')
        } else         // Build enhanced start frame prompt using intelligent keyframe builder if scene direction available
        if (sceneDirection && !customPrompt) {
          // Use intelligent keyframe prompt builder
          const keyframeContext: KeyframeContext = {
            segmentIndex,
            transitionType,
            previousEndFrameUrl: previousEndFrameUrl || undefined,
            previousShotType,
            isPanTransition,
          }
          
          const enhancedFrame = buildKeyframePrompt({
            actionPrompt: effectivePrompt,
            framePosition: 'start',
            duration,
            sceneDirection,
            keyframeContext,
            characters: characters.map(c => ({
              name: c.name,
              appearance: c.appearance,
              ethnicity: c.ethnicity,
              age: c.age,
              wardrobe: c.wardrobe
            })),
            objectReferences: objectReferences.map(obj => ({
              name: obj.name,
              description: obj.description,
              category: obj.category,
              importance: obj.importance,
              imageUrl: obj.imageUrl
            })),
            artStyle,
          })
          
          startFramePrompt = enhancedFrame.prompt
          console.log('[Generate Frames] Using intelligent keyframe prompt with scene direction')
          console.log('[Generate Frames] Injected direction:', enhancedFrame.injectedDirection)
        } else {
          // Fallback to original enhancePrompt
          startFramePrompt = enhancePrompt(
            `Opening frame: ${effectivePrompt}`,
            {
              actionType,
              framePosition: 'start',
              characters: characters.map(c => ({
                name: c.name,
                appearance: c.appearance,
                ethnicity: c.ethnicity,
                age: c.age,
                wardrobe: c.wardrobe
              })),
              // Merge visualSetup (from guided mode) with sceneContext
              sceneContext: {
                location: visualSetup?.location || sceneContext.location || sceneContext.heading,
                timeOfDay: visualSetup?.timeOfDay || sceneContext.timeOfDay,
                atmosphere: visualSetup?.atmosphere || sceneContext.atmosphere,
                lighting: visualSetup?.lighting || sceneContext.lighting,
                // New from visualSetup
                shotType: visualSetup?.shotType,
                cameraAngle: visualSetup?.cameraAngle,
                weather: visualSetup?.weather,
              },
              actionDescription: effectivePrompt
            }
          )
          
          // Apply art style to fallback prompt (replace generic quality suffix with selected style)
          const selectedStyleForStart = artStylePresets.find(s => s.id === artStyle) || artStylePresets.find(s => s.id === 'photorealistic')!
          startFramePrompt = startFramePrompt.replace(
            /professional cinematography, 8K quality, film grain/i,
            `Cinematic quality, 8K, ${selectedStyleForStart.promptSuffix}`
          )
        }
        
        // Append negative prompt to main prompt (Gemini doesn't have native negative prompt support)
        if (negativePrompt) {
          startFramePrompt = `${startFramePrompt}\n\nAvoid: ${negativePrompt}`
          console.log('[Generate Frames] Added negative prompt:', negativePrompt.substring(0, 100))
        }
        
        console.log('[Generate Frames] Start frame prompt:', startFramePrompt.substring(0, 150))
      
      // Prepare reference images
      // The scene image already contains characters in context - use it as the SINGLE reference
      // Adding separate character portrait refs is redundant and exceeds the 2-ref limit for 16:9
      const startReferenceImages: Array<{
        referenceId: number
        imageUrl: string
        subjectDescription: string
      }> = []
      
      if (referenceImageUrl) {
        // Scene image or previous frame already has characters - use as single reference
        startReferenceImages.push({
          referenceId: 1,
          imageUrl: referenceImageUrl,
          subjectDescription: transitionType === 'CONTINUE' 
            ? 'Previous frame - maintain exact visual continuity including character appearance'
            : 'Scene establishing shot - match location, style, and character appearance'
        })
        console.log('[Generate Frames] Using scene/previous frame as single reference (characters already in context)')
      } else {
        // No scene image - fall back to character portrait references
        const startCharsWithRefs = characters.filter(c => c.referenceUrl)
        console.log(`[Generate Frames] No scene image, using ${startCharsWithRefs.length} character portrait refs`)
        
        const maxRefs = aspectRatio === '1:1' ? 4 : 2
        startCharsWithRefs.slice(0, maxRefs).forEach((char, index) => {
          startReferenceImages.push({
            referenceId: index + 1,
            imageUrl: char.referenceUrl!,
            subjectDescription: `Character: ${char.name} - match exact appearance`
          })
        })
      }
      
      // Generate start frame using Gemini Studio (Vertex AI was deprecated due to auth issues)
      // Gemini Studio handles both character portraits AND scene/frame references
      let startImageDataUrl: string
      
      // Collect all reference images: character portraits + scene image + prop references
      const allReferenceImages: Array<{ imageUrl: string; name: string }> = []
      
      // CRITICAL: Detect no-talent scenes (title sequences, abstract visuals, VFX-only)
      // When detected, skip character portrait references entirely — even with a correct
      // text prompt, sending portrait photos causes the model to draw those people
      const isNoTalentSegment = (() => {
        if (!sceneDirection?.talent) return false
        const talentStr = typeof sceneDirection.talent === 'string' 
          ? sceneDirection.talent 
          : (sceneDirection.talent.blocking || sceneDirection.talent.emotionalBeat || '')
        const lower = talentStr.toLowerCase()
        return ['n/a', 'no on-screen talent', 'no talent', 'no actors', 'no characters',
                'no people', 'abstract', 'title sequence', 'text only', 'graphics only',
                'vfx only', 'visual effects only', 'no performers'].some(x => lower.includes(x))
      })()
      
      // Determine reference image budget allocation:
      // - Location references get 1 guaranteed slot (environment consistency is high-value)
      // - Character portraits get up to 2 slots (reduced from 3 to accommodate location)
      // - Scene/frame reference gets 1 slot
      // - Props/objects fill remaining slots up to 5 total
      const hasLocationRefs = locationReferences.filter(l => l.imageUrl).length > 0
      const maxCharRefs = hasLocationRefs ? 2 : 3
      
      // Add character portrait references (up to maxCharRefs)
      // SKIP for no-talent scenes — portrait images override text prompt instructions
      const charRefs = isNoTalentSegment ? [] : characters.filter(c => c.referenceUrl).slice(0, maxCharRefs)
      if (isNoTalentSegment) {
        console.log('[Generate Frames] No-talent scene detected — skipping character portrait references')
      }
      for (const c of charRefs) {
        allReferenceImages.push({
          imageUrl: c.referenceUrl!,
          name: c.name
        })
      }
      
      // Add location reference images (1 guaranteed slot)
      const locationRefs = locationReferences.filter(l => l.imageUrl).slice(0, 1)
      for (const loc of locationRefs) {
        if (allReferenceImages.length < 5) {
          allReferenceImages.push({
            imageUrl: loc.imageUrl!,
            name: `Location: ${loc.name}`
          })
        }
      }
      
      // Add scene/frame reference if available
      if (referenceImageUrl && allReferenceImages.length < 5) {
        allReferenceImages.push({
          imageUrl: referenceImageUrl,
          name: 'Scene Reference'
        })
      }
      
      // Add prop/object reference images (critical and important props with images)
      const propRefs = objectReferences
        .filter(obj => obj.imageUrl && (obj.importance === 'critical' || obj.importance === 'important'))
        .slice(0, 5 - allReferenceImages.length) // Fill remaining slots up to 5
      for (const prop of propRefs) {
        allReferenceImages.push({
          imageUrl: prop.imageUrl!,
          name: `Prop: ${prop.name}`
        })
      }
      
      console.log(`[Generate Frames] Using Gemini Studio with ${allReferenceImages.length} reference image(s)`)
      console.log(`[Generate Frames] References: ${allReferenceImages.map(r => r.name).join(', ') || 'none'}`)
      
      // Build enhanced prompt for Gemini
      // CRITICAL: For non-photorealistic styles, we MUST make the style directive prominent
      // because reference images are photorealistic and would otherwise dominate the output
      let geminiPrompt = startFramePrompt
      
      if (!isPhotorealistic) {
        // Non-photorealistic: Style transformation is MANDATORY
        if (charRefs.length > 0 && !isNoTalentSegment) {
          geminiPrompt = `MANDATORY ART STYLE: ${selectedStyle.name.toUpperCase()}
Style specification: ${selectedStyle.promptSuffix}

Generate a frame in ${selectedStyle.name} style. The reference images show character IDENTITY only (facial structure, ethnicity, distinguishing features). You MUST render them in ${selectedStyle.name} style - do NOT output photorealistic images.

${startFramePrompt}

CRITICAL REQUIREMENTS:
- Render in ${selectedStyle.name} style: ${selectedStyle.promptSuffix}
- Transform the photorealistic references INTO ${selectedStyle.name} aesthetic
- Preserve character IDENTITY (face shape, ethnicity, age, distinguishing features)
- The output MUST look like ${selectedStyle.name}, NOT photorealistic photography`
        } else if (referenceImageUrl) {
          geminiPrompt = `MANDATORY ART STYLE: ${selectedStyle.name.toUpperCase()}
Style specification: ${selectedStyle.promptSuffix}

Generate a frame in ${selectedStyle.name} style. Use the reference for scene composition but render in ${selectedStyle.name} style.

${startFramePrompt}

CRITICAL: Output must be ${selectedStyle.name} style, not photorealistic.`
        } else {
          geminiPrompt = `MANDATORY ART STYLE: ${selectedStyle.name.toUpperCase()}
Style specification: ${selectedStyle.promptSuffix}

${startFramePrompt}

Render this scene in ${selectedStyle.name} style.`
        }
      } else {
        // Photorealistic: Exact appearance matching is the priority
        if (charRefs.length > 0 && !isNoTalentSegment) {
          geminiPrompt = `Generate a cinematic frame based on this description. The character(s) shown in the reference image(s) must appear in this scene with their exact appearance preserved.\n\n${startFramePrompt}\n\nIMPORTANT: Match the character's ethnicity, facial features, hair color/style, and facial hair exactly from the reference images.`
        } else if (referenceImageUrl) {
          geminiPrompt = `Generate a cinematic frame based on this description. Use the provided reference image for visual style and scene continuity.\n\n${startFramePrompt}`
        }
      }
      
      const result = await generateImageWithGeminiStudio({
        prompt: geminiPrompt,
        aspectRatio: aspectRatio as '16:9' | '9:16' | '1:1',
        imageSize: modelTier === 'eco' ? '1K' : '2K',
        referenceImages: allReferenceImages.length > 0 ? allReferenceImages : undefined,
        modelTier,
        thinkingLevel,
        negativePrompt
      })
      startImageDataUrl = result.imageBase64
      
      // Upload to blob storage
      generatedStartFrameUrl = await uploadImageToBlob(
        startImageDataUrl,
        `scenes/${sceneId}/segments/${segmentId}/start-frame-${Date.now()}.png`
      )
      
      console.log('[Generate Frames] Start frame generated:', generatedStartFrameUrl)
      } // End of else block for generating new start frame
    }

    // ========================================================================
    // GENERATE END FRAME
    // ========================================================================
    if (frameType === 'end' || frameType === 'both') {
      console.log('[Generate Frames] Generating end frame...')
      
      // For end frame, we need a start frame reference
      const startFrameReference = generatedStartFrameUrl || providedStartFrameUrl
      
      if (!startFrameReference) {
        return NextResponse.json(
          { error: 'End frame generation requires a start frame reference' },
          { status: 400 }
        )
      }
      
      // Build enhanced end frame prompt using intelligence library
      // Phase 8: Use segment direction keyframe end description if available
      // Phase 11: Enrich with segment content context (dialogue, narration, action)
      if (!customPrompt && segmentDir?.keyframeEndDescription && segmentDir.keyframeEndDescription.trim().length > 20) {
        let keyframePrompt = segmentDir.keyframeEndDescription.trim()
        if (segmentDir.colorPalette && !keyframePrompt.toLowerCase().includes('color palette')) {
          keyframePrompt += ` Color palette: ${segmentDir.colorPalette}.`
        }
        if (segmentDir.depthOfField && !keyframePrompt.toLowerCase().includes('dof') && !keyframePrompt.toLowerCase().includes('depth of field')) {
          keyframePrompt += ` ${segmentDir.depthOfField}.`
        }
        // Phase 11: Append content-aware delta to the keyframe description
        if (segmentContent) {
          const contentDelta = buildContentDelta(segmentContent, duration)
          if (contentDelta) {
            keyframePrompt += ` ${contentDelta}`
          }
        }
        endFramePrompt = keyframePrompt
        console.log('[Generate Frames] Using segment direction keyframe end description (Phase 8+11)')
      } else if (sceneDirection) {
        const keyframeContext: KeyframeContext = {
          segmentIndex,
          transitionType,
          previousEndFrameUrl: previousEndFrameUrl || undefined,
          previousShotType,
          isPanTransition,
        }
        
        const enhancedFrame = buildKeyframePrompt({
          actionPrompt: effectivePrompt,
          framePosition: 'end',
          duration,
          sceneDirection,
          keyframeContext,
          characters: characters.map(c => ({
            name: c.name,
            appearance: c.appearance,
            ethnicity: c.ethnicity,
            age: c.age,
            wardrobe: c.wardrobe
          })),
          objectReferences: objectReferences.map(obj => ({
            name: obj.name,
            description: obj.description,
            category: obj.category,
            importance: obj.importance,
            imageUrl: obj.imageUrl
          })),
          previousFrameDescription: `Opening frame showing: ${actionPrompt}`,
          artStyle,
          // Phase 11: Pass segment content for content-aware end frames
          segmentContent: segmentContent ? {
            ...segmentContent,
            startFrameDescription: segmentDir?.keyframeStartDescription || startFramePrompt || actionPrompt,
          } : undefined,
        })
        
        endFramePrompt = enhancedFrame.prompt
        console.log('[Generate Frames] Using intelligent keyframe prompt for end frame')
        console.log('[Generate Frames] Injected direction:', enhancedFrame.injectedDirection)
      } else {
        // Fallback to original buildEndFramePrompt
        endFramePrompt = buildEndFramePrompt(
          `Opening frame showing: ${actionPrompt}`,
          actionPrompt,
          duration,
          {
            actionType,
            characters: characters.map(c => ({
              name: c.name,
              appearance: c.appearance,
              ethnicity: c.ethnicity,
              age: c.age,
              wardrobe: c.wardrobe
            })),
            // Merge visualSetup (from guided mode) with sceneContext
            sceneContext: {
              location: visualSetup?.location || sceneContext.location || sceneContext.heading,
              timeOfDay: visualSetup?.timeOfDay || sceneContext.timeOfDay,
              atmosphere: visualSetup?.atmosphere || sceneContext.atmosphere,
              lighting: visualSetup?.lighting || sceneContext.lighting,
              // New from visualSetup
              shotType: visualSetup?.shotType,
              cameraAngle: visualSetup?.cameraAngle,
              weather: visualSetup?.weather,
            }
          }
        )
        
        // Apply art style to fallback end frame prompt (replace generic quality suffix with selected style)
        const selectedStyleForEnd = artStylePresets.find(s => s.id === artStyle) || artStylePresets.find(s => s.id === 'photorealistic')!
        endFramePrompt = endFramePrompt.replace(
          /professional cinematography, 8K quality, film grain/i,
          `Cinematic quality, 8K, ${selectedStyleForEnd.promptSuffix}`
        )
      }
      
      console.log('[Generate Frames] End frame prompt:', endFramePrompt.substring(0, 150))
      
      // Append negative prompt to end frame prompt as well
      if (negativePrompt) {
        endFramePrompt = `${endFramePrompt}\n\nAvoid: ${negativePrompt}`
      }
      
      // Prepare reference images for end frame
      // The start frame already contains characters in context - use it as the SINGLE reference
      // Adding separate character portrait refs is redundant and exceeds the 2-ref limit for 16:9
      // Build reference images for end frame - start frame as primary SUBJECT reference
      // Phase 11: Use start frame as SUBJECT reference (strict composition preservation)
      // for static cameras, STYLE reference for dynamic cameras
      const cameraMovement = segmentContent?.cameraMovement || segmentDir?.cameraMovement || 'Static'
      const useStrictRef = isStaticCamera(cameraMovement)
      
      const endReferenceImages: Array<{ imageUrl: string; name: string }> = [
        {
          imageUrl: startFrameReference,
          name: useStrictRef
            ? 'Start Frame — SAME composition, SAME person, SAME scene. This is the SUBJECT to preserve.'
            : 'Start Frame — SAME person and scene, but camera has moved. Match identity, allow composition shift.'
        }
      ]
      
      // Add prop/object reference images (critical and important props with images)
      // This ensures prop consistency between start and end frames
      const endPropRefs = objectReferences
        .filter(obj => obj.imageUrl && (obj.importance === 'critical' || obj.importance === 'important'))
        .slice(0, 4) // Leave room for start frame reference (max 5 total)
      for (const prop of endPropRefs) {
        endReferenceImages.push({
          imageUrl: prop.imageUrl!,
          name: `Prop: ${prop.name}`
        })
      }
      
      console.log('[Generate Frames] End frame using Gemini Studio with start frame as reference')
      console.log(`[Generate Frames] End frame refs: ${endReferenceImages.map(r => r.name).join(', ')}`)
      
      // Build enhanced prompt for end frame
      // CRITICAL: For non-photorealistic styles, we must enforce style transformation
      let geminiEndPrompt: string
      
      if (!isPhotorealistic) {
        // Non-photorealistic: Style transformation + content-aware transition
        geminiEndPrompt = `MANDATORY ART STYLE: ${selectedStyle.name.toUpperCase()}
Style specification: ${selectedStyle.promptSuffix}

Generate the ENDING frame for a ${duration}-second segment in ${selectedStyle.name} style.

CHARACTER CONTINUITY:
- The character(s) in the start frame reference must appear in this end frame
- Preserve character IDENTITY: face shape, ethnicity, age, distinguishing features
- Maintain the SAME ${selectedStyle.name} artistic rendering as the start frame

WHAT HAS CHANGED (${duration}s of action):
${endFramePrompt}

CRITICAL REQUIREMENTS:
- Output MUST be ${selectedStyle.name} style: ${selectedStyle.promptSuffix}
- Show DELIBERATE differences from start frame reflecting the action
- Match the artistic style of the start frame reference
- Do NOT output photorealistic images`
      } else {
        // Photorealistic: Exact appearance matching + content-aware transition
        geminiEndPrompt = `Generate the ending frame for a ${duration}-second scene segment.

CRITICAL — THIS IS THE SAME SCENE, SAME MOMENT:
- The reference image is the START of this ${duration}s segment
- You are generating what the scene looks like at the END
- The person(s) MUST be the SAME PERSON(S) — identical face, skin tone, hair, clothing
- The environment MUST be the SAME LOCATION with the SAME lighting

WHAT HAS CHANGED (the ${duration}s of action):
${endFramePrompt}

REQUIREMENTS:
- Preserve EXACT character identity: face structure, ethnicity, hair color/style, clothing
- Show DELIBERATE, VISIBLE differences from the start frame that reflect the action
- Maintain consistent camera angle and composition unless the action requires movement
- Same color grading and visual style as the start frame`
      }
      
      // Generate end frame using Gemini Studio
      const endResult = await generateImageWithGeminiStudio({
        prompt: geminiEndPrompt,
        aspectRatio: aspectRatio as '16:9' | '9:16' | '1:1',
        imageSize: modelTier === 'eco' ? '1K' : '2K',
        referenceImages: endReferenceImages,
        modelTier,
        thinkingLevel,
        negativePrompt
      })
      const endImageDataUrl = endResult.imageBase64
      
      // Upload to blob storage
      generatedEndFrameUrl = await uploadImageToBlob(
        endImageDataUrl,
        `scenes/${sceneId}/segments/${segmentId}/end-frame-${Date.now()}.png`
      )
      
      console.log('[Generate Frames] End frame generated:', generatedEndFrameUrl)
    }

    // Determine anchor status
    let anchorStatus: AnchorStatus = 'pending'
    if (generatedStartFrameUrl || providedStartFrameUrl) {
      anchorStatus = 'start-locked'
    }
    if ((generatedStartFrameUrl || providedStartFrameUrl) && generatedEndFrameUrl) {
      anchorStatus = 'fully-anchored'
    }

    const response: FrameGenerationResponse = {
      success: true,
      segmentId,
      startFrameUrl: generatedStartFrameUrl,
      startFramePrompt,
      endFrameUrl: generatedEndFrameUrl,
      endFramePrompt,
      actionType,
      transitionType,
      anchorStatus,
      imageStrength: weights.imageStrength,
      guidanceScale: weights.guidanceScale
    }

    console.log('[Generate Frames] Complete:', {
      segmentId,
      anchorStatus,
      hasStartFrame: !!generatedStartFrameUrl,
      hasEndFrame: !!generatedEndFrameUrl
    })

    return NextResponse.json(response)

  } catch (error) {
    console.error('[Generate Frames] Error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to generate frames',
        details: errorMessage
      },
      { status: 500 }
    )
  }
}
