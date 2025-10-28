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
  // Get art style from presets or default to photorealistic
  const selectedStyle = artStylePresets.find(s => s.id === params.artStyle) || 
    artStylePresets.find(s => s.id === 'photorealistic')!
  const visualStyle = selectedStyle.promptSuffix
  
  // Clean the scene action - remove ALL audio and non-visual elements
  let cleanedAction = cleanSceneForVisuals(params.sceneAction, params.visualDescription)
  
  console.log('[Prompt Optimizer] Using art style:', params.artStyle || 'photorealistic')
  console.log('[Prompt Optimizer] Cleaned scene action:', cleanedAction.substring(0, 100))
  
  // If character references exist, tag character names in the scene with [referenceId]
  if (params.characterReferences && params.characterReferences.length > 0) {
    // Tag each character name in the cleaned action with their reference ID
    params.characterReferences.forEach(ref => {
      const namePattern = new RegExp(`\\b${ref.name}\\b`, 'gi')
      cleanedAction = cleanedAction.replace(namePattern, `${ref.name} [${ref.referenceId}]`)
    })
    
    // Build character descriptions (physical only, no emotions)
    const characterDescriptions = params.characterReferences
      .map(ref => `Character [${ref.referenceId}] (${ref.name}): Physical appearance: ${ref.description}.`)
      .join('\n\n')
    
    const prompt = `SCENE COMPOSITION (PRIMARY):
${cleanedAction}

CHARACTERS - Physical Appearance Only:
${characterDescriptions}

Important: Character expressions and emotions should match the scene context above.

VISUAL STYLE: ${visualStyle}`

    console.log('[Prompt Optimizer] Built prompt with', params.characterReferences.length, 'character references')
    console.log('[Prompt Optimizer] Scene composition:', cleanedAction.substring(0, 150))
    console.log('[Prompt Optimizer] Character descriptions:', characterDescriptions.substring(0, 200))
    console.log('[Prompt Optimizer] ===== FULL PROMPT =====')
    console.log(prompt)
    console.log('[Prompt Optimizer] ===== END FULL PROMPT =====')
    return prompt.trim()
  }
  
  // No character reference - simple scene description
  return `${cleanedAction}

VISUAL STYLE: ${visualStyle}`.trim()
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
