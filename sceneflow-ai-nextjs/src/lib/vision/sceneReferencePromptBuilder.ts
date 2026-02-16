/**
 * Scene Reference Prompt Builder
 * 
 * Intelligently builds prompts for scene/backdrop reference image generation
 * using scene direction data and matching prop references.
 * 
 * Unlike storyboard frames (which include characters), scene references are
 * "empty" environment shots used for:
 * - Establishing shot references
 * - Location/backdrop consistency
 * - Prop placement visualization
 * - Set design reference
 */

import { DetailedSceneDirection } from '@/types/scene-direction'

export interface PropReference {
  id: string
  name: string
  imageUrl: string
  description?: string
  category?: string
}

export interface SceneReferencePromptResult {
  /** The constructed prompt for image generation */
  prompt: string
  /** Prop references that should be included as reference images */
  matchedPropRefs: PropReference[]
  /** Fields from scene direction that were used */
  usedDirectionFields: string[]
  /** Summary of what's included in the prompt */
  summary: {
    location: string | null
    atmosphere: string | null
    timeOfDay: string | null
    mood: string | null
    propCount: number
  }
}

/**
 * Builds an intelligent prompt for scene reference image generation
 * 
 * @param scene - Scene object with optional sceneDirection
 * @param objectReferences - Available prop references from the library
 * @returns Prompt and matched prop references
 */
export function buildSceneReferencePrompt(
  scene: {
    heading?: string | { text?: string }
    visualDescription?: string
    action?: string
    summary?: string
    sceneDirection?: DetailedSceneDirection
  },
  objectReferences: PropReference[] = []
): SceneReferencePromptResult {
  const usedFields: string[] = []
  const matchedProps: PropReference[] = []
  
  // Extract scene heading for context
  const heading = typeof scene.heading === 'string' 
    ? scene.heading 
    : scene.heading?.text || ''
  
  // Initialize with defaults
  let location = ''
  let atmosphere = ''
  let timeOfDay = ''
  let mood = ''
  let colorTemp = ''
  let keyProps: string[] = []
  
  // Priority 1: Use scene direction if available (most reliable)
  if (scene.sceneDirection) {
    const sd = scene.sceneDirection
    
    // Scene direction fields
    if (sd.scene?.location) {
      location = sd.scene.location
      usedFields.push('scene.location')
    }
    if (sd.scene?.atmosphere) {
      atmosphere = sd.scene.atmosphere
      usedFields.push('scene.atmosphere')
    }
    if (sd.scene?.keyProps && sd.scene.keyProps.length > 0) {
      keyProps = sd.scene.keyProps
      usedFields.push('scene.keyProps')
    }
    
    // Lighting direction fields
    if (sd.lighting?.timeOfDay) {
      timeOfDay = sd.lighting.timeOfDay
      usedFields.push('lighting.timeOfDay')
    }
    if (sd.lighting?.overallMood) {
      mood = sd.lighting.overallMood
      usedFields.push('lighting.overallMood')
    }
    if (sd.lighting?.colorTemperature) {
      colorTemp = sd.lighting.colorTemperature
      usedFields.push('lighting.colorTemperature')
    }
  }
  
  // Priority 2: Fallback to scene text for location context
  if (!location && heading) {
    // Try to extract location from scene heading (e.g., "INT. OFFICE - DAY")
    const headingMatch = heading.match(/(?:INT\.|EXT\.)\s*(.+?)(?:\s*-\s*(?:DAY|NIGHT|MORNING|EVENING|CONTINUOUS))?$/i)
    if (headingMatch) {
      location = headingMatch[1].trim()
      usedFields.push('heading')
    }
  }
  
  // Priority 3: Use visual description for additional context
  const visualContext = scene.visualDescription || scene.action || scene.summary || ''
  
  // Match props from reference library
  if (objectReferences.length > 0) {
    const searchText = `${location} ${atmosphere} ${keyProps.join(' ')} ${visualContext}`.toLowerCase()
    
    for (const propRef of objectReferences) {
      const propName = propRef.name.toLowerCase()
      // Match if prop name appears in any of the scene text
      if (searchText.includes(propName)) {
        matchedProps.push(propRef)
      }
    }
    
    // Also check if any keyProps from scene direction match reference library props
    for (const keyProp of keyProps) {
      const keyPropLower = keyProp.toLowerCase()
      for (const propRef of objectReferences) {
        // Fuzzy match: prop name appears in key prop description or vice versa
        if (
          keyPropLower.includes(propRef.name.toLowerCase()) || 
          propRef.name.toLowerCase().includes(keyPropLower.split(' ')[0])
        ) {
          if (!matchedProps.find(p => p.id === propRef.id)) {
            matchedProps.push(propRef)
          }
        }
      }
    }
  }
  
  // Build the prompt
  const promptParts: string[] = []
  
  // Core location
  if (location) {
    promptParts.push(`Cinematic establishing shot of ${location}`)
  } else {
    promptParts.push('Cinematic interior scene')
  }
  
  // Atmosphere
  if (atmosphere) {
    promptParts.push(atmosphere)
  }
  
  // Lighting/time
  const lightingParts: string[] = []
  if (timeOfDay) lightingParts.push(timeOfDay)
  if (mood) lightingParts.push(`${mood} lighting`)
  if (colorTemp) lightingParts.push(colorTemp)
  
  if (lightingParts.length > 0) {
    promptParts.push(lightingParts.join(', '))
  }
  
  // Key props (limit to top 5 most important)
  if (keyProps.length > 0) {
    const propList = keyProps.slice(0, 5).join(', ')
    promptParts.push(`featuring key props: ${propList}`)
  }
  
  // Technical quality
  promptParts.push('high-end production design, professional cinematography, 8K resolution, film grain')
  
  // CRITICAL: Exclude people/characters for scene references
  promptParts.push('empty scene with no people, no characters, no actors, environment only')
  
  const prompt = promptParts.join('. ')
  
  return {
    prompt,
    matchedPropRefs: matchedProps,
    usedDirectionFields: usedFields,
    summary: {
      location: location || null,
      atmosphere: atmosphere || null,
      timeOfDay: timeOfDay || null,
      mood: mood || null,
      propCount: keyProps.length,
    }
  }
}

/**
 * Checks if a scene has enough direction data for intelligent reference generation
 */
export function hasAdequateSceneDirection(scene: { sceneDirection?: DetailedSceneDirection }): boolean {
  if (!scene.sceneDirection) return false
  
  const sd = scene.sceneDirection
  
  // Require at least location OR atmosphere to be set
  const hasSceneData = !!(sd.scene?.location || sd.scene?.atmosphere)
  
  // Require at least one lighting field
  const hasLightingData = !!(sd.lighting?.timeOfDay || sd.lighting?.overallMood)
  
  return hasSceneData || hasLightingData
}

/**
 * Gets a human-readable summary of what scene direction data is available
 */
export function getSceneDirectionReadiness(scene: { sceneDirection?: DetailedSceneDirection }): {
  isReady: boolean
  hasLocation: boolean
  hasAtmosphere: boolean
  hasLighting: boolean
  hasProps: boolean
  missingFields: string[]
} {
  if (!scene.sceneDirection) {
    return {
      isReady: false,
      hasLocation: false,
      hasAtmosphere: false,
      hasLighting: false,
      hasProps: false,
      missingFields: ['All scene direction data'],
    }
  }
  
  const sd = scene.sceneDirection
  const hasLocation = !!sd.scene?.location
  const hasAtmosphere = !!sd.scene?.atmosphere
  const hasLighting = !!(sd.lighting?.timeOfDay || sd.lighting?.overallMood)
  const hasProps = !!(sd.scene?.keyProps && sd.scene.keyProps.length > 0)
  
  const missingFields: string[] = []
  if (!hasLocation) missingFields.push('Location')
  if (!hasAtmosphere) missingFields.push('Atmosphere')
  if (!hasLighting) missingFields.push('Lighting')
  if (!hasProps) missingFields.push('Key Props')
  
  return {
    isReady: hasLocation || hasAtmosphere || hasLighting,
    hasLocation,
    hasAtmosphere,
    hasLighting,
    hasProps,
    missingFields,
  }
}
