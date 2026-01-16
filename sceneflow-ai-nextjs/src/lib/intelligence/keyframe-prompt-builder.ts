/**
 * Keyframe Prompt Builder - Intelligent Frame Generation
 * 
 * Builds frame generation prompts that:
 * 1. Maintain scene direction context (camera, lighting, talent, atmosphere)
 * 2. Enforce keyframing rules for shot consistency
 * 3. Handle transitions (CONTINUE vs CUT) appropriately
 * 4. Inject emotional beats and performance direction
 * 
 * Design Principle: Use inexpensive LLM composition to optimize expensive
 * image/video generation by ensuring prompts are rich with scene context.
 */

import type { DetailedSceneDirection } from '@/types/scene-direction'
import type { TransitionType, ActionType } from './FrameGenerator'
import { inferActionType, getActionWeights } from './ActionWeights'

// ============================================================================
// Types
// ============================================================================

export interface KeyframeContext {
  /** Current segment index (0-based) */
  segmentIndex: number
  
  /** Transition type from previous segment */
  transitionType: TransitionType
  
  /** Previous segment's end frame URL (for CONTINUE) */
  previousEndFrameUrl?: string | null
  
  /** Previous segment's shot type (for consistency) */
  previousShotType?: string
  
  /** Whether this is a pan/transition shot */
  isPanTransition?: boolean
  
  /** Target shot for pan transitions */
  panTargetShot?: string
}

export interface FramePromptRequest {
  /** Raw action prompt from segment */
  actionPrompt: string
  
  /** Frame position: start or end */
  framePosition: 'start' | 'end'
  
  /** Segment duration in seconds */
  duration: number
  
  /** Scene direction from script phase */
  sceneDirection?: DetailedSceneDirection | null
  
  /** Keyframe context for shot rules */
  keyframeContext: KeyframeContext
  
  /** Characters in the segment */
  characters?: Array<{
    name: string
    appearance?: string
    ethnicity?: string
    age?: string
    wardrobe?: string
  }>
  
  /** Objects/props in the segment (auto-detected from segment text) */
  objectReferences?: Array<{
    name: string
    description?: string
    category?: 'prop' | 'vehicle' | 'set-piece' | 'costume' | 'technology' | 'other'
    importance?: 'critical' | 'important' | 'background'
    imageUrl?: string
  }>
  
  /** Optional: Previous end frame description for continuity */
  previousFrameDescription?: string
}

export interface EnhancedFramePrompt {
  /** Full prompt ready for image generation */
  prompt: string
  
  /** Negative prompt for quality control */
  negativePrompt: string
  
  /** Suggested shot type for this frame */
  shotType: string
  
  /** Whether to use reference image */
  useReferenceImage: boolean
  
  /** Reference image URL if applicable */
  referenceImageUrl?: string
  
  /** Image strength for img2img (0-1) */
  imageStrength: number
  
  /** Guidance scale for generation */
  guidanceScale: number
  
  /** Direction context injected (for audit) */
  injectedDirection: {
    camera: string | null
    lighting: string | null
    emotion: string | null
    atmosphere: string | null
  }
}

// ============================================================================
// Keyframing Rules
// ============================================================================

/**
 * Rule 1: Shot Consistency
 * Each segment maintains consistent shot type between start and end frames
 */
function determineShotType(
  sceneDirection: DetailedSceneDirection | null | undefined,
  keyframeContext: KeyframeContext,
  actionPrompt: string
): string {
  // For CONTINUE transitions, prefer previous shot type
  if (keyframeContext.transitionType === 'CONTINUE' && keyframeContext.previousShotType) {
    return keyframeContext.previousShotType
  }
  
  // Extract from scene direction if available
  if (sceneDirection?.camera?.shots?.length) {
    return sceneDirection.camera.shots[0]
  }
  
  // Infer from action prompt
  const actionLower = actionPrompt.toLowerCase()
  
  if (actionLower.includes('close up') || actionLower.includes('closeup') || actionLower.includes('face')) {
    return 'Close-Up'
  }
  if (actionLower.includes('wide') || actionLower.includes('establishing')) {
    return 'Wide Shot'
  }
  if (actionLower.includes('over the shoulder') || actionLower.includes('ots')) {
    return 'Over-the-Shoulder'
  }
  if (actionLower.includes('two shot') || actionLower.includes('two-shot')) {
    return 'Two Shot'
  }
  
  // Default to medium shot (most versatile)
  return 'Medium Shot'
}

/**
 * Rule 2: Shot Continuation
 * CONTINUE transitions begin with the end frame composition of previous segment
 */
function buildContinuationPrefix(
  keyframeContext: KeyframeContext,
  previousFrameDescription?: string
): string {
  if (keyframeContext.transitionType !== 'CONTINUE') {
    return ''
  }
  
  if (previousFrameDescription) {
    return `Continuation from: ${previousFrameDescription}. Maintaining same composition. `
  }
  
  if (keyframeContext.previousShotType) {
    return `Continuing ${keyframeContext.previousShotType}, same camera setup. `
  }
  
  return 'Smooth continuation from previous frame. '
}

/**
 * Rule 3: Shot Changes (CUT)
 * Fresh start frames with new composition for major cuts
 */
function buildCutFrameIntro(shotType: string): string {
  return `New ${shotType}. Fresh composition establishing the scene. `
}

/**
 * Rule 4: Pan Transitions
 * Start with previous end frame, end with transition-to composition
 */
function buildPanTransitionPrompt(
  keyframeContext: KeyframeContext,
  framePosition: 'start' | 'end',
  targetShot?: string
): string {
  if (!keyframeContext.isPanTransition) {
    return ''
  }
  
  if (framePosition === 'start') {
    return 'Beginning of camera pan movement. '
  }
  
  // End frame of pan transition shows the target
  if (targetShot || keyframeContext.panTargetShot) {
    return `Camera pan completes to reveal ${targetShot || keyframeContext.panTargetShot}. `
  }
  
  return 'Camera movement arrives at new framing. '
}

// ============================================================================
// Scene Direction Injection
// ============================================================================

/**
 * Build camera direction block for prompt
 */
function buildCameraBlock(camera: DetailedSceneDirection['camera'] | undefined): string {
  if (!camera) return ''
  
  const parts: string[] = []
  
  if (camera.angle && camera.angle !== 'Eye-Level') {
    parts.push(camera.angle)
  }
  
  if (camera.lensChoice) {
    // Extract focal length hint
    const lensMatch = camera.lensChoice.match(/(\d+mm)/i)
    if (lensMatch) {
      parts.push(`${lensMatch[1]} lens`)
    }
  }
  
  if (camera.focus && camera.focus !== 'Normal') {
    parts.push(camera.focus)
  }
  
  return parts.length > 0 ? parts.join(', ') + '. ' : ''
}

/**
 * Build lighting direction block for prompt
 */
function buildLightingBlock(lighting: DetailedSceneDirection['lighting'] | undefined): string {
  if (!lighting) return ''
  
  const parts: string[] = []
  
  if (lighting.overallMood) {
    parts.push(`${lighting.overallMood} lighting`)
  }
  
  if (lighting.timeOfDay && lighting.timeOfDay !== 'Day') {
    parts.push(lighting.timeOfDay)
  }
  
  if (lighting.colorTemperature) {
    const tempMatch = lighting.colorTemperature.match(/(warm|cool|tungsten|daylight)/i)
    if (tempMatch) {
      parts.push(`${tempMatch[1].toLowerCase()} color temperature`)
    }
  }
  
  return parts.length > 0 ? parts.join(', ') + '. ' : ''
}

/**
 * Build talent/performance direction block for prompt
 */
function buildTalentBlock(
  talent: DetailedSceneDirection['talent'] | undefined,
  actionPrompt: string
): string {
  if (!talent) return ''
  
  const parts: string[] = []
  
  // Emotional beat is critical for performance
  if (talent.emotionalBeat) {
    parts.push(`Expression conveying: ${talent.emotionalBeat}`)
  }
  
  // Physical direction
  if (talent.blocking && !actionPrompt.toLowerCase().includes(talent.blocking.toLowerCase().slice(0, 20))) {
    // Only add if not already in action prompt
    const blockingHint = talent.blocking.split(',')[0].trim() // First blocking note only
    if (blockingHint.length < 50) {
      parts.push(blockingHint)
    }
  }
  
  return parts.length > 0 ? parts.join('. ') + '. ' : ''
}

/**
 * Build atmosphere/scene block for prompt
 */
function buildAtmosphereBlock(scene: DetailedSceneDirection['scene'] | undefined): string {
  if (!scene) return ''
  
  const parts: string[] = []
  
  if (scene.atmosphere) {
    parts.push(scene.atmosphere + ' atmosphere')
  }
  
  // Include key props if distinctive
  if (scene.keyProps?.length && scene.keyProps.length <= 2) {
    parts.push(`featuring: ${scene.keyProps.join(', ')}`)
  }
  
  return parts.length > 0 ? parts.join(', ') + '. ' : ''
}

/**
 * Build character identity block
 */
function buildCharacterBlock(
  characters: FramePromptRequest['characters']
): string {
  if (!characters?.length) return ''
  
  const characterDescriptions = characters
    .filter(c => c.appearance || c.wardrobe)
    .slice(0, 2) // Limit to primary characters
    .map(c => {
      const parts: string[] = [c.name]
      if (c.ethnicity) parts.push(c.ethnicity)
      if (c.age) parts.push(`${c.age} years old`)
      if (c.wardrobe) parts.push(`wearing ${c.wardrobe}`)
      return parts.join(', ')
    })
  
  if (characterDescriptions.length === 0) return ''
  
  return characterDescriptions.join('; ') + '. '
}

/**
 * Build object/prop identity block for visual consistency
 * Auto-detected objects are included to maintain prop continuity across frames
 */
function buildObjectBlock(
  objectReferences: FramePromptRequest['objectReferences']
): string {
  if (!objectReferences?.length) return ''
  
  // Sort by importance: critical > important > background
  const sortedObjects = [...objectReferences].sort((a, b) => {
    const order: Record<string, number> = { critical: 0, important: 1, background: 2 }
    return (order[a.importance || 'background'] ?? 3) - (order[b.importance || 'background'] ?? 3)
  })
  
  // Limit to top 3 objects to avoid prompt bloat
  const topObjects = sortedObjects.slice(0, 3)
  
  const objectDescriptions = topObjects
    .map(obj => {
      // For critical/important objects, include description if available
      if ((obj.importance === 'critical' || obj.importance === 'important') && obj.description) {
        // Keep description concise
        const shortDesc = obj.description.length > 50 
          ? obj.description.substring(0, 50).trim() + '...' 
          : obj.description
        return `${obj.name} (${shortDesc})`
      }
      return obj.name
    })
  
  if (objectDescriptions.length === 0) return ''
  
  return `Key props: ${objectDescriptions.join(', ')}. `
}

// ============================================================================
// Main Builder
// ============================================================================

/**
 * Build an intelligent frame generation prompt
 * 
 * Applies keyframing rules and injects scene direction for consistent,
 * direction-aware frame generation.
 */
export function buildKeyframePrompt(request: FramePromptRequest): EnhancedFramePrompt {
  const {
    actionPrompt,
    framePosition,
    duration,
    sceneDirection,
    keyframeContext,
    characters,
    objectReferences,
    previousFrameDescription
  } = request
  
  const actionType = inferActionType(actionPrompt)
  const weights = getActionWeights(actionType)
  
  // Determine shot type using rules
  const shotType = determineShotType(sceneDirection, keyframeContext, actionPrompt)
  
  // Build prompt components
  const promptParts: string[] = []
  
  // 1. Frame position context
  if (framePosition === 'start') {
    if (keyframeContext.transitionType === 'CONTINUE') {
      promptParts.push(buildContinuationPrefix(keyframeContext, previousFrameDescription))
    } else {
      promptParts.push(buildCutFrameIntro(shotType))
    }
  } else {
    // End frame
    promptParts.push(`End of ${duration}s segment. `)
  }
  
  // 2. Pan transition handling
  const panPrompt = buildPanTransitionPrompt(keyframeContext, framePosition)
  if (panPrompt) {
    promptParts.push(panPrompt)
  }
  
  // 3. Shot type (always include)
  promptParts.push(`${shotType}. `)
  
  // 4. Camera direction from scene
  const cameraBlock = buildCameraBlock(sceneDirection?.camera)
  if (cameraBlock) {
    promptParts.push(cameraBlock)
  }
  
  // 5. Lighting direction
  const lightingBlock = buildLightingBlock(sceneDirection?.lighting)
  if (lightingBlock) {
    promptParts.push(lightingBlock)
  }
  
  // 6. Character identities
  const characterBlock = buildCharacterBlock(characters)
  if (characterBlock) {
    promptParts.push(characterBlock)
  }
  
  // 7. Object/prop identities (auto-detected from segment text)
  const objectBlock = buildObjectBlock(objectReferences)
  if (objectBlock) {
    promptParts.push(objectBlock)
  }
  
  // 8. Core action/visual content
  promptParts.push(actionPrompt.trim())
  
  // 9. Talent/performance direction (critical for emotion)
  const talentBlock = buildTalentBlock(sceneDirection?.talent, actionPrompt)
  if (talentBlock) {
    promptParts.push(' ' + talentBlock)
  }
  
  // 10. Atmosphere
  const atmosphereBlock = buildAtmosphereBlock(sceneDirection?.scene)
  if (atmosphereBlock) {
    promptParts.push(atmosphereBlock)
  }
  
  // 11. Quality suffix
  promptParts.push('Cinematic quality, 8K, photorealistic.')
  
  // Determine reference image usage
  const useReferenceImage = 
    (keyframeContext.transitionType === 'CONTINUE' && !!keyframeContext.previousEndFrameUrl) ||
    framePosition === 'end'
  
  const referenceImageUrl = keyframeContext.transitionType === 'CONTINUE'
    ? keyframeContext.previousEndFrameUrl || undefined
    : undefined
  
  // Calculate image strength based on context
  let imageStrength = weights.imageStrength
  if (keyframeContext.transitionType === 'CONTINUE' && useReferenceImage) {
    // Higher strength for continuations
    imageStrength = Math.min(0.90, imageStrength + 0.15)
  }
  
  // Build negative prompt
  const negativePrompt = buildNegativePrompt(actionType)
  
  return {
    prompt: promptParts.join('').replace(/\s+/g, ' ').trim(),
    negativePrompt,
    shotType,
    useReferenceImage,
    referenceImageUrl,
    imageStrength,
    guidanceScale: weights.guidanceScale,
    injectedDirection: {
      camera: sceneDirection?.camera?.movement || null,
      lighting: sceneDirection?.lighting?.overallMood || null,
      emotion: sceneDirection?.talent?.emotionalBeat || null,
      atmosphere: sceneDirection?.scene?.atmosphere || null
    }
  }
}

/**
 * Build negative prompt based on action type
 */
function buildNegativePrompt(actionType: ActionType): string {
  const baseNegatives = [
    'blurry', 'low quality', 'pixelated', 'noisy', 'grainy',
    'jpeg artifacts', 'compression artifacts', 'bad anatomy',
    'extra limbs', 'missing limbs', 'deformed', 'mutated', 'disfigured',
    'malformed hands', 'extra fingers', 'missing fingers',
    'text', 'watermark', 'logo', 'signature', 'username', 'copyright',
    'words', 'letters', 'overexposed', 'underexposed',
    'harsh lighting', 'flat lighting', 'washed out', 'oversaturated',
    'cropped', 'out of frame', 'bad framing', 'awkward angle',
    'distorted perspective', 'cartoon', 'anime', 'illustration',
    'painting', 'drawing', 'sketch', '3D render', 'CGI', 'video game'
  ]
  
  // Action-specific additions
  if (actionType === 'static' || actionType === 'subtle') {
    // For low-motion shots, emphasize identity preservation
    baseNegatives.push('different face', 'changed appearance', 'different clothing')
  }
  
  if (actionType === 'speaking') {
    baseNegatives.push('closed mouth when speaking', 'frozen expression')
  }
  
  return baseNegatives.join(', ')
}

/**
 * Validate a prompt against scene direction for adherence
 * Returns a score (0-1) and list of missing elements
 */
export function validateDirectionAdherence(
  prompt: string,
  sceneDirection: DetailedSceneDirection | null
): {
  score: number
  missingElements: string[]
  suggestions: string[]
} {
  if (!sceneDirection) {
    return { score: 1, missingElements: [], suggestions: [] }
  }
  
  const promptLower = prompt.toLowerCase()
  const missing: string[] = []
  const suggestions: string[] = []
  
  // Check camera direction
  if (sceneDirection.camera?.movement) {
    const movement = sceneDirection.camera.movement.toLowerCase()
    if (!promptLower.includes(movement.split(' ')[0])) {
      missing.push(`Camera movement: ${sceneDirection.camera.movement}`)
      suggestions.push(`Add "${sceneDirection.camera.movement}" camera direction`)
    }
  }
  
  // Check lighting
  if (sceneDirection.lighting?.overallMood) {
    const mood = sceneDirection.lighting.overallMood.toLowerCase()
    if (!promptLower.includes(mood.split(' ')[0]) && !promptLower.includes('lighting')) {
      missing.push(`Lighting mood: ${sceneDirection.lighting.overallMood}`)
      suggestions.push(`Describe lighting as "${sceneDirection.lighting.overallMood}"`)
    }
  }
  
  // Check emotional beat (critical for talent direction)
  if (sceneDirection.talent?.emotionalBeat) {
    const emotion = sceneDirection.talent.emotionalBeat.toLowerCase()
    const emotionWords = emotion.split(' ').filter(w => w.length > 3)
    const hasEmotion = emotionWords.some(word => promptLower.includes(word))
    if (!hasEmotion) {
      missing.push(`Emotional beat: ${sceneDirection.talent.emotionalBeat}`)
      suggestions.push(`Convey emotion: "${sceneDirection.talent.emotionalBeat}"`)
    }
  }
  
  // Check atmosphere
  if (sceneDirection.scene?.atmosphere) {
    const atmos = sceneDirection.scene.atmosphere.toLowerCase()
    if (!promptLower.includes(atmos.split(' ')[0])) {
      missing.push(`Atmosphere: ${sceneDirection.scene.atmosphere}`)
    }
  }
  
  // Calculate score (0-1)
  const totalChecks = 4
  const passedChecks = totalChecks - missing.length
  const score = passedChecks / totalChecks
  
  return { score, missingElements: missing, suggestions }
}

/**
 * Enrich an existing prompt with missing scene direction elements
 */
export function enrichPromptWithDirection(
  existingPrompt: string,
  sceneDirection: DetailedSceneDirection | null,
  targetScore: number = 0.75
): string {
  if (!sceneDirection) return existingPrompt
  
  const validation = validateDirectionAdherence(existingPrompt, sceneDirection)
  
  if (validation.score >= targetScore) {
    return existingPrompt
  }
  
  // Append missing critical elements
  const additions: string[] = []
  
  if (validation.missingElements.some(m => m.includes('Emotional beat'))) {
    additions.push(`Expression: ${sceneDirection.talent?.emotionalBeat}`)
  }
  
  if (validation.missingElements.some(m => m.includes('Lighting'))) {
    additions.push(`${sceneDirection.lighting?.overallMood} lighting`)
  }
  
  if (additions.length === 0) {
    return existingPrompt
  }
  
  // Insert before quality suffix if present
  const qualitySuffix = 'Cinematic quality'
  const hasQualitySuffix = existingPrompt.includes(qualitySuffix)
  
  if (hasQualitySuffix) {
    return existingPrompt.replace(qualitySuffix, `${additions.join('. ')}. ${qualitySuffix}`)
  }
  
  return `${existingPrompt} ${additions.join('. ')}.`
}
