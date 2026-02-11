/**
 * Prompt Enhancer - Keyframe State Machine Intelligence
 * 
 * Enhances image generation prompts with inverse proportionality injection
 * based on action type. Ensures character consistency is emphasized when
 * action is minimal, and allows creative freedom when action is high.
 * 
 * PRINCIPLE: Inverse proportionality
 * - Low action → Add strong identity preservation language
 * - High action → Allow motion blur, dynamic poses, transformation
 */

import { ActionType, getActionWeights } from './ActionWeights'

export interface PromptEnhancementConfig {
  // Characters in the segment (for identity lock)
  characters?: Array<{
    name: string
    appearance?: string
    ethnicity?: string
    age?: string
    wardrobe?: string
  }>
  
  // Action type for this segment
  actionType: ActionType
  
  // Whether this is a start frame or end frame
  framePosition: 'start' | 'end'
  
  // Previous frame URL (for reference in continuation prompts)
  previousFrameUrl?: string
  
  // The raw action description
  actionDescription: string
  
  // Scene context
  sceneContext?: {
    location?: string
    timeOfDay?: string
    atmosphere?: string
    lighting?: string
  }
}

/**
 * Identity lock phrases by intensity
 * Higher intensity = stronger emphasis on preserving appearance
 */
const IDENTITY_LOCK_PHRASES = {
  extreme: [
    'IDENTICAL facial features to reference',
    'EXACT same face, bone structure, and proportions',
    'PRECISE match of skin tone, eye color, and hair texture',
    'NO deviation from character reference appearance',
    'PHOTOREALISTIC continuity with previous frame'
  ],
  strong: [
    'same facial features as reference',
    'consistent character appearance',
    'matching skin tone and hair style',
    'preserved character identity'
  ],
  moderate: [
    'recognizable as the same character',
    'consistent overall appearance',
    'similar facial structure'
  ],
  light: [
    'same character',
    'consistent identity'
  ],
  none: [] as string[]
}

/**
 * Dynamic action phrases by intensity
 * Higher intensity = more freedom for motion and change
 */
const DYNAMIC_ACTION_PHRASES = {
  extreme: [
    'dynamic motion blur',
    'dramatic pose change',
    'high-energy movement',
    'transformative action'
  ],
  strong: [
    'fluid movement',
    'natural motion',
    'energetic action'
  ],
  moderate: [
    'subtle movement',
    'gentle transition'
  ],
  light: [
    'minimal change'
  ],
  none: [] as string[]
}

/**
 * Get identity lock intensity based on action type
 */
function getIdentityLockIntensity(actionType: ActionType): keyof typeof IDENTITY_LOCK_PHRASES {
  const mapping: Record<ActionType, keyof typeof IDENTITY_LOCK_PHRASES> = {
    static: 'extreme',
    subtle: 'strong',
    speaking: 'strong',
    gesture: 'moderate',
    movement: 'moderate',
    action: 'light',
    transformation: 'none'
  }
  return mapping[actionType]
}

/**
 * Get dynamic action intensity based on action type
 */
function getDynamicActionIntensity(actionType: ActionType): keyof typeof DYNAMIC_ACTION_PHRASES {
  const mapping: Record<ActionType, keyof typeof DYNAMIC_ACTION_PHRASES> = {
    static: 'none',
    subtle: 'light',
    speaking: 'light',
    gesture: 'moderate',
    movement: 'moderate',
    action: 'strong',
    transformation: 'extreme'
  }
  return mapping[actionType]
}

/**
 * Build character description block for prompt
 * 
 * IMPORTANT: The appearance field often contains ethnicity, age, and other details.
 * To avoid conflicting descriptions (e.g., ethnicity="Caucasian" but appearance="Black man"),
 * we prioritize the appearance field when it's detailed, as it's the human-readable description.
 */
function buildCharacterBlock(characters: PromptEnhancementConfig['characters']): string {
  if (!characters || characters.length === 0) {
    return ''
  }
  
  const descriptions = characters.map(char => {
    // If we have a rich appearance description (>20 chars typically contains ethnicity/age),
    // use it as the primary source to prevent conflicts like "Caucasian" + "Black man"
    if (char.appearance && char.appearance.length > 20) {
      const parts: string[] = [char.name]
      parts.push(char.appearance)
      if (char.wardrobe) parts.push(`wearing ${char.wardrobe}`)
      return parts.join(', ')
    }
    
    // No detailed appearance - build from individual fields
    const parts: string[] = [char.name]
    if (char.ethnicity) parts.push(char.ethnicity)
    if (char.age) parts.push(char.age)
    if (char.appearance) parts.push(char.appearance)
    if (char.wardrobe) parts.push(`wearing ${char.wardrobe}`)
    return parts.join(', ')
  })
  
  return descriptions.join('; ')
}

/**
 * Build scene context block for prompt
 */
function buildSceneContextBlock(context: PromptEnhancementConfig['sceneContext']): string {
  if (!context) {
    return ''
  }
  
  const parts: string[] = []
  if (context.location) parts.push(context.location)
  if (context.timeOfDay) parts.push(context.timeOfDay)
  if (context.lighting) parts.push(`${context.lighting} lighting`)
  if (context.atmosphere) parts.push(context.atmosphere)
  
  return parts.join(', ')
}

/**
 * Enhance a base prompt with inverse proportionality injection
 */
export function enhancePrompt(
  basePrompt: string,
  config: PromptEnhancementConfig
): string {
  const { actionType, framePosition, characters, sceneContext, actionDescription } = config
  const weights = getActionWeights(actionType)
  
  const parts: string[] = []
  
  // 1. Identity lock phrases (inversely proportional to action)
  const identityIntensity = getIdentityLockIntensity(actionType)
  const identityPhrases = IDENTITY_LOCK_PHRASES[identityIntensity]
  if (identityPhrases.length > 0) {
    // Pick 1-2 phrases based on intensity
    const numPhrases = identityIntensity === 'extreme' ? 2 : 1
    parts.push(identityPhrases.slice(0, numPhrases).join(', '))
  }
  
  // 2. Character descriptions
  const characterBlock = buildCharacterBlock(characters)
  if (characterBlock) {
    parts.push(characterBlock)
  }
  
  // 3. Scene context
  const sceneBlock = buildSceneContextBlock(sceneContext)
  if (sceneBlock) {
    parts.push(sceneBlock)
  }
  
  // 4. Frame-specific language
  if (framePosition === 'start') {
    parts.push('establishing frame')
  } else {
    // End frame needs to describe the result of action
    const dynamicIntensity = getDynamicActionIntensity(actionType)
    const dynamicPhrases = DYNAMIC_ACTION_PHRASES[dynamicIntensity]
    if (dynamicPhrases.length > 0) {
      parts.push(dynamicPhrases[0])
    }
    parts.push(`after ${actionDescription}`)
  }
  
  // 5. Base prompt content
  parts.push(basePrompt)
  
  // 6. Quality modifiers
  parts.push('professional cinematography, 8K quality, film grain')
  
  // 7. Negative prompts embedded (for systems that support it)
  if (weights.imageStrength > 0.7) {
    parts.push('no morphing, no face changes, no costume changes')
  }
  
  return parts.join('. ')
}

/**
 * Build a continuation prompt that references the previous frame
 */
export function buildContinuationPrompt(
  previousFrameDescription: string,
  actionDescription: string,
  config: Omit<PromptEnhancementConfig, 'actionDescription'>
): string {
  const fullConfig: PromptEnhancementConfig = {
    ...config,
    actionDescription
  }
  
  const basePrompt = `continuing from previous shot where ${previousFrameDescription}, now ${actionDescription}`
  
  return enhancePrompt(basePrompt, fullConfig)
}

/**
 * Build an end frame prompt that visualizes the result of segment action
 */
export function buildEndFramePrompt(
  startFrameDescription: string,
  actionDescription: string,
  duration: number,
  config: Omit<PromptEnhancementConfig, 'actionDescription' | 'framePosition'>
): string {
  const fullConfig: PromptEnhancementConfig = {
    ...config,
    actionDescription,
    framePosition: 'end'
  }
  
  // Describe the temporal relationship
  const temporalContext = duration <= 3 
    ? 'moments later' 
    : duration <= 5 
    ? 'shortly after' 
    : 'some time after'
  
  const basePrompt = `${temporalContext} ${actionDescription}. Character positions and expressions show the result of the action. Starting from: ${startFrameDescription}`
  
  return enhancePrompt(basePrompt, fullConfig)
}

/**
 * Generate negative prompt based on action type
 */
export function generateNegativePrompt(actionType: ActionType): string {
  const baseNegatives = [
    'blurry',
    'low quality',
    'distorted',
    'watermark',
    'text overlay',
    'cropped',
    'bad anatomy',
    'extra limbs'
  ]
  
  // Add identity-preservation negatives for low-action types
  const weights = getActionWeights(actionType)
  if (weights.imageStrength > 0.7) {
    baseNegatives.push(
      'different face',
      'changed appearance',
      'wrong costume',
      'different person',
      'inconsistent character'
    )
  }
  
  return baseNegatives.join(', ')
}

export default {
  enhancePrompt,
  buildContinuationPrompt,
  buildEndFramePrompt,
  generateNegativePrompt,
  getIdentityLockIntensity,
  getDynamicActionIntensity
}
