/**
 * Method-Specific Prompt Builders for Veo 3.1
 * 
 * Each generation method (T2V, I2V, REF, EXT, FTV) requires differently
 * structured prompts for optimal results. This module provides specialized
 * prompt builders that customize the prompt content based on the method.
 * 
 * Key differences:
 * - T2V: Full scene description with character names and appearance
 * - I2V: Action-focused, uses positional references (the image shows appearance)
 * - REF: Scene description WITHOUT character appearance (reference images provide it)
 * - EXT: Continuation-focused, builds on what's already generated
 * - FTV: Transition-focused interpolation between frames
 */

import { SceneSegment, VideoGenerationMethod, SegmentDialogueLine } from './types'

// ============================================================================
// Types
// ============================================================================

export interface SceneContextData {
  heading: string
  visualDescription: string
  narration?: string
  dialogue: Array<{
    character: string
    text: string
    emotion?: string
    index: number
  }>
  sceneDirection?: {
    camera?: string
    lighting?: string
    scene?: string
    talent?: string
    audio?: string
  }
}

export interface CharacterData {
  name: string
  description?: string
  appearanceDescription?: string
  hasReferenceImage: boolean
}

export interface MethodPromptBuilderConfig {
  segment: SceneSegment
  sceneData: SceneContextData
  characters: CharacterData[]
  userInstruction?: string
  includeDialogue?: boolean
}

export interface BuiltPrompt {
  prompt: string
  negativePrompt: string
  method: VideoGenerationMethod
  warnings?: string[]
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a simple hash of a string for comparison purposes
 */
export function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16)
}

/**
 * Get positional reference for a character based on their position in the scene
 * Used for I2V/FTV where the image already shows the character's appearance
 */
function getPositionalReference(characterName: string, characterIndex: number, totalCharacters: number): string {
  if (totalCharacters === 1) {
    return 'the person'
  }
  
  const positions = ['left', 'center', 'right']
  if (totalCharacters === 2) {
    return characterIndex === 0 ? 'the person on the left' : 'the person on the right'
  }
  
  const position = positions[Math.min(characterIndex, positions.length - 1)]
  return `the person on the ${position}`
}

/**
 * Extract dialogue lines assigned to a segment
 */
function getAssignedDialogue(
  segment: SceneSegment, 
  sceneDialogue: SceneContextData['dialogue']
): SceneContextData['dialogue'] {
  const assignedIds = segment.dialogueLineIds || []
  if (assignedIds.length === 0) return []
  
  return sceneDialogue.filter(d => assignedIds.includes(`dialogue-${d.index}`))
}

/**
 * Format dialogue for Veo 3.1 prompt (with character name)
 */
function formatDialogueWithCharacter(dialogue: { character: string; text: string; emotion?: string }): string {
  const emotionNote = dialogue.emotion ? ` (${dialogue.emotion})` : ''
  return `${dialogue.character} speaks${emotionNote}, "${dialogue.text}"`
}

/**
 * Format dialogue for I2V (using positional reference instead of character name)
 */
function formatDialoguePositional(
  dialogue: { character: string; text: string; emotion?: string },
  characters: CharacterData[]
): string {
  const charIndex = characters.findIndex(c => 
    c.name.toLowerCase() === dialogue.character.toLowerCase()
  )
  const positionalRef = getPositionalReference(dialogue.character, charIndex, characters.length)
  const emotionNote = dialogue.emotion ? ` ${dialogue.emotion}ly` : ''
  return `${positionalRef} speaks${emotionNote}, "${dialogue.text}"`
}

// ============================================================================
// T2V (Text-to-Video) Prompt Builder
// ============================================================================

/**
 * Build a T2V prompt with full scene description and character details
 * Use when: No starting image, generating from scratch with maximum detail
 */
export function buildT2VPrompt(config: MethodPromptBuilderConfig): BuiltPrompt {
  const { segment, sceneData, characters, userInstruction } = config
  const warnings: string[] = []
  
  const assignedDialogue = getAssignedDialogue(segment, sceneData.dialogue)
  
  // Build character descriptions
  const characterDescriptions = characters
    .filter(c => {
      const sceneText = `${sceneData.heading} ${sceneData.visualDescription}`.toLowerCase()
      return sceneText.includes(c.name.toLowerCase()) || 
             assignedDialogue.some(d => d.character.toLowerCase() === c.name.toLowerCase())
    })
    .map(c => {
      const appearance = c.appearanceDescription || c.description || ''
      return appearance ? `${c.name}: ${appearance}` : c.name
    })
  
  // Build prompt parts
  const parts: string[] = []
  
  // User instruction takes priority
  if (userInstruction) {
    parts.push(userInstruction)
  }
  
  // Shot type and framing
  if (segment.shotType) {
    parts.push(`${segment.shotType} shot`)
  }
  
  // Scene heading/location
  parts.push(sceneData.heading)
  
  // Visual description
  if (sceneData.visualDescription) {
    parts.push(sceneData.visualDescription)
  }
  
  // Character appearances (important for T2V)
  if (characterDescriptions.length > 0) {
    parts.push(`Characters: ${characterDescriptions.join('. ')}`)
  }
  
  // Action from segment
  if (segment.action) {
    parts.push(segment.action)
  }
  
  // Dialogue
  assignedDialogue.forEach(d => {
    parts.push(formatDialogueWithCharacter(d))
  })
  
  // Camera movement
  if (segment.cameraMovement) {
    parts.push(`Camera: ${segment.cameraMovement}`)
  }
  
  // Emotional beat
  if (segment.emotionalBeat) {
    parts.push(`Mood: ${segment.emotionalBeat}`)
  }
  
  // Scene direction
  if (sceneData.sceneDirection?.lighting) {
    parts.push(`Lighting: ${sceneData.sceneDirection.lighting}`)
  }
  
  const prompt = parts.filter(Boolean).join('. ')
  
  // Build negative prompt
  const negativePrompt = buildNegativePrompt('T2V')
  
  return {
    prompt,
    negativePrompt,
    method: 'T2V',
    warnings: warnings.length > 0 ? warnings : undefined,
  }
}

// ============================================================================
// I2V (Image-to-Video) Prompt Builder
// ============================================================================

/**
 * Build an I2V prompt focused on action and motion
 * Use when: Starting from an image, describe what should CHANGE/MOVE
 * The image already shows character appearance, so use positional references
 */
export function buildI2VPrompt(config: MethodPromptBuilderConfig): BuiltPrompt {
  const { segment, sceneData, characters, userInstruction } = config
  const warnings: string[] = []
  
  const assignedDialogue = getAssignedDialogue(segment, sceneData.dialogue)
  
  const parts: string[] = []
  
  // User instruction takes priority
  if (userInstruction) {
    parts.push(userInstruction)
  }
  
  // Camera movement is crucial for I2V
  if (segment.cameraMovement) {
    parts.push(`Camera ${segment.cameraMovement}`)
  }
  
  // Action description - use positional references
  if (segment.action) {
    // Replace character names with positional references
    let actionText = segment.action
    characters.forEach((char, idx) => {
      const positionalRef = getPositionalReference(char.name, idx, characters.length)
      const nameRegex = new RegExp(`\\b${char.name}\\b`, 'gi')
      actionText = actionText.replace(nameRegex, positionalRef)
    })
    parts.push(actionText)
  }
  
  // Dialogue with positional references
  assignedDialogue.forEach(d => {
    parts.push(formatDialoguePositional(d, characters))
  })
  
  // Motion/emotion descriptors
  if (segment.emotionalBeat) {
    parts.push(`The scene feels ${segment.emotionalBeat.toLowerCase()}`)
  }
  
  // Do NOT include:
  // - Character appearance descriptions (image shows it)
  // - Static scene elements (already in image)
  // - Location descriptions (already visible)
  
  if (parts.length === 0) {
    parts.push('Subtle motion and natural movement')
    warnings.push('No specific action provided, using default motion')
  }
  
  const prompt = parts.filter(Boolean).join('. ')
  
  return {
    prompt,
    negativePrompt: buildNegativePrompt('I2V'),
    method: 'I2V',
    warnings: warnings.length > 0 ? warnings : undefined,
  }
}

// ============================================================================
// REF (Reference Images) Prompt Builder
// ============================================================================

/**
 * Build a REF prompt - scene description WITHOUT character appearance
 * Use when: Using character/style reference images
 * Reference images provide character appearance, so don't describe it
 */
export function buildREFPrompt(config: MethodPromptBuilderConfig): BuiltPrompt {
  const { segment, sceneData, characters, userInstruction } = config
  const warnings: string[] = []
  
  const assignedDialogue = getAssignedDialogue(segment, sceneData.dialogue)
  
  const parts: string[] = []
  
  // User instruction takes priority
  if (userInstruction) {
    parts.push(userInstruction)
  }
  
  // Shot type
  if (segment.shotType) {
    parts.push(`${segment.shotType} shot`)
  }
  
  // Scene heading/location
  parts.push(sceneData.heading)
  
  // Visual description - but strip character appearance details
  if (sceneData.visualDescription) {
    parts.push(sceneData.visualDescription)
  }
  
  // Character ACTIONS only (not appearance) - use just names
  assignedDialogue.forEach(d => {
    // Simple format: just name and action, no appearance
    parts.push(`${d.character} says, "${d.text}"`)
  })
  
  // Action from segment - remove appearance words
  if (segment.action) {
    parts.push(segment.action)
  }
  
  // Camera movement
  if (segment.cameraMovement) {
    parts.push(`Camera: ${segment.cameraMovement}`)
  }
  
  // Emotional beat
  if (segment.emotionalBeat) {
    parts.push(`Mood: ${segment.emotionalBeat}`)
  }
  
  // Lighting/atmosphere (these are important even with refs)
  if (sceneData.sceneDirection?.lighting) {
    parts.push(`Lighting: ${sceneData.sceneDirection.lighting}`)
  }
  
  // WARNING: Do NOT include character appearance descriptions
  // The reference images provide that information
  if (characters.some(c => c.appearanceDescription)) {
    warnings.push('Character appearances omitted - reference images will define appearance')
  }
  
  const prompt = parts.filter(Boolean).join('. ')
  
  return {
    prompt,
    negativePrompt: buildNegativePrompt('REF'),
    method: 'REF',
    warnings: warnings.length > 0 ? warnings : undefined,
  }
}

// ============================================================================
// EXT (Extend) Prompt Builder
// ============================================================================

/**
 * Build an EXT prompt focused on continuation
 * Use when: Extending an existing Veo-generated video
 * Describes what happens NEXT, building on existing context
 */
export function buildEXTPrompt(config: MethodPromptBuilderConfig): BuiltPrompt {
  const { segment, sceneData, characters, userInstruction } = config
  const warnings: string[] = []
  
  const assignedDialogue = getAssignedDialogue(segment, sceneData.dialogue)
  
  const parts: string[] = []
  
  // User instruction takes priority
  if (userInstruction) {
    parts.push(userInstruction)
  }
  
  // Extension continuation marker
  parts.push('The scene continues:')
  
  // What happens next (action)
  if (segment.action) {
    parts.push(segment.action)
  }
  
  // Dialogue that follows
  assignedDialogue.forEach(d => {
    parts.push(`${d.character} speaks, "${d.text}"`)
  })
  
  // Camera changes (if any)
  if (segment.cameraMovement && segment.cameraMovement !== 'static') {
    parts.push(`Camera ${segment.cameraMovement}`)
  }
  
  // Emotional shift
  if (segment.emotionalBeat) {
    parts.push(`The mood shifts to ${segment.emotionalBeat.toLowerCase()}`)
  }
  
  // End frame description for next segment continuity
  if (segment.endFrameDescription) {
    parts.push(`Ending with: ${segment.endFrameDescription}`)
  }
  
  // Note: EXT should be concise since Veo already has context
  if (parts.length <= 1) {
    parts.push('The action naturally continues')
    warnings.push('No specific continuation provided, letting AI decide')
  }
  
  const prompt = parts.filter(Boolean).join('. ')
  
  return {
    prompt,
    negativePrompt: buildNegativePrompt('EXT'),
    method: 'EXT',
    warnings: warnings.length > 0 ? warnings : undefined,
  }
}

// ============================================================================
// FTV (Frame-to-Video) Prompt Builder
// ============================================================================

/**
 * Build an FTV prompt focused on transition between frames
 * Use when: Interpolating between a start and end frame
 * Describes the TRANSITION/MOTION between two known states
 */
export function buildFTVPrompt(
  config: MethodPromptBuilderConfig,
  startFrameDescription?: string,
  endFrameDescription?: string
): BuiltPrompt {
  const { segment, sceneData, characters, userInstruction } = config
  const warnings: string[] = []
  
  const parts: string[] = []
  
  // User instruction takes priority
  if (userInstruction) {
    parts.push(userInstruction)
  }
  
  // Describe the transition
  if (startFrameDescription && endFrameDescription) {
    parts.push(`Smooth transition from ${startFrameDescription} to ${endFrameDescription}`)
  } else {
    parts.push('Smooth interpolation between the start and end frames')
  }
  
  // Camera movement during transition
  if (segment.cameraMovement) {
    parts.push(`Camera ${segment.cameraMovement}`)
  }
  
  // Motion style
  if (segment.emotionalBeat) {
    const pacing = segment.emotionalBeat.toLowerCase().includes('tense') 
      ? 'deliberate' 
      : 'fluid'
    parts.push(`Movement is ${pacing}`)
  }
  
  // FTV prompts should be relatively short since the frames define start/end
  const prompt = parts.filter(Boolean).join('. ')
  
  if (!startFrameDescription || !endFrameDescription) {
    warnings.push('Missing frame descriptions - interpolation may be less accurate')
  }
  
  return {
    prompt,
    negativePrompt: buildNegativePrompt('FTV'),
    method: 'FTV',
    warnings: warnings.length > 0 ? warnings : undefined,
  }
}

// ============================================================================
// Negative Prompt Builder
// ============================================================================

/**
 * Build method-appropriate negative prompt
 */
function buildNegativePrompt(method: VideoGenerationMethod): string {
  // Common negative elements
  const common = [
    'blurry',
    'low quality',
    'distorted faces',
    'extra limbs',
    'watermark',
    'text overlay',
    'subtitle',
    'logo',
  ]
  
  // Method-specific additions
  const methodSpecific: Record<VideoGenerationMethod, string[]> = {
    'T2V': ['static image', 'no movement', 'freeze frame'],
    'I2V': ['character appearance change', 'costume change', 'sudden cuts'],
    'REF': ['inconsistent character', 'wrong costume', 'different face'],
    'EXT': ['style change', 'sudden cut', 'scene change', 'different location'],
    'FTV': ['jarring transition', 'teleportation', 'sudden appearance'],
  }
  
  return [...common, ...(methodSpecific[method] || [])].join(', ')
}

// ============================================================================
// Main Dispatcher
// ============================================================================

/**
 * Build a prompt using the appropriate method-specific builder
 */
export function buildMethodSpecificPrompt(
  method: VideoGenerationMethod,
  config: MethodPromptBuilderConfig,
  options?: {
    startFrameDescription?: string
    endFrameDescription?: string
  }
): BuiltPrompt {
  switch (method) {
    case 'T2V':
      return buildT2VPrompt(config)
    case 'I2V':
      return buildI2VPrompt(config)
    case 'REF':
      return buildREFPrompt(config)
    case 'EXT':
      return buildEXTPrompt(config)
    case 'FTV':
      return buildFTVPrompt(config, options?.startFrameDescription, options?.endFrameDescription)
    default:
      console.warn(`Unknown method ${method}, falling back to T2V`)
      return buildT2VPrompt(config)
  }
}

/**
 * Refresh a segment's prompt based on current scene data
 * Used when script changes and prompts need updating
 */
export function refreshSegmentPrompt(
  segment: SceneSegment,
  sceneData: SceneContextData,
  characters: CharacterData[],
  method?: VideoGenerationMethod
): { prompt: string; promptContext: { dialogueHash: string; visualDescriptionHash: string; generatedAt: string } } {
  const targetMethod = method || segment.generationMethod || 'T2V'
  
  const config: MethodPromptBuilderConfig = {
    segment,
    sceneData,
    characters,
    userInstruction: segment.userInstruction,
  }
  
  const result = buildMethodSpecificPrompt(targetMethod, config)
  
  // Calculate hashes for staleness detection
  const assignedDialogue = getAssignedDialogue(segment, sceneData.dialogue)
  const dialogueText = assignedDialogue.map(d => `${d.character}:${d.text}`).join('|')
  const dialogueHash = hashString(dialogueText)
  const visualDescriptionHash = hashString(sceneData.visualDescription || '')
  
  return {
    prompt: result.prompt,
    promptContext: {
      dialogueHash,
      visualDescriptionHash,
      generatedAt: new Date().toISOString(),
    },
  }
}
