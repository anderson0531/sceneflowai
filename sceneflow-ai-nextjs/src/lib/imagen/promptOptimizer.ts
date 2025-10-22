/**
 * Clean, simple prompt builder for Imagen 3 with Base64 character references
 * Focuses ONLY on visual scene description + character reference
 */

interface OptimizePromptParams {
  sceneAction: string
  visualDescription: string
  characterReference?: {
    referenceId: number
    description: string
  }
}

/**
 * Build clean Imagen prompt from scene description
 * Removes ALL audio/non-visual noise and constructs simple, focused prompt
 */
export function optimizePromptForImagen(params: OptimizePromptParams): string {
  // Clean the scene action - remove ALL audio and non-visual elements
  const cleanedAction = cleanSceneForVisuals(params.sceneAction, params.visualDescription)
  
  console.log('[Prompt Optimizer] Cleaned scene action:', cleanedAction.substring(0, 100))
  
  // If character reference exists, tag character name in prompt with [referenceId]
  if (params.characterReference) {
    // Add [referenceId] tag inline with the character description
    // This tells Imagen which person in the scene should match the reference
    const prompt = `${cleanedAction}

Featuring character [${params.characterReference.referenceId}]: ${params.characterReference.description}

Style: Photorealistic, cinematic lighting, 8K resolution, sharp focus, professional photography, realistic human proportions.`

    console.log('[Prompt Optimizer] Built prompt with character reference [' + params.characterReference.referenceId + ']')
    return prompt.trim()
  }
  
  // No character reference - simple scene description
  return `${cleanedAction}

Style: Photorealistic, cinematic lighting, 8K resolution, sharp focus, professional photography.`.trim()
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
  
  // Remove character name annotations: "BRIAN ANDERSON SR (50s, sharp but weary)" → simple description
  cleaned = cleaned.replace(/[A-Z][A-Z\s]+\([^)]+\)/g, 'Character')
  
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
