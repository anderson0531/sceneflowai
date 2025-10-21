interface OptimizePromptParams {
  rawPrompt: string
  sceneAction: string
  visualDescription: string
  characterNames: string[]
  hasCharacterReferences: boolean
  characterMetadata?: Array<{
    name: string
    referenceImageGCS?: string
    appearanceDescription?: string
  }>
}

/**
 * Optimized deterministic prompt generator for Vertex AI Imagen 3
 * Uses template-based approach with explicit structure for character references
 */
export function optimizePromptForImagen(params: OptimizePromptParams): string {
  // Input validation
  if (!params.hasCharacterReferences || !params.characterMetadata || params.characterMetadata.length === 0) {
    // No character references - return cleaned scene description
    return cleanSceneDescription(params.visualDescription || params.rawPrompt)
  }

  const primaryCharacter = params.characterMetadata[0]
  
  if (!primaryCharacter.referenceImageGCS) {
    throw new Error('Character reference GCS URL is required')
  }

  // 1. Extract composition type (shot type)
  const compositionType = extractCompositionType(params.visualDescription, params.sceneAction)
  
  // 2. Build scene description (action + environment)
  const sceneDescription = buildSceneDescription(params)
  
  // 3. Core Instruction
  const coreInstruction = `Create a ${compositionType} of [Image Reference: ${primaryCharacter.referenceImageGCS}] ${sceneDescription}.`
  
  // 4. Character Modifiers
  const characterModifiers = [
    "cinematic lighting",
    "photo-realistic",
    "detailed facial features",
    "natural skin texture",
    "8K resolution",
    "sharp focus"
  ]
  
  // 5. Scene Modifiers (extracted from scene description)
  const sceneModifiers = extractSceneModifiers(params)
  
  // 6. Construct final prompt
  const optimizedPrompt = `${coreInstruction}

Character Modifiers: ${characterModifiers.join(", ")}.

Scene Modifiers: ${sceneModifiers.join(", ")}.`

  console.log('[Prompt Optimizer] Deterministic prompt generated')
  console.log('[Prompt Optimizer] Composition:', compositionType)
  console.log('[Prompt Optimizer] GCS Reference:', primaryCharacter.referenceImageGCS)
  console.log('[Prompt Optimizer] Scene:', sceneDescription.substring(0, 100))

  return optimizedPrompt.trim()
}

// Helper: Extract composition type from scene description
function extractCompositionType(visualDesc: string, action: string): string {
  const text = `${visualDesc} ${action}`.toLowerCase()
  
  if (/close.?up|cu\s/i.test(text)) return "close-up"
  if (/medium\s+close.?up/i.test(text)) return "medium close-up"
  if (/medium\s+shot/i.test(text)) return "medium shot"
  if (/wide\s+shot|establishing/i.test(text)) return "wide shot"
  if (/overhead|bird.?s\s+eye/i.test(text)) return "overhead shot"
  
  // Default to medium shot (good balance for character reference)
  return "medium shot"
}

// Helper: Build clean scene description
function buildSceneDescription(params: OptimizePromptParams): string {
  const parts: string[] = []
  
  // Extract action (remove technical terms)
  const action = cleanAction(params.sceneAction || params.visualDescription)
  if (action) parts.push(action)
  
  // Extract environment/setting
  const environment = extractEnvironment(params.visualDescription)
  if (environment) parts.push(`in ${environment}`)
  
  return parts.join(' ')
}

// Helper: Clean action description
function cleanAction(action: string): string {
  let cleaned = action
  
  // Remove shot type indicators
  cleaned = cleaned.replace(/\b(close.?up|cu|medium\s+shot|wide\s+shot|overhead|establishing)\s+/gi, '')
  
  // Remove "SOUND of..." and similar
  cleaned = cleaned.replace(/SOUND\s+of[^.]*\.?/gi, '')
  
  // Remove facial occlusion actions
  cleaned = cleaned.replace(/rubbing\s+(his|her|their)\s+(temples|eyes|face)/gi, 'looking intently')
  cleaned = cleaned.replace(/hands?\s+on\s+(his|her|their)\s+(face|head)/gi, 'focused')
  cleaned = cleaned.replace(/looking\s+down/gi, 'gazing')
  
  // Extract just the key action
  const actionMatch = cleaned.match(/(?:is\s+)?([a-z]+ing[^,\.]+)/i)
  if (actionMatch) {
    return actionMatch[1].trim()
  }
  
  return cleaned.trim()
}

// Helper: Extract environment from visual description
function extractEnvironment(visualDesc: string): string {
  // Look for location indicators
  const locationMatch = visualDesc.match(/\b(?:in|at|on|within)\s+(?:a|an|the)\s+([^,\.]+)/i)
  if (locationMatch) {
    return locationMatch[1].trim()
  }
  
  // Look for common environment patterns
  const environments = [
    'office', 'cubicle', 'room', 'street', 'beach', 'park', 'building',
    'rooftop', 'train', 'car', 'house', 'apartment', 'kitchen', 'bedroom'
  ]
  
  for (const env of environments) {
    if (new RegExp(`\\b${env}\\b`, 'i').test(visualDesc)) {
      return env
    }
  }
  
  return ''
}

// Helper: Extract scene modifiers from description
function extractSceneModifiers(params: OptimizePromptParams): string[] {
  const modifiers: string[] = []
  const text = `${params.visualDescription} ${params.sceneAction}`.toLowerCase()
  
  // Lighting
  if (/night|dark|dim/i.test(text)) modifiers.push("volumetric light", "dramatic shadows")
  if (/sunset|golden\s+hour/i.test(text)) modifiers.push("warm golden light")
  if (/sunrise|dawn/i.test(text)) modifiers.push("soft morning light")
  if (/monitor|screen\s+glow/i.test(text)) modifiers.push("cool blue glow from monitor")
  
  // Atmosphere
  if (/tense|stressed|urgent/i.test(text)) modifiers.push("high contrast", "dramatic atmosphere")
  if (/calm|peaceful|serene/i.test(text)) modifiers.push("soft lighting", "peaceful atmosphere")
  
  // Color scheme
  if (/blue/i.test(text)) modifiers.push("cool blue tones")
  if (/warm|orange|red/i.test(text)) modifiers.push("warm color palette")
  
  // Default modifiers if none found
  if (modifiers.length === 0) {
    modifiers.push("dynamic perspective", "cinematic composition", "depth of field")
  }
  
  return modifiers
}

// Helper: Clean scene description for non-reference images
function cleanSceneDescription(description: string): string {
  let cleaned = description
  
  // Remove SOUND of...
  cleaned = cleaned.replace(/SOUND\s+of[^.]*\.?/gi, '')
  
  // Add photorealistic quality
  if (!cleaned.includes('photorealistic')) {
    cleaned += '. Photorealistic, cinematic lighting, 8K resolution, sharp focus.'
  }
  
  return cleaned.trim()
}
