/**
 * Clean, simple prompt builder for Imagen 3 with Base64 character references
 * Focuses ONLY on visual scene description + character reference
 * 
 * CRITICAL: Strips all video-specific instructions (camera movements, dolly/pan/tilt,
 * multi-focal-length specs) that confuse static image generation models.
 * Scene Direction data contains cinematography instructions for video production,
 * but image models need a single frozen moment description.
 */

import { artStylePresets } from '@/constants/artStylePresets'

/**
 * Extract demographic anchor (ethnicity + age + key features) from appearance description.
 * This is used for the "Hybrid Anchor" strategy when reference images are present.
 * We anchor the demographic to prevent context bias, but let the image define features.
 * 
 * CRITICAL: This function now also extracts KEY PHYSICAL FEATURES (hair color, facial hair)
 * that must be included in subjectDescription for Vertex AI Imagen to preserve them.
 * Per Google docs: subjectDescription should be like "a man with short hair" - including
 * distinctive features that identify the person.
 * 
 * @param appearanceDescription - Full appearance description from character
 * @returns Concise description like "a Black man in his late 40s with salt-and-pepper hair and beard"
 */
export function extractDemographicAnchor(appearanceDescription: string): string | null {
  if (!appearanceDescription) return null
  
  const desc = appearanceDescription.toLowerCase()
  
  // Extract ethnicity/race
  let ethnicity = ''
  const ethnicityPatterns = [
    { pattern: /\b(black|african[- ]?american)\b/i, value: 'Black' },
    { pattern: /\b(white|caucasian|european)\b/i, value: 'White' },
    { pattern: /\b(asian|east[- ]?asian|chinese|japanese|korean)\b/i, value: 'Asian' },
    { pattern: /\b(hispanic|latino|latina|latinx)\b/i, value: 'Hispanic' },
    { pattern: /\b(indian|south[- ]?asian)\b/i, value: 'South Asian' },
    { pattern: /\b(middle[- ]?eastern|arab)\b/i, value: 'Middle Eastern' },
  ]
  
  for (const { pattern, value } of ethnicityPatterns) {
    if (pattern.test(desc)) {
      ethnicity = value
      break
    }
  }
  
  // Extract gender
  let gender = ''
  if (/\b(woman|female)\b/i.test(desc)) gender = 'woman'
  else if (/\b(man|male)\b/i.test(desc)) gender = 'man'
  
  // Extract age
  let age = ''
  const ageMatch = desc.match(/\b(late|early|mid)?[- ]?(20s|30s|40s|50s|60s|70s)\b/i)
  if (ageMatch) {
    const qualifier = ageMatch[1] ? `${ageMatch[1]} ` : ''
    age = `in ${gender === 'woman' ? 'her' : 'his'} ${qualifier}${ageMatch[2]}`
  }
  
  // Extract distinctive hair characteristics
  // These are important visual features that help maintain character consistency
  let hairFeatures = ''
  const hairPatterns = [
    { pattern: /salt[- ]?and[- ]?pepper\s+(hair|beard)/i, value: 'salt-and-pepper hair' },
    { pattern: /grey|gray\s+(hair|beard)/i, value: 'grey hair' },
    { pattern: /bald|shaved head/i, value: 'bald' },
    { pattern: /long\s+(blonde|blond|brown|black|red)\s+hair/i, value: (m: RegExpMatchArray) => `long ${m[1]} hair` },
    { pattern: /short\s+(blonde|blond|brown|black|red)\s+hair/i, value: (m: RegExpMatchArray) => `short ${m[1]} hair` },
    { pattern: /curly\s+(blonde|blond|brown|black|red|grey|gray)?\s*hair/i, value: (m: RegExpMatchArray) => m[1] ? `curly ${m[1]} hair` : 'curly hair' },
    { pattern: /\b(beard|goatee|mustache)\b/i, value: (m: RegExpMatchArray) => m[1].toLowerCase() },
  ]
  
  // Check for salt-and-pepper specifically (distinctive aging feature)
  if (/salt[- ]?and[- ]?pepper/i.test(desc)) {
    hairFeatures = 'with salt-and-pepper hair'
    // Also check for beard
    if (/beard/i.test(desc)) {
      hairFeatures = 'with salt-and-pepper hair and beard'
    }
  } else if (/grey|gray/i.test(desc) && /hair/i.test(desc)) {
    hairFeatures = 'with grey hair'
  } else if (/bald|shaved head/i.test(desc)) {
    hairFeatures = 'who is bald'
  }
  
  // Build demographic anchor with hair features
  if (ethnicity && gender) {
    return `a ${ethnicity} ${gender}${age ? ' ' + age : ''}${hairFeatures ? ' ' + hairFeatures : ''}`
  }
  return null
}

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
    defaultWardrobe?: string    // Character's standard outfit (e.g., "tailored navy suit")
    wardrobeAccessories?: string // Character's accessories (e.g., "gold watch, leather briefcase")
    appearanceDescription?: string // AI-generated physical appearance (race, age, hair, skin tone)
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
 * Build a structured wardrobe prefix for a character
 * This creates a front-loaded wardrobe description that helps the model prioritize clothing
 * 
 * Format: "CHARACTER_NAME wears WARDROBE with ACCESSORIES"
 * This prefix should appear BEFORE scene action to establish the wardrobe first
 * 
 * @param name - Character name
 * @param defaultWardrobe - Standard outfit (e.g., "tailored navy suit")
 * @param wardrobeAccessories - Accessories (e.g., "gold watch, leather briefcase")
 * @returns Wardrobe prefix string or empty string if no wardrobe defined
 */
export function buildWardrobePrefix(
  name: string,
  defaultWardrobe?: string,
  wardrobeAccessories?: string
): string {
  if (!defaultWardrobe && !wardrobeAccessories) {
    return ''
  }
  
  let prefix = name
  
  if (defaultWardrobe) {
    prefix += ` wears ${defaultWardrobe}`
    if (wardrobeAccessories) {
      prefix += `, with ${wardrobeAccessories}`
    }
  } else if (wardrobeAccessories) {
    prefix += ` has ${wardrobeAccessories}`
  }
  
  return prefix
}

/**
 * Build wardrobe-specific negative prompt terms
 * Helps prevent "wardrobe hallucination" by explicitly excluding conflicting attire
 * 
 * @param defaultWardrobe - The intended wardrobe (e.g., "formal suit")
 * @returns Array of negative prompt terms to exclude
 */
export function buildWardrobeNegatives(defaultWardrobe?: string): string[] {
  if (!defaultWardrobe) {
    return []
  }
  
  const negatives: string[] = []
  const wardrobeLower = defaultWardrobe.toLowerCase()
  
  // Formal vs casual conflicts
  if (wardrobeLower.includes('suit') || wardrobeLower.includes('formal') || wardrobeLower.includes('tuxedo')) {
    negatives.push('casual clothes', 'jeans', 't-shirt', 'hoodie', 'shorts', 'sneakers', 'sandals')
  }
  
  if (wardrobeLower.includes('casual') || wardrobeLower.includes('jeans') || wardrobeLower.includes('t-shirt')) {
    negatives.push('formal wear', 'suit', 'tuxedo', 'dress shoes', 'tie', 'bow tie')
  }
  
  // Work attire vs casual
  if (wardrobeLower.includes('uniform') || wardrobeLower.includes('scrubs') || wardrobeLower.includes('lab coat')) {
    negatives.push('casual clothes', 'street clothes', 'business suit', 'formal wear')
  }
  
  // Athletic wear
  if (wardrobeLower.includes('athletic') || wardrobeLower.includes('sports') || wardrobeLower.includes('workout')) {
    negatives.push('formal wear', 'suit', 'dress', 'business attire', 'jeans')
  }
  
  // Dress/gown
  if (wardrobeLower.includes('dress') || wardrobeLower.includes('gown') || wardrobeLower.includes('evening')) {
    negatives.push('casual clothes', 'jeans', 'pants', 't-shirt', 'hoodie')
  }
  
  return negatives
}

/**
 * Strip clothing/wardrobe descriptors from character descriptions
 * Used when explicit defaultWardrobe is set to prevent conflicts between
 * clothing mentioned in visionDescription and the intended wardrobe
 * 
 * @param description - Character appearance description (may include clothing)
 * @returns Description with clothing terms removed
 */
export function stripClothingDescriptors(description: string): string {
  const clothingPatterns = [
    // "wearing a blue suit", "wearing jeans"
    /\bwearing\s+[^,.]*/gi,
    // "dressed in formal attire", "dressed in a suit"  
    /\bdressed\s+in\s+[^,.]*/gi,
    // "in a blue dress", "in casual clothes" (but not "in his late 40s")
    /\bin\s+a\s+([\w\s]+)?(suit|dress|shirt|pants|jeans|coat|jacket|uniform|outfit|attire|clothes|clothing|gown|tuxedo|vest|blazer|sweater|hoodie)\b[^,.]*/gi,
    // Specific clothing items that appear standalone
    /\b(wearing|clad in|sporting|donning)\b\s*[^,.]+/gi,
    // "with a watch", "with glasses" when part of wardrobe description
    /,?\s*with\s+(a\s+)?(silver|gold|leather|designer|vintage|modern)?\s*(watch|wristwatch|glasses|sunglasses|hat|cap|scarf|tie|bow tie|necklace|bracelet|ring|earrings?|bag|purse|briefcase)\b/gi,
  ]
  
  let cleaned = description
  clothingPatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '')
  })
  
  // Clean up dangling commas and double spaces
  cleaned = cleaned.replace(/,\s*,/g, ',').replace(/\s{2,}/g, ' ').replace(/,\s*\./g, '.').replace(/^\s*,\s*/g, '').replace(/\s*,\s*$/g, '').trim()
  
  return cleaned
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
    // STRUCTURE (per Gemini best practices):
    // 1. SUBJECT & WARDROBE first (anchor appearance before actions)
    // 2. ENVIRONMENT (setting, props)
    // 3. MOOD & TECH (style, lighting)
    
    const characterRefs = params.characterReferences!
      .filter(ref => ref.referenceId !== undefined)
      .map(ref => {
        const descLower = (ref.description || '').toLowerCase()
        const isFemale = descLower.includes('woman') || descLower.includes('female')
        
        // Use pre-computed linking description OR generate it
        // This MUST match the subjectDescription passed to the Imagen API
        const linkingDescription = ref.linkingDescription || generateLinkingDescription(ref.description)
        
        // Get wardrobe from the full character reference
        const fullRef = params.characterReferences!.find(r => r.name === ref.name)
        
        return {
          name: ref.name,
          firstName: ref.name.split(' ')[0],
          refId: ref.referenceId!,
          isFemale,
          linkingDescription, // e.g., "person [1]" or "a young man with curly hair"
          defaultWardrobe: fullRef?.defaultWardrobe,
          wardrobeAccessories: fullRef?.wardrobeAccessories,
          appearanceDescription: fullRef?.appearanceDescription
        }
      })
    
    // PHASE 1: Build SUBJECT & WARDROBE section (placed FIRST)
    // REFERENCE-FIRST STRATEGY:
    // - With reference image: Use ONLY "person [1]" - let the image define ALL visual identity
    // - Without reference image: Full text description defines identity
    // 
    // IMPORTANT: Adding text descriptions alongside reference tokens creates conflict.
    // The model tries to satisfy BOTH the text AND the image, which "smooths over"
    // the unique features of the reference image. Pure token binding is more accurate.
    const subjectWardrobeDescriptions: string[] = []
    characterRefs.forEach(ref => {
      if (ref.defaultWardrobe) {
        // Check if this character has a reference image (indicated by [N] pattern in linkingDescription)
        const hasReferenceImage = ref.linkingDescription?.includes('[') && ref.linkingDescription?.includes(']')
        
        let subjectClause = ref.linkingDescription
        
        if (hasReferenceImage) {
          // REFERENCE-FIRST: Use ONLY the token binding, no text description
          // The reference image should be the sole source of visual identity
          subjectClause = ref.linkingDescription // e.g., just "person [1]"
          console.log(`[Prompt Optimizer] Reference-first for ${ref.name}: using pure token "${ref.linkingDescription}" (no text anchor)`)
        } else if (ref.appearanceDescription) {
          // No reference image: use full text description
          const sentences = ref.appearanceDescription.split(/[.!?]+/).filter(s => s.trim())
          const conciseAppearance = sentences.slice(0, 2).join('. ').trim()
          if (conciseAppearance) {
            subjectClause = `${ref.linkingDescription}, ${conciseAppearance}`
            console.log(`[Prompt Optimizer] No reference image for ${ref.name}, using text description: "${conciseAppearance.substring(0, 60)}..."`)
          }
        }
        
        let wardrobeDesc = `${subjectClause}, wearing ${ref.defaultWardrobe}`
        if (ref.wardrobeAccessories) {
          wardrobeDesc += ` with ${ref.wardrobeAccessories}`
        }
        subjectWardrobeDescriptions.push(wardrobeDesc)
      }
    })
    
    // PHASE 2: Strip dialogue/quotes from scene (prevents text rendering on image)
    let promptScene = cleanedAction
    // Remove quoted dialogue that might render as text
    promptScene = promptScene.replace(/"[^"]*"/g, '')
    promptScene = promptScene.replace(/'[^']*'/g, '')
    // Remove dialogue attributions like "says", "said", "exclaims"
    promptScene = promptScene.replace(/\b(says?|said|exclaims?|asks?|replies?|responds?|whispers?|shouts?)\b/gi, '')
    // Clean up double spaces
    promptScene = promptScene.replace(/\s+/g, ' ').trim()
    
    // PHASE 3: Replace character names with linking descriptions
    characterRefs.forEach(ref => {
      const fullNamePattern = new RegExp(`\\b${ref.name}\\b`, 'gi')
      promptScene = promptScene.replace(fullNamePattern, ref.linkingDescription)
      
      // Also replace first names only
      const firstNamePattern = new RegExp(`\\b${ref.firstName}\\b`, 'gi')
      const replacement = ref.linkingDescription.includes('[') 
        ? ref.linkingDescription 
        : (ref.isFemale ? 'the woman' : 'the man')
      promptScene = promptScene.replace(firstNamePattern, replacement)
    })
    
    // PHASE 4: Assemble final prompt using Google's recommended template
    // Google's docs recommend: "Create an image about SUBJECT [1] to match the description: a portrait of SUBJECT [1] ${PROMPT}"
    // This structure helps the model better link the reference image to the character in the scene
    let prompt = ''
    
    // Build the subject introductions for Google's template
    // e.g., "a Black man in his late 40s with salt-and-pepper hair and beard [1]"
    const subjectIntroductions = characterRefs.map(ref => ref.linkingDescription).join(' and ')
    
    // Use Google's recommended template structure for subject customization
    prompt += `Create an image about ${subjectIntroductions} to match the description: `
    
    // Add explicit instruction to avoid UI overlays but allow in-world signage
    prompt += 'Cinematic frame without dialogue captions, subtitles, or UI overlays. In-world signage and text visible in the scene environment is acceptable. '
    
    // Add wardrobe section FIRST if we have wardrobe info
    if (subjectWardrobeDescriptions.length > 0) {
      prompt += `Subject & Wardrobe: ${subjectWardrobeDescriptions.join('; ')}. `
    }
    
    // Add scene/environment
    prompt += promptScene
    
    // Add visual style
    prompt += ` ${visualStyle}`
    
    // Add final reminder - specific about what to avoid
    prompt += ' No dialogue captions, no subtitles, no watermarks.'
    
    console.log('[Prompt Optimizer] Using TEXT-MATCHING LINK MODE with', characterRefs.length, 'reference(s)')
    console.log('[Prompt Optimizer] Linking descriptions (must match subjectDescription):')
    characterRefs.forEach(r => {
      console.log(`  - ${r.name} -> "${r.linkingDescription}" | Wardrobe: ${r.defaultWardrobe || 'none'}`)
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
    
    const prompt = `Cinematic frame without dialogue captions, subtitles, or UI overlays. In-world signage and text visible in the scene environment is acceptable. ${integratedPrompt}

${visualStyle} No dialogue captions, no subtitles, no watermarks.`

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
    const prompt = `Cinematic frame without dialogue captions, subtitles, or UI overlays. In-world signage and text visible in the scene environment is acceptable. ${cleanedAction}

${visualStyle} No dialogue captions, no subtitles, no watermarks.`

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
 * Uses NARRATIVE PROSE for better wardrobe consistency (per Gemini best practices):
 * 
 * "A narrative, descriptive paragraph will almost always produce a better, 
 * more coherent image than a list of disconnected words."
 * 
 * Key techniques:
 * 1. Wardrobe as physical attribute: "a tall man in a navy suit" not "tall man, wearing suit"
 * 2. Reinforce wardrobe in action: "his suit jacket crisp, he enters..."
 * 3. Natural prose flow, no structured labels like WARDROBE:/SCENE:
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
    defaultWardrobe?: string;
    wardrobeAccessories?: string;
  }>
): string {
  const isMultiCharacter = characterReferences.length > 1
  
  // Build character introductions with wardrobe integrated as physical attribute
  const characterIntros: string[] = []
  
  characterReferences.forEach(ref => {
    // Build integrated description: wardrobe as part of appearance, not separate
    let fullDescription = ''
    
    // Start with ethnicity if available (for multi-character differentiation)
    if (isMultiCharacter && ref.ethnicity) {
      fullDescription += `${ref.ethnicity} `
    }
    
    // Core physical description - strip any clothing if explicit wardrobe is set
    // This prevents conflicts like "wearing blue suit" (from visionDescription) 
    // conflicting with "dressed in jeans and t-shirt" (from defaultWardrobe)
    let cleanedDescription = ref.description
    if (ref.defaultWardrobe) {
      cleanedDescription = stripClothingDescriptors(ref.description)
    }
    fullDescription += cleanedDescription
    
    // Add key features for multi-character scenes
    if (isMultiCharacter && ref.keyFeatures && ref.keyFeatures.length > 0) {
      fullDescription += ` with ${ref.keyFeatures.join(' and ')}`
    }
    
    // INTEGRATE wardrobe as physical attribute (not "wearing X" but "in X")
    // This makes clothing feel like part of the character, not an afterthought
    if (ref.defaultWardrobe) {
      // Use "dressed in" or "in" for natural flow
      fullDescription += `, dressed in ${ref.defaultWardrobe}`
      if (ref.wardrobeAccessories) {
        fullDescription += ` with ${ref.wardrobeAccessories}`
      }
    }
    
    characterIntros.push(`${ref.name} is ${fullDescription}`)
  })
  
  // Process scene action: strip dialogue and replace character names
  let processedScene = sceneAction
  
  // Strip dialogue/quotes that might render as text on image
  processedScene = processedScene.replace(/"[^"]*"/g, '')
  processedScene = processedScene.replace(/'[^']*'/g, '')
  // Remove dialogue attributions
  processedScene = processedScene.replace(/\b(says?|said|exclaims?|asks?|replies?|responds?|whispers?|shouts?)\b/gi, '')
  // Clean up double spaces
  processedScene = processedScene.replace(/\s+/g, ' ').trim()
  
  // Replace character names with wardrobe-reinforced descriptions
  characterReferences.forEach(ref => {
    const namePattern = new RegExp(`\\b(${ref.name})\\b`, 'gi')
    
    // Build a SHORT inline reinforcement that mentions wardrobe in action
    // e.g., "Alex" -> "Alex, his navy suit immaculate,"
    if (ref.defaultWardrobe) {
      // Extract the key wardrobe item for brief reinforcement
      const wardrobeShort = ref.defaultWardrobe.split(',')[0].trim() // Take first item
      const pronoun = ref.description.toLowerCase().includes('woman') ? 'her' : 'his'
      
      // Only replace FIRST occurrence to avoid repetition
      const firstMatch = processedScene.match(namePattern)
      if (firstMatch) {
        processedScene = processedScene.replace(
          namePattern,
          `${firstMatch[0]}, ${pronoun} ${wardrobeShort} impeccable,`
        )
      }
    }
  })
  
  // ASSEMBLE as natural prose narrative
  let narrative = ''
  
  // Multi-character scene opener
  if (isMultiCharacter) {
    narrative += `In this scene with ${characterReferences.length} people: `
  }
  
  // Character introductions as flowing prose
  if (characterIntros.length > 0) {
    narrative += characterIntros.join('. ') + '. '
  }
  
  // Scene action flows naturally after character establishment
  narrative += processedScene
  
  return narrative
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
  
  // Remove formatted camera movements from Scene Direction (e.g., "Slow, creeping Dolly In on Kaelen", "Static stability on Alex")
  cleaned = cleaned.replace(/\b(slow|fast|quick|creeping|smooth|steady|rapid|gentle)?,?\s*(dolly\s+(?:in|out)|pan\s+(?:left|right)|tilt\s+(?:up|down)|zoom\s+(?:in|out)|track\s+(?:forward|back)|crane\s+(?:up|down))\s+(on|to|toward|at|across|over|around)?\s+[^,;\.]+/gi, '')
  cleaned = cleaned.replace(/\b(static|handheld|steadicam|gimbal)\s+(stability|shot|movement|tracking)\s+(on|of|at)\s+[^,;\.]+/gi, '')
  
  // Remove movement speed descriptors (commonly used in video direction)
  cleaned = cleaned.replace(/\b(slow|quick|rapid)\s+(movement|motion|tracking)\b/gi, '')
  
  // Remove complex lens/focal length specifications meant for video coverage (multiple shots)
  // E.g., "35mm for studio geography, 85mm for isolating character emotions"
  cleaned = cleaned.replace(/\b\d+mm\s+for\s+[^,;\.]+(?:,\s*\d+mm\s+for\s+[^,;\.]+)*/gi, '')
  
  // Simplify "shot with X set" to just the lens type
  cleaned = cleaned.replace(/\bshot with\s+(anamorphic|spherical|prime|zoom)\s+(prime|lens)?\s*set;?/gi, 'anamorphic lens')
  cleaned = cleaned.replace(/\bshot with\s+(\w+\s+\w+\s+set);?/gi, '')
  
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
  
  // ===== STATIC FRAME CONVERSION =====
  // Convert video/action directions into static image descriptions
  // The model generates text when it sees abstract concepts or sequences
  
  // Remove SEQUENTIAL ACTIONS (video-specific, can't be shown in one frame)
  // "stops mid-stride, listens, then resumes pacing" -> just show the pose
  cleaned = cleaned.replace(/,?\s*then\s+\w+\s+\w+/gi, '') // "then resumes pacing"
  cleaned = cleaned.replace(/,?\s*and\s+then\s+[^,;.]+/gi, '') // "and then walks away"
  cleaned = cleaned.replace(/\b(stops|pauses|listens|turns|resumes|begins|starts|continues)\s+(to\s+)?\w+/gi, '') // action verbs
  
  // Remove ABSTRACT META-DESCRIPTIONS that models can't visualize
  // BUT PRESERVE emotional tone/mood - these ARE important for still images!
  // 
  // REMOVE: "meant to convey", "should feel", "representing", "symbolizing" (meta-commentary)
  // PRESERVE: "conveying tension", "tense atmosphere", "anxious expression" (actual mood)
  
  // Only remove meta-commentary patterns, NOT emotional direction
  cleaned = cleaned.replace(/;\s*the\s+silence\s+should\s+feel\s+\w+/gi, '') // narrative instruction
  cleaned = cleaned.replace(/\b(should\s+feel|meant\s+to\s+convey|representing\s+the|symbolizing\s+the)\s+[^,;.]+/gi, '') // meta-descriptions
  
  // Remove overly abstract compound mood descriptions like "Kinetic anxiety vs. Catatonic dread"
  // These are thematic analysis, not visual direction
  cleaned = cleaned.replace(/\s+vs\.?\s+[^,;.]+/gi, '') // "X vs Y" comparisons
  cleaned = cleaned.replace(/\bKinetic\s+anxiety\b/gi, 'anxious energy') // Convert to visual
  cleaned = cleaned.replace(/\bCatatonic\s+dread\b/gi, 'frozen fear') // Convert to visual
  
  // Remove parenthetical character annotations after mood words: "(Alex)" 
  // But keep the mood word itself
  cleaned = cleaned.replace(/\((?:Alex|Ben|[A-Z][a-z]+)\)/gi, '')
  
  // NOTE: We intentionally KEEP "conveying X" patterns now
  // "conveying tension", "conveying vulnerability" - these help set scene tone
  
  // Remove MULTI-SHOT lens specifications (video coverage, not single frame)
  // "35mm Prime for the room, 100mm Macro for sensory inserts"
  cleaned = cleaned.replace(/\b\d+mm\s+(Prime|Macro|Zoom|Wide|Telephoto)\s+for\s+[^,;.]+/gi, (match, lens) => lens.toLowerCase())
  cleaned = cleaned.replace(/,?\s*\d+mm\s+\w+\s+for\s+[^,;.]+/gi, '') // Remove additional lens specs
  
  // Simplify to single lens mention if multiple
  const lensMatches = cleaned.match(/\b\d+mm\b/g)
  if (lensMatches && lensMatches.length > 1) {
    // Keep only the first lens mention
    let firstLens = true
    cleaned = cleaned.replace(/\b\d+mm\b/g, (match) => {
      if (firstLens) {
        firstLens = false
        return match
      }
      return ''
    })
  }
  
  // Remove ACTION SEQUENCES that imply motion over time
  // "Alex traverses a repetitive linear path" -> "Alex stands behind Ben"
  cleaned = cleaned.replace(/\btraverses\s+a\s+repetitive\s+linear\s+path/gi, 'stands')
  cleaned = cleaned.replace(/\bremains\s+anchored\s+in/gi, 'sits in')
  cleaned = cleaned.replace(/\brubs\s+neck\s+tension\s+while\s+turning/gi, 'rubs neck')
  cleaned = cleaned.replace(/\bstares\s+unblinking\s+at/gi, 'stares at')
  
  // Remove PARENTHETICAL action descriptions
  // "(enhancing the claustrophobia of the walls)" -> just remove
  cleaned = cleaned.replace(/\(enhancing\s+[^)]+\)/gi, '')
  cleaned = cleaned.replace(/\(emphasizing\s+[^)]+\)/gi, '')
  cleaned = cleaned.replace(/\(conveying\s+[^)]+\)/gi, '')
  
  // Remove quoted text that might appear as props but could render
  // "'Anderson & Son' graphic" is OK, but full dialogue is not
  cleaned = cleaned.replace(/"[^"]{20,}"/g, '') // Remove long quoted strings (likely dialogue)
  cleaned = cleaned.replace(/'[^']{20,}'/g, '') // Remove long single-quoted strings
  
  // Specific audio descriptions
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
  // Clean up punctuation artifacts from removed video instructions
  cleaned = cleaned.replace(/[;,]\s*[;,]+/g, ',')    // Remove multiple consecutive semicolons/commas
  cleaned = cleaned.replace(/\s*;\s*/g, ', ')         // Replace semicolons with commas for flow
  cleaned = cleaned.replace(/,\s*,+/g, ',')          // Remove double commas
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
