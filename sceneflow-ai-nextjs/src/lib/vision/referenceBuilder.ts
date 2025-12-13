/**
 * Reference Builder Service
 * 
 * Builds and validates reference image arrays for Veo 3.1 video generation.
 * Handles combining scene images, character references, and style references
 * while respecting Veo 3.1 constraints (max 3 references, type requirements).
 */

export interface ReferenceImage {
  url: string
  type: 'character' | 'style'  // Veo uses 'asset' for character, 'style' for style
}

export interface CharacterReference {
  id: string
  name: string
  referenceImageUrl?: string
}

export interface SceneReference {
  imageUrl: string
  description?: string
}

export interface BuildReferenceResult {
  referenceImages: ReferenceImage[]
  sceneImageForI2V?: string  // Scene image to use as startFrame for I2V
  warnings: string[]
}

/**
 * Maximum number of reference images Veo 3.1 accepts
 */
const MAX_REFERENCE_IMAGES = 3

/**
 * Builds reference images array for Veo 3.1 REF method
 * Prioritizes character references, then scene/style references
 */
export function buildReferenceImages(
  characterRefs: CharacterReference[],
  sceneRef?: SceneReference,
  additionalStyleRefs: string[] = []
): BuildReferenceResult {
  const referenceImages: ReferenceImage[] = []
  const warnings: string[] = []
  
  // 1. Add character references (highest priority for consistency)
  const validCharacterRefs = characterRefs.filter(c => c.referenceImageUrl)
  
  for (const char of validCharacterRefs) {
    if (referenceImages.length >= MAX_REFERENCE_IMAGES) {
      warnings.push(`Character "${char.name}" reference excluded - max ${MAX_REFERENCE_IMAGES} references allowed`)
      continue
    }
    
    referenceImages.push({
      url: char.referenceImageUrl!,
      type: 'character',
    })
  }
  
  // 2. Add scene reference as style (if room and provided)
  if (sceneRef?.imageUrl && referenceImages.length < MAX_REFERENCE_IMAGES) {
    referenceImages.push({
      url: sceneRef.imageUrl,
      type: 'style',
    })
  } else if (sceneRef?.imageUrl && referenceImages.length >= MAX_REFERENCE_IMAGES) {
    warnings.push('Scene reference excluded - max references reached')
  }
  
  // 3. Add additional style references (if room)
  for (const styleUrl of additionalStyleRefs) {
    if (referenceImages.length >= MAX_REFERENCE_IMAGES) {
      warnings.push('Additional style reference excluded - max references reached')
      break
    }
    
    referenceImages.push({
      url: styleUrl,
      type: 'style',
    })
  }
  
  // Return scene image separately for potential I2V use
  return {
    referenceImages,
    sceneImageForI2V: sceneRef?.imageUrl,
    warnings,
  }
}

/**
 * Validates that scene has required establishing shot before video generation
 */
export function validateSceneImageRequirement(
  scene: { imageUrl?: string; heading?: string | { text: string } },
  segmentIndex: number
): { valid: boolean; error?: string; canProceed: boolean } {
  const sceneHeading = typeof scene.heading === 'string' 
    ? scene.heading 
    : scene.heading?.text || 'Scene'
  
  // First segment requires scene image for best results
  if (segmentIndex === 0 && !scene.imageUrl) {
    return {
      valid: false,
      error: `${sceneHeading} is missing an establishing shot image. Generate a scene image first for visual consistency.`,
      canProceed: true,  // Soft requirement - warn but allow
    }
  }
  
  return { valid: true, canProceed: true }
}

/**
 * Gets characters mentioned in a prompt from the character list
 */
export function getCharactersInPrompt(
  prompt: string,
  allCharacters: CharacterReference[]
): CharacterReference[] {
  return allCharacters.filter(char => {
    const namePattern = new RegExp(`\\b${escapeRegex(char.name)}\\b`, 'i')
    return namePattern.test(prompt)
  })
}

/**
 * Escapes special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Prioritizes references based on segment context
 * Returns the most relevant references for the given segment
 */
export function prioritizeReferences(
  segmentPrompt: string,
  allCharacters: CharacterReference[],
  sceneRef?: SceneReference,
  isFirstSegment: boolean = false
): BuildReferenceResult {
  // Get characters mentioned in this segment's prompt
  const mentionedCharacters = getCharactersInPrompt(segmentPrompt, allCharacters)
  
  // If specific characters mentioned, prioritize those
  const charactersToPrioritize = mentionedCharacters.length > 0 
    ? mentionedCharacters 
    : allCharacters.slice(0, 2)  // Default to first 2 characters
  
  // First segment benefits more from scene reference
  if (isFirstSegment && sceneRef) {
    // For first segment, include scene ref even if it means fewer characters
    const maxChars = Math.min(charactersToPrioritize.length, MAX_REFERENCE_IMAGES - 1)
    return buildReferenceImages(
      charactersToPrioritize.slice(0, maxChars),
      sceneRef
    )
  }
  
  // Subsequent segments prioritize character consistency
  return buildReferenceImages(
    charactersToPrioritize,
    sceneRef
  )
}

/**
 * Formats reference images for Veo API request
 * Maps our types to Veo's expected format
 */
export function formatReferencesForVeo(
  references: ReferenceImage[]
): Array<{ url: string; type: 'style' | 'character' }> {
  return references.map(ref => ({
    url: ref.url,
    type: ref.type,  // Veo client will map 'character' to 'asset' referenceType
  }))
}

/**
 * Creates a reference summary for logging/debugging
 */
export function summarizeReferences(result: BuildReferenceResult): string {
  const charCount = result.referenceImages.filter(r => r.type === 'character').length
  const styleCount = result.referenceImages.filter(r => r.type === 'style').length
  
  let summary = `References: ${charCount} character, ${styleCount} style`
  
  if (result.sceneImageForI2V) {
    summary += ', scene image available for I2V'
  }
  
  if (result.warnings.length > 0) {
    summary += ` (${result.warnings.length} warnings)`
  }
  
  return summary
}
