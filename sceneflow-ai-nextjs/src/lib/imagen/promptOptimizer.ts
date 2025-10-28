/**
 * Clean, simple prompt builder for Imagen 3 with Base64 character references
 * Focuses ONLY on visual scene description + character reference
 */

interface OptimizePromptParams {
  sceneAction: string
  visualDescription: string
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
  // Clean the scene action - remove ALL audio and non-visual elements
  let cleanedAction = cleanSceneForVisuals(params.sceneAction, params.visualDescription)
  
  console.log('[Prompt Optimizer] Cleaned scene action:', cleanedAction.substring(0, 100))
  
  // If character references exist, build optimized prompt
  if (params.characterReferences && params.characterReferences.length > 0) {
    // Extract expression hints from scene description if present
    const expressionMatch = cleanedAction.match(/\b(weary|tired|happy|sad|angry|concerned|determined|hopeful|worried)\s+face\b/i)
    const expressionHint = expressionMatch ? `, expression (${expressionMatch[1].toLowerCase()})` : ''
    
    // Build character reference WITHOUT redundant facial descriptions
    const characterReferences = params.characterReferences
      .map(ref => `[${ref.referenceId}] ${ref.name}`)
      .join(', ')
    
    // Build CRITICAL directive as first instruction
    const criticalDirective = `CRITICAL: Replicate the person in reference image [${params.characterReferences[0].referenceId}] exactly. Match facial features, age${expressionHint}, and all distinctive characteristics with absolute precision. Do not deviate from the reference image for character appearance.`
    
    // Segment the scene if it contains transitions (then, followed by, etc.)
    let segmentedScene = cleanedAction
    if (cleanedAction.includes('then') || cleanedAction.includes('followed by')) {
      // Split into numbered segments
      const segments = cleanedAction
        .split(/,?\s+then\s+|,?\s+followed by\s+/)
        .map((seg, idx) => `${idx + 1}. ${seg.trim()}`)
        .join('\n')
      segmentedScene = segments
    }
    
    const prompt = `${characterReferences}
${criticalDirective}

Scene:
${segmentedScene}

Style: Photorealistic, cinematic lighting, 8K resolution, sharp focus, professional photography, realistic human proportions, natural adult appearance.`

    console.log('[Prompt Optimizer] Built optimized prompt with', params.characterReferences.length, 'character references')
    console.log('[Prompt Optimizer] - Removed redundant facial descriptions')
    console.log('[Prompt Optimizer] - Front-loaded CRITICAL directive')
    console.log('[Prompt Optimizer] - Segmented scene:', segmentedScene.includes('\n') ? 'yes' : 'no')
    console.log('[Prompt Optimizer] ===== FULL PROMPT =====')
    console.log(prompt)
    console.log('[Prompt Optimizer] ===== END FULL PROMPT =====')
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
  
  // Remove character annotations but preserve the name
  // "BRIAN ANDERSON SR (50s, sharp but weary)" → "Brian Anderson Sr"
  cleaned = cleaned.replace(/([A-Z][A-Z\s]+)\s*\([^)]+\)/g, (match, name) => {
    // Convert to title case: "BRIAN ANDERSON SR" → "Brian Anderson Sr"
    return name.toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase())
  })
  
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
