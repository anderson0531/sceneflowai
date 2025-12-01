/**
 * Clean, simple prompt builder for Imagen 3 with Base64 character references
 * Focuses ONLY on visual scene description + character reference
 */

import { artStylePresets } from '@/constants/artStylePresets'

interface OptimizePromptParams {
  sceneAction: string
  visualDescription: string
  artStyle?: string          // User's art style selection
  customPrompt?: string      // User-crafted prompt
  characterReferences?: Array<{
    referenceId?: number     // Only set for characters with GCS images
    name: string
    description: string
    gcsUri?: string          // GCS URI for structured array
    imageUrl?: string        // HTTPS URL for prompt text (preferred)
    ethnicity?: string       // For ethnicity injection
    keyFeatures?: string[]   // Key physical characteristics to emphasize
    linkingDescription?: string // Pre-computed linking text for text-matching
  }>
}

/**
 * Generate the LINKING DESCRIPTION for text-matching mode
 * This EXACT text must appear in BOTH:
 *   1. The prompt text (replacing character names)
 *   2. The subjectDescription field in referenceImages array
 * 
 * The model matches these to link reference images to characters in the scene.
 * 
 * @param description - The character's appearance description
 * @returns A short linking phrase like "a young man with curly hair"
 */
export function generateLinkingDescription(description: string): string {
  const descLower = (description || '').toLowerCase()
  const isFemale = descLower.includes('woman') || descLower.includes('female')
  
  // Build the LINKING DESCRIPTION that will appear in BOTH prompt and subjectDescription
  // This must be distinctive enough to identify each character
  const anchors: string[] = []
  
  // Age anchor
  if (descLower.includes('late 50s') || descLower.includes('60s') || descLower.includes('older')) {
    anchors.push('older')
  } else if (descLower.includes('late 20s') || descLower.includes('30s') || descLower.includes('young')) {
    anchors.push('young')
  }
  
  // Hair anchor - more specific for distinctive appearance
  if (descLower.includes('curly afro') || descLower.includes('afro')) {
    anchors.push('with curly afro')
  } else if (descLower.includes('curly')) {
    anchors.push('with curly hair')
  } else if (descLower.includes('salt-and-pepper') && descLower.includes('hair')) {
    anchors.push('with salt-and-pepper hair')
  } else if (descLower.includes('grey hair') || descLower.includes('gray hair')) {
    anchors.push('with grey hair')
  }
  
  // Beard anchor (men only)
  if (!isFemale && descLower.includes('beard')) {
    if (descLower.includes('salt-and-pepper') && descLower.includes('beard')) {
      anchors.push('grey beard')
    } else if (descLower.includes('full beard')) {
      anchors.push('full beard')
    } else {
      anchors.push('beard')
    }
  }
  
  // Build the description
  const gender = isFemale ? 'woman' : 'man'
  
  if (anchors.length === 0) {
    return `a ${gender}`
  } else if (anchors.length === 1) {
    const anchor = anchors[0]
    if (anchor.startsWith('with') || anchor === 'older' || anchor === 'young') {
      return anchor === 'older' ? `an older ${gender}` : anchor === 'young' ? `a young ${gender}` : `a ${gender} ${anchor}`
    }
    return `a ${gender} with ${anchor}`
  } else {
    const ageAnchor = anchors.find(a => ['older', 'young'].includes(a))
    const features = anchors.filter(a => !['older', 'young'].includes(a))
    
    if (ageAnchor) {
      const article = ageAnchor === 'older' ? 'an' : 'a'
      let result = `${article} ${ageAnchor} ${gender}`
      if (features.length > 0) {
        const featureText = features.map(f => f.startsWith('with') ? f.substring(5) : f).join(' and ')
        result += ` with ${featureText}`
      }
      return result
    } else {
      const featureText = features.map(f => f.startsWith('with') ? f.substring(5) : f).join(' and ')
      return `a ${gender} with ${featureText}`
    }
  }
}

/**
 * Detect sanitization changes by comparing original and sanitized text
 * Returns array of change objects with original, sanitized, and reason
 */
export function detectSanitizationChanges(original: string, sanitized: string): Array<{ original: string; sanitized: string; reason: string }> {
  const changes: Array<{ original: string; sanitized: string; reason: string }> = []
  
  if (original === sanitized) return changes
  
  // Pattern: original text → sanitized text
  // Check these in order of specificity (most specific first)
  const patterns = [
    { 
      pattern: /\bframed\s+photo\s+of\s+four\s+young\s+boys(?:,\s*his\s+sons)?\b/gi, 
      expectedSanitized: 'framed photo of four young men',
      reason: 'Child safety filter: "young boys" in framed photo changed to "young men"'
    },
    { 
      pattern: /\bframed\s+photo\s+of\s+(\w+\s+)?boys\b/gi,
      expectedSanitized: (match: string) => match.replace(/\bboys\b/gi, 'young men'),
      reason: 'Child safety filter: "boys" in framed photo changed to "young men"'
    },
    { 
      pattern: /\bfour\s+young\s+boys(?:,\s*his\s+sons)?\b/gi, 
      expectedSanitized: 'four young men',
      reason: 'Child safety filter: "four young boys" changed to "four young men"'
    },
    { 
      pattern: /\byoung\s+boys(?:,\s*his\s+sons)?\b/gi, 
      expectedSanitized: 'young men',
      reason: 'Child safety filter: "young boys" changed to "young men"'
    },
    { 
      pattern: /\bboys,\s*his\s+sons\b/gi,
      expectedSanitized: 'young men, his sons',
      reason: 'Child safety filter: "boys" changed to "young men" (family relationship preserved)'
    },
    { 
      pattern: /\bchildren\b/gi, 
      expectedSanitized: 'adults',
      reason: 'Child safety filter: "children" changed to "adults"'
    },
    { 
      pattern: /\bkids\b/gi, 
      expectedSanitized: 'young adults',
      reason: 'Child safety filter: "kids" changed to "young adults"'
    }
  ]
  
  // Check each pattern against original text
  patterns.forEach(({ pattern, expectedSanitized, reason }) => {
    let regex = new RegExp(pattern.source, pattern.flags)
    let match
    const matches: RegExpMatchArray[] = []
    
    // Find all matches
    while ((match = regex.exec(original)) !== null) {
      matches.push(match)
      // Prevent infinite loops
      if (regex.lastIndex === 0) break
    }
    
    matches.forEach(m => {
      const originalText = m[0]
      // Check if this was actually changed in sanitized text
      const sanitizedVersion = typeof expectedSanitized === 'function' 
        ? expectedSanitized(originalText)
        : expectedSanitized
      
      // Verify the change actually exists in sanitized text
      if (sanitized.includes(sanitizedVersion) && !sanitized.includes(originalText)) {
        if (!changes.some(c => c.original === originalText)) {
          changes.push({
            original: originalText,
            sanitized: sanitizedVersion,
            reason
          })
        }
      }
    })
  })
  
  return changes
}

/**
 * Sanitize child-related terms to avoid triggering Imagen 4 child safety filter (error 58061214)
 * Replaces child-related language with adult equivalents when personGeneration is set to 'allow_adult'
 */
function sanitizeChildTerms(text: string): string {
  let sanitized = text
  
  // Handle framed photos specifically first (most specific patterns)
  sanitized = sanitized.replace(/framed\s+photo\s+of\s+four\s+young\s+boys/gi, 'framed photo of four young men')
  sanitized = sanitized.replace(/framed\s+photo\s+of\s+(\w+\s+)?boys/gi, 'framed photo of $1young men')
  
  // Replace child-related terms with adult equivalents
  // "young boys" → "young men" (handle both standalone and in phrases)
  sanitized = sanitized.replace(/\byoung\s+boys\b/gi, 'young men')
  sanitized = sanitized.replace(/\bfour\s+young\s+boys/gi, 'four young men')
  // "young girls" → "young women"
  sanitized = sanitized.replace(/\byoung\s+girls\b/gi, 'young women')
  // "boys, his sons" → "young men, his sons" (keep family relationship)
  sanitized = sanitized.replace(/\bboys,\s*his\s+sons\b/gi, 'young men, his sons')
  sanitized = sanitized.replace(/\bfour\s+young\s+boys,\s*his\s+sons\b/gi, 'four young men, his sons')
  // "children" → "adults" (when context allows)
  sanitized = sanitized.replace(/\bchildren\b/gi, 'adults')
  // "kids" → "young adults"
  sanitized = sanitized.replace(/\bkids\b/gi, 'young adults')
  
  // Handle standalone "boys" (plural) - but avoid replacing in already processed phrases
  sanitized = sanitized.replace(/\bboys\b(?![\s,]*young)/gi, 'young men')
  
  // Handle standalone "boy" (singular) - but avoid replacing in already processed phrases  
  sanitized = sanitized.replace(/\bboy\b(?![\s,]*young|\s*men)/gi, 'young man')
  
  return sanitized
}

/**
 * Build clean Imagen prompt from scene description
 * Removes ALL audio/non-visual noise and constructs simple, focused prompt
 */
export interface OptimizedPromptResult {
  prompt: string
  sanitizationChanges?: Array<{ original: string; sanitized: string; reason: string }>
  originalPrompt?: string
}

export function optimizePromptForImagen(params: OptimizePromptParams): string;
export function optimizePromptForImagen(params: OptimizePromptParams, returnDetails: boolean): OptimizedPromptResult;
export function optimizePromptForImagen(params: OptimizePromptParams, returnDetails?: boolean): string | OptimizedPromptResult {
  // Get art style
  const selectedStyle = artStylePresets.find(s => s.id === params.artStyle) || 
    artStylePresets.find(s => s.id === 'photorealistic')!
  const visualStyle = selectedStyle.promptSuffix
  
  // Clean the scene action
  let cleanedAction = cleanSceneForVisuals(params.sceneAction, params.visualDescription)
  
  // Track sanitization changes if details requested
  let sanitizationChanges: Array<{ original: string; sanitized: string; reason: string }> | undefined
  const originalCleaned = cleanedAction
  
  // Sanitize child-related terms to avoid triggering safety filters
  cleanedAction = sanitizeChildTerms(cleanedAction)
  
  // Detect changes if details requested
  if (returnDetails) {
    sanitizationChanges = detectSanitizationChanges(originalCleaned, cleanedAction)
  }
  
  console.log('[Prompt Optimizer] Using art style:', params.artStyle || 'photorealistic')
  console.log('[Prompt Optimizer] Cleaned scene action:', cleanedAction.substring(0, 100))
  
  // Check if we have characters with actual reference images (valid referenceId)
  const charactersWithRefs = params.characterReferences?.filter(ref => ref.referenceId !== undefined) || []
  const hasValidReferences = charactersWithRefs.length > 0
  
  if (hasValidReferences) {
    // TEXT-MATCHING LINK MODE: subject_description text must appear in prompt
    // This is how the model links reference images to characters in the scene
    // 
    // Example:
    //   prompt: "a young man with curly hair sits at the table..."
    //   subject_description: "a young man with curly hair"  <- MUST MATCH
    //
    // The model sees matching text and knows: "use this reference image for this person"
    
    const characterRefs = params.characterReferences!
      .filter(ref => ref.referenceId !== undefined)
      .map(ref => {
        const descLower = (ref.description || '').toLowerCase()
        const isFemale = descLower.includes('woman') || descLower.includes('female')
        
        // Use pre-computed linking description OR generate it
        // This MUST match the subjectDescription passed to the Imagen API
        // IMPORTANT: If linkingDescription is provided (e.g. "person [1]"), use it directly!
        const linkingDescription = ref.linkingDescription || generateLinkingDescription(ref.description)
        
        return {
          name: ref.name,
          firstName: ref.name.split(' ')[0],
          refId: ref.referenceId!,
          isFemale,
          linkingDescription // e.g., "person [1]" or "a young man with curly hair"
        }
      })
    
    // Replace character names with their linking descriptions
    // "Alex Anderson sits..." -> "person [1] sits..."
    let promptScene = cleanedAction
    
    characterRefs.forEach(ref => {
      const fullNamePattern = new RegExp(`\\b${ref.name}\\b`, 'gi')
      promptScene = promptScene.replace(fullNamePattern, ref.linkingDescription)
      
      // Also replace first names only
      const firstNamePattern = new RegExp(`\\b${ref.firstName}\\b`, 'gi')
      
      // If using ID-based linking (e.g. "person [1]"), use that for first name too
      // Otherwise use generic "the man"/"the woman" to avoid repetition of long descriptions
      const replacement = ref.linkingDescription.includes('[') 
        ? ref.linkingDescription 
        : (ref.isFemale ? 'the woman' : 'the man')
        
      promptScene = promptScene.replace(firstNamePattern, replacement)
    })
    
    // Build the final prompt with style
    let prompt = promptScene + ` ${visualStyle}`
    
    console.log('[Prompt Optimizer] Using TEXT-MATCHING LINK MODE with', characterRefs.length, 'reference(s)')
    console.log('[Prompt Optimizer] Linking descriptions (must match subjectDescription):')
    characterRefs.forEach(r => {
      console.log(`  - ${r.name} -> "${r.linkingDescription}"`)
    })
    console.log('[Prompt Optimizer] ===== FULL PROMPT =====')
    console.log(prompt)
    console.log('[Prompt Optimizer] ===== END FULL PROMPT =====')
    
    if (returnDetails) {
      return {
        prompt: prompt.trim(),
        sanitizationChanges,
        originalPrompt: params.sceneAction || params.visualDescription
      }
    }
    return prompt.trim()
  } else if (params.characterReferences && params.characterReferences.length > 0) {
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
    
    if (returnDetails) {
      return {
        prompt: prompt.trim(),
        sanitizationChanges,
        originalPrompt: params.sceneAction || params.visualDescription
      }
    }
    return prompt.trim()
  } else {
    // NO CHARACTERS MODE: Just scene description with style
    const prompt = `${cleanedAction}

${visualStyle}`

    console.log('[Prompt Optimizer] Built scene-only prompt (no characters)')
    console.log('[Prompt Optimizer] ===== FULL PROMPT =====')
    console.log(prompt)
    console.log('[Prompt Optimizer] ===== END FULL PROMPT =====')
    
    if (returnDetails) {
      return {
        prompt: prompt.trim(),
        sanitizationChanges,
        originalPrompt: params.sceneAction || params.visualDescription
      }
    }
    return prompt.trim()
  }
}

/**
 * Integrate character descriptions naturally into scene context
 * Instead of separate sections, weave character details where they're mentioned
 * 
 * For multi-character scenes (no reference images), provides more detailed descriptions
 * to help maintain visual consistency through text alone.
 */
function integrateCharactersIntoScene(
  sceneAction: string,
  characterReferences: Array<{ 
    referenceId?: number; 
    name: string; 
    description: string; 
    gcsUri?: string;
    ethnicity?: string;
    keyFeatures?: string[];
  }>
): string {
  let integrated = sceneAction
  const isMultiCharacter = characterReferences.length > 1
  
  // For each character, find their first mention and inject their description
  characterReferences.forEach(ref => {
    // Build a detailed description for multi-character scenes
    let detailedDescription = ref.description
    
    // For multi-character scenes, add ethnicity and key features if available
    if (isMultiCharacter) {
      const extras: string[] = []
      if (ref.ethnicity) {
        extras.push(ref.ethnicity)
      }
      if (ref.keyFeatures && ref.keyFeatures.length > 0) {
        extras.push(...ref.keyFeatures)
      }
      if (extras.length > 0) {
        detailedDescription = `${extras.join(', ')}, ${detailedDescription}`
      }
    }
    
    // Match character name (case insensitive, word boundary)
    const namePattern = new RegExp(`\\b(${ref.name})\\b`, 'i')
    const match = integrated.match(namePattern)
    
    if (match) {
      // Found character mention - inject description right after
      const characterWithDescription = `${match[1]} (${detailedDescription})`
      integrated = integrated.replace(namePattern, characterWithDescription)
    } else {
      // Character not explicitly mentioned in scene - add them at the start
      const characterIntro = `${ref.name} (${detailedDescription}) is present. `
      integrated = characterIntro + integrated
    }
  })
  
  // For multi-character scenes, add explicit instruction for consistency
  if (isMultiCharacter) {
    integrated = `Multi-character scene with ${characterReferences.length} distinct people. ${integrated}`
  }
  
  return integrated
}

/**
 * Aggressively clean scene description to ONLY visual elements
 * Strips cinematographic directions, sound cues, and keeps only the final visual scene
 */
function cleanSceneForVisuals(action: string, visualDesc: string): string {
  let cleaned = action || visualDesc || ''
  
  // Remove everything after SFX: or Music: markers (including the markers)
  cleaned = cleaned.split(/\n\n(?:SFX|Music):/)[0]
  
  // CINEMATOGRAPHIC CLEANUP - Remove montage/editing directions
  // These confuse image generation as they describe multiple shots, not a single image
  
  // Remove FADE IN/OUT, CUT TO, DISSOLVE TO, etc.
  cleaned = cleaned.replace(/\b(FADE\s+(IN|OUT)\s*(FROM|TO)?\s*(BLACK|WHITE)?[:\.\s]*)/gi, '')
  cleaned = cleaned.replace(/\b(CUT\s+TO\s*:?\s*)/gi, '')
  cleaned = cleaned.replace(/\b(DISSOLVE\s+TO\s*:?\s*)/gi, '')
  cleaned = cleaned.replace(/\b(SMASH\s+CUT\s*:?\s*)/gi, '')
  cleaned = cleaned.replace(/\b(MATCH\s+CUT\s*:?\s*)/gi, '')
  cleaned = cleaned.replace(/\b(JUMP\s+CUT\s*:?\s*)/gi, '')
  
  // Remove CLOSE ON:, WIDE ON:, etc. camera directions
  cleaned = cleaned.replace(/\b(CLOSE\s+ON\s*:?\s*)/gi, '')
  cleaned = cleaned.replace(/\b(WIDE\s+ON\s*:?\s*)/gi, '')
  cleaned = cleaned.replace(/\b(ANGLE\s+ON\s*:?\s*)/gi, '')
  cleaned = cleaned.replace(/\b(PUSH\s+IN\s+ON\s*:?\s*)/gi, '')
  cleaned = cleaned.replace(/\b(PULL\s+BACK\s+TO\s*:?\s*)/gi, '')
  
  // Remove contradictory camera movement descriptions
  // These describe motion which can't be captured in a single still image
  cleaned = cleaned.replace(/\b(slow\s+)?pull[s\-]?\s*back\s+(to\s+)?(reveal\s+)?(a\s+)?/gi, '')
  cleaned = cleaned.replace(/\b(rapid\s+)?succession\s+of\s+(static\s+)?lock[- ]?offs?\b/gi, '')
  cleaned = cleaned.replace(/\bextreme\s+close[- ]?up\b/gi, '')
  cleaned = cleaned.replace(/\bwide\s+two[- ]?shot\b/gi, '')
  cleaned = cleaned.replace(/\b(camera\s+)?(pushes?|pulls?|zooms?|pans?|tilts?|tracks?|dollies?)\s+(in|out|to|toward|away|left|right)?\b/gi, '')
  cleaned = cleaned.replace(/\bflash\s+resolves?,?\s*/gi, '')
  
  // Remove contradictory lighting descriptions - keep only the dominant one
  // If multiple lighting types mentioned, prefer the last/most specific one
  const lightingPatterns = [
    /\bhigh[- ]?contrast,?\s*source[- ]?driven\s+lighting\s*\([^)]+\)\s*/gi,
    /\bharsh\s+sunlight\b/gi,
    /\bsoft,?\s*diffused\s+lighting\b/gi,
  ]
  
  // Count lighting mentions and remove all but keep scene coherent
  let lightingMentions = 0
  lightingPatterns.forEach(pattern => {
    const matches = cleaned.match(pattern)
    if (matches) lightingMentions += matches.length
  })
  
  // If multiple lighting descriptions, simplify to just "diffused lighting" or remove specifics
  if (lightingMentions > 1) {
    lightingPatterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '')
    })
  }
  
  // Remove montage descriptions - keep only the LAST distinct scene
  // Split on "Then," or "Then the" patterns which often signal the main scene after montage
  const thenMatch = cleaned.match(/\bThen,?\s+(the\s+)?(.+)$/is)
  if (thenMatch && thenMatch[2] && thenMatch[2].length > 100) {
    // Use the part after "Then" as it's likely the main scene
    cleaned = thenMatch[2]
  }
  
  // If still very long (> 1000 chars), look for the last major scene description
  if (cleaned.length > 1000) {
    // Find the last paragraph/sentence that describes the actual scene (not montage cuts)
    const paragraphs = cleaned.split(/\n\n+/)
    const lastMeaningful = paragraphs.filter(p => 
      p.length > 50 && 
      !p.match(/^(CUT|CLOSE|WIDE|ANGLE|FADE|DISSOLVE)/i) &&
      p.match(/\b(sits?|stands?|walks?|looks?|faces?|enters?|studio|room|table|chair)/i)
    ).pop()
    
    if (lastMeaningful && lastMeaningful.length > 100) {
      cleaned = lastMeaningful
    }
  }
  
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
  
  // Final length check - if still too long, truncate intelligently
  if (cleaned.length > 800) {
    // Find a good breaking point (end of sentence)
    const truncated = cleaned.substring(0, 800)
    const lastPeriod = truncated.lastIndexOf('.')
    if (lastPeriod > 400) {
      cleaned = truncated.substring(0, lastPeriod + 1)
    } else {
      cleaned = truncated + '...'
    }
    console.log('[Prompt Optimizer] Truncated long prompt to', cleaned.length, 'chars')
  }
  
  console.log('[Prompt Optimizer] Original length:', action?.length || 0)
  console.log('[Prompt Optimizer] Cleaned length:', cleaned.length)
  console.log('[Prompt Optimizer] Removed', (action?.length || 0) - cleaned.length, 'characters of noise')
  
  return cleaned.trim()
}
