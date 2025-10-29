/**
 * Clean, simple prompt builder for Imagen 3 with Base64 character references
 * Focuses ONLY on visual scene description + character reference
 */

import { artStylePresets } from '@/constants/artStylePresets'

interface OptimizePromptParams {
  sceneAction: string
  visualDescription: string
  artStyle?: string          // NEW: User's art style selection
  customPrompt?: string      // NEW: User-crafted prompt
  characterReferences?: Array<{
    referenceId: number
    name: string
    description: string
  }>
}

/**
 * Build clean Imagen prompt from scene description
 * Removes ALL audio/non-visual noise and constructs simple, focused prompt
 */
export function optimizePromptForImagen(params: OptimizePromptParams): string {
  const hasReferences = params.characterReferences && params.characterReferences.length > 0
  
  // Get art style
  const selectedStyle = artStylePresets.find(s => s.id === params.artStyle) || 
    artStylePresets.find(s => s.id === 'photorealistic')!
  const visualStyle = selectedStyle.promptSuffix
  
  // Clean the scene action
  let cleanedAction = cleanSceneForVisuals(params.sceneAction, params.visualDescription)
  
  console.log('[Prompt Optimizer] Using art style:', params.artStyle || 'photorealistic')
  console.log('[Prompt Optimizer] Cleaned scene action:', cleanedAction.substring(0, 100))
  
  if (hasReferences) {
    // REFERENCE MODE: Focus on scene composition, explicitly link character to reference
    const characterNames = params.characterReferences!.map(ref => ref.name).join(', ')
    const prompt = `Scene: ${cleanedAction}
    
The character ${characterNames} should exactly match the provided reference image in facial features, ethnicity, and physical appearance.

${visualStyle}`
    
    console.log('[Prompt Optimizer] Using REFERENCE MODE with', params.characterReferences!.length, 'character(s)')
    console.log('[Prompt Optimizer] ===== FULL PROMPT =====')
    console.log(prompt)
    console.log('[Prompt Optimizer] ===== END FULL PROMPT =====')
    return prompt.trim()
  } else {
    // TEXT-ONLY MODE: Include character descriptions in prompt
    // Build integrated character descriptions
    const integratedPrompt = integrateCharactersIntoScene(
      cleanedAction, 
      params.characterReferences || []
    )
    
    const prompt = `${integratedPrompt}

${visualStyle}`

    console.log('[Prompt Optimizer] Built naturally integrated prompt with', params.characterReferences?.length || 0, 'characters')
    console.log('[Prompt Optimizer] ===== FULL PROMPT =====')
    console.log(prompt)
    console.log('[Prompt Optimizer] ===== END FULL PROMPT =====')
    return prompt.trim()
  }
}

/**
 * Integrate character descriptions naturally into scene context
 * Instead of separate sections, weave character details where they're mentioned
 */
function integrateCharactersIntoScene(
  sceneAction: string,
  characterReferences: Array<{ referenceId: number; name: string; description: string }>
): string {
  let integrated = sceneAction
  
  // For each character, find their first mention and inject their description
  characterReferences.forEach(ref => {
    // Match character name (case insensitive, word boundary)
    const namePattern = new RegExp(`\\b(${ref.name})\\b`, 'i')
    const match = integrated.match(namePattern)
    
    if (match) {
      // Found character mention - inject description right after
      const characterWithDescription = `${match[1]} (${ref.description})`
      integrated = integrated.replace(namePattern, characterWithDescription)
    } else {
      // Character not explicitly mentioned in scene - add them at the start
      const characterIntro = `${ref.name} (${ref.description}) is present. `
      integrated = characterIntro + integrated
    }
  })
  
  return integrated
}

/**
 * Aggressively clean scene description to ONLY visual elements
 */
function cleanSceneForVisuals(action: string, visualDesc: string): string {
  let cleaned = action || visualDesc || ''
  
  // Remove everything after SFX: or Music: markers (including the markers)
  cleaned = cleaned.split(/\n\n(?:SFX|Music):/)[0]
  
  // Remove ALL sound-related content
  cleaned = cleaned.replace(/SOUND\s+of[^.!?]*[.!?]/gi, '')
  cleaned = cleaned.replace(/\b(hears?|listens?\s+to|sounds?\s+like)[^.!?]*[.!?]/gi, '')
  
  // Remove specific audio descriptions
  const audioTerms = [
    'keyboard clicking',
    'office chatter', 
    'fluorescent lights? hum(?:s|ming|relentlessly)?',
    'distant \\w+ chatter',
    'incessant \\w+'
  ]
  
  audioTerms.forEach(term => {
    const regex = new RegExp(term, 'gi')
    cleaned = cleaned.replace(regex, '')
  })
  
  // Remove character annotations but preserve the name
  // "BRIAN ANDERSON SR (50s, sharp but weary)" → "Brian Anderson Sr"
  cleaned = cleaned.replace(/([A-Z][A-Z\s]+)\s*\([^)]+\)/g, (match, name) => {
    // Convert to title case: "BRIAN ANDERSON SR" → "Brian Anderson Sr"
    return name.toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase())
  })
  
  // Remove age descriptors from character mentions
  // "BRIAN ANDERSON SR., mid-sixties, sits" → "Brian Anderson Sr. sits"
  cleaned = cleaned.replace(/,\s*(mid-|late\s+|early\s+)?(sixties|fifties|forties|thirties|twenties|\d{2}s?),/gi, ',')
  
  // Clean up punctuation and whitespace
  cleaned = cleaned.replace(/\s*,\s*,/g, ',')        // Remove double commas
  cleaned = cleaned.replace(/\s{2,}/g, ' ')          // Normalize spaces
  cleaned = cleaned.replace(/^\s*[,.\s]+/g, '')      // Remove leading punctuation
  cleaned = cleaned.replace(/[,.\s]+$/g, '.')        // Clean trailing, ensure period
  
  // If visual description exists and is different, prepend it
  if (visualDesc && visualDesc !== action) {
    const cleanVisual = visualDesc
      .replace(/SOUND\s+of[^.!?]*[.!?]/gi, '')
      .trim()
    
    if (cleanVisual) {
      cleaned = `${cleanVisual}. ${cleaned}`.trim()
    }
  }
  
  console.log('[Prompt Optimizer] Original length:', action?.length || 0)
  console.log('[Prompt Optimizer] Cleaned length:', cleaned.length)
  console.log('[Prompt Optimizer] Removed', (action?.length || 0) - cleaned.length, 'characters of noise')
  
  return cleaned.trim()
}
