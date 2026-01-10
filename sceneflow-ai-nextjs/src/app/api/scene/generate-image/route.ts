import { NextRequest, NextResponse } from 'next/server'
import { generateImageWithGemini } from '@/lib/gemini/imageClient'
import { uploadImageToBlob } from '@/lib/storage/blob'
import { optimizePromptForImagen, generateLinkingDescription } from '@/lib/imagen/promptOptimizer'
import { validateCharacterLikeness } from '@/lib/imagen/imageValidator'
import { waitForGCSURIs, checkGCSURIAccessibility } from '@/lib/storage/gcsAccessibility'
import { generateDirectionHash, generateImageSourceHash } from '@/lib/utils/contentHash'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { CreditService } from '@/services/CreditService'
import { IMAGE_CREDITS } from '@/lib/credits/creditCosts'
import Project from '../../../../models/Project'
import { sequelize } from '../../../../config/database'

export const runtime = 'nodejs'
export const maxDuration = 120  // Increased for new AI image models

/**
 * @deprecated Use generateLinkingDescription from promptOptimizer instead
 * Extract VISUAL ANCHORS from appearance description for Imagen API
 * 
 * The model needs key visual differentiators to "latch onto" the reference image.
 * Too generic ("a man") = model ignores specific features
 * Too specific (conflicting details) = model follows text over image
 * 
 * Goal: 3-6 word description with KEY VISUAL ANCHORS (hair, glasses, beard, age)
 * These anchors tell the model WHICH pixels in the reference image are important.
 */
function createVisualAnchorDescription(char: any, index: number): string {
  const description = char.visionDescription || char.appearanceDescription || ''
  const descLower = description.toLowerCase()
  
  // Detect gender
  const isFemale = descLower.includes('woman') || 
                   descLower.includes('female') ||
                   descLower.includes('she ')
  
  const anchors: string[] = []
  
  // AGE ANCHOR - critical differentiator
  if (descLower.includes('late 50s') || descLower.includes('early 60s') || descLower.includes('60s')) {
    anchors.push('older')
  } else if (descLower.includes('late 40s') || descLower.includes('50s')) {
    anchors.push('middle-aged')
  } else if (descLower.includes('late 20s') || descLower.includes('early 30s') || descLower.includes('30s')) {
    anchors.push('young')
  }
  
  // HAIR ANCHOR - very distinctive
  if (descLower.includes('curly afro') || descLower.includes('afro')) {
    anchors.push('with curly afro')
  } else if (descLower.includes('salt-and-pepper') && descLower.includes('hair')) {
    anchors.push('with salt-and-pepper hair')
  } else if (descLower.includes('bald')) {
    anchors.push('bald')
  } else if (descLower.includes('grey hair') || descLower.includes('gray hair')) {
    anchors.push('with grey hair')
  } else if (descLower.includes('short') && descLower.includes('cropped')) {
    anchors.push('with short cropped hair')
  }
  
  // BEARD ANCHOR - important for men
  if (!isFemale) {
    if (descLower.includes('salt-and-pepper') && descLower.includes('beard')) {
      anchors.push('grey beard')
    } else if (descLower.includes('full beard')) {
      anchors.push('full beard')
    } else if (descLower.includes('beard')) {
      anchors.push('beard')
    }
  }
  
  // GLASSES ANCHOR - very distinctive
  if (descLower.includes('glasses')) {
    anchors.push('glasses')
  }
  
  // Build the description
  const gender = isFemale ? 'woman' : 'man'
  let result: string
  
  if (anchors.length === 0) {
    result = `a ${gender}`
  } else if (anchors.length === 1) {
    // "an older man" or "a man with curly afro"
    const anchor = anchors[0]
    if (anchor.startsWith('with') || anchor === 'bald') {
      result = `a ${gender} ${anchor}`
    } else {
      result = `${anchor.startsWith('o') ? 'an' : 'a'} ${anchor} ${gender}`
    }
  } else {
    // Combine anchors: "an older man with grey beard"
    const ageAnchor = anchors.find(a => ['older', 'middle-aged', 'young'].includes(a))
    const otherAnchors = anchors.filter(a => !['older', 'middle-aged', 'young'].includes(a))
    
    if (ageAnchor) {
      const article = ageAnchor.startsWith('o') ? 'an' : 'a'
      result = `${article} ${ageAnchor} ${gender}`
      if (otherAnchors.length > 0) {
        // Join with "and" for readability
        const features = otherAnchors.map(a => a.startsWith('with') ? a.substring(5) : a).join(' and ')
        result += ` with ${features}`
      }
    } else {
      // No age anchor, just combine features
      const features = otherAnchors.map(a => a.startsWith('with') ? a.substring(5) : a).join(' and ')
      result = `a ${gender} with ${features}`
    }
  }
  
  console.log(`[Scene Image] Visual anchor description for ${char.name} (ref ${index}): "${result}"`)
  return result
}

/**
 * Strip emotional descriptors from character descriptions
 * Keeps only physical characteristics, lets scene drive emotions
 */
function stripEmotionalDescriptors(description: string): string {
  // Remove common emotional/expression terms
  const emotionalTerms = [
    // "friendly smile", "warm expression", "wide smile", etc.
    /\b(friendly|warm|cheerful|happy|sad|worried|confident|stern|serious|welcoming|inviting|wide|bright|broad)\s+(smile|expression|demeanor|look|face|grin)\b/gi,
    // "smiling", "frowning", "grinning", "beaming"
    /\b(smiling|frowning|grinning|beaming)\b/gi,
    // "with a happy expression", "with a smile", "and a wide smile"
    /\b(with|and)\s+a\s+(happy|sad|worried|confident|friendly|stern|serious|warm|cheerful|weary|tired|energetic|excited|wide|bright|broad)?\s*(smile|expression|look|demeanor|face|appearance|frown|grin|smirk)\b/gi,
    // "and a smile", ", a smile"
    /[,\s]+(and\s+)?a\s+(smile|frown|grin|smirk)\b/gi,
    // "appears happy", "looks tired"
    /\b(appears|looks|seems)\s+(happy|sad|worried|confident|tired|energetic|friendly|stern|serious|cheerful)\b/gi,
  ]
  
  let cleaned = description
  emotionalTerms.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '')
  })
  
  // Clean up double spaces and punctuation
  cleaned = cleaned.replace(/\s{2,}/g, ' ').replace(/\s+\./g, '.').trim()
  
  return cleaned
}

/**
 * Strip clothing/wardrobe descriptors from character descriptions
 * Prevents conflicts when explicit wardrobe (defaultWardrobe) is set separately
 * Only applied when character has explicit wardrobe to avoid duplicate/conflicting instructions
 */
function stripClothingDescriptors(description: string): string {
  // Remove common clothing/wardrobe patterns
  const clothingTerms = [
    // "wearing a blue suit" patterns
    /\b(wearing|dressed in|clothed in|clad in)\s+(a\s+)?[^,.]+?(suit|shirt|dress|coat|jacket|pants|jeans|trousers|uniform|outfit|attire|clothes|clothing|t-shirt|tee|sweater|hoodie|blazer|tie|blouse|skirt|shorts|vest|cardigan|polo|button-down|oxford)[^,.]*[,.]?/gi,
    // ", in a blue suit," patterns
    /[,\s]+in\s+(a\s+)?[^,.]+?(suit|shirt|dress|coat|jacket|pants|jeans|trousers|uniform|outfit|attire)[^,.]*[,.]?/gi,
    // "with a tie", "with a watch" - wardrobe accessories (not physical features)
    /\bwith\s+(a\s+)?(tie|bow tie|necklace|bracelet|watch|earrings|ring|scarf|hat|cap|glasses|sunglasses|handbag|purse|briefcase)\b/gi,
    // Standalone clothing references at end of description
    /[,\s]+(casual|formal|business|professional|smart|elegant)\s+(attire|clothes|clothing|wear|outfit|look)[,.]?$/gi,
    // "dressed formally", "dressed casually"
    /\bdressed\s+(formally|casually|professionally|elegantly|smartly)\b/gi,
  ]
  
  let cleaned = description
  clothingTerms.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '')
  })
  
  // Clean up double spaces, dangling commas, and punctuation artifacts
  cleaned = cleaned
    .replace(/,\s*,/g, ',')       // double commas
    .replace(/\s+,/g, ',')        // space before comma
    .replace(/,\s*\./g, '.')      // comma before period
    .replace(/\s{2,}/g, ' ')      // multiple spaces
    .replace(/,\s*$/g, '')        // trailing comma
    .replace(/^\s*,/g, '')        // leading comma
    .trim()
  
  return cleaned
}

export async function POST(req: NextRequest) {
  let userId: string | null = null
  let creditsCharged = 0
  const CREDIT_COST = IMAGE_CREDITS.IMAGEN_3 // 5 credits per image

  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions)
    userId = session?.user?.id || session?.user?.email || null
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      )
    }

    // 2. Pre-check credit balance
    const hasEnoughCredits = await CreditService.ensureCredits(userId, CREDIT_COST)
    if (!hasEnoughCredits) {
      const breakdown = await CreditService.getCreditBreakdown(userId)
      return NextResponse.json({
        success: false,
        error: 'Insufficient credits',
        code: 'INSUFFICIENT_CREDITS',
        required: CREDIT_COST,
        balance: breakdown.total_credits,
        suggestedTopUp: { pack: 'quick_fix', name: 'Quick Fix', price: 25, credits: 2000 }
      }, { status: 402 })
    }

    const body = await req.json()
    const {
      projectId,
      sceneIndex,
      scenePrompt,           // Legacy support
      customPrompt,          // NEW: From prompt builder
      artStyle,              // NEW: User's art style selection
      shotType,              // NEW: Camera framing
      cameraAngle,           // NEW: Camera angle
      lighting,              // NEW: Lighting selection
      characters,            // NEW: From prompt data object
      selectedCharacters = [], // Legacy support - array or extracted from object
      quality = 'auto',
      personGeneration,       // NEW: Optional personGeneration setting (default: 'allow_adult')
      characterWardrobes = [] // NEW: Scene-level wardrobe overrides - array of { characterId, wardrobeId }
    } = body
    
    // Handle both legacy (selectedCharacters) and new (characters) formats
    const characterArray = characters || selectedCharacters || []

    console.log('[Scene Image] Generating scene image')
    console.log('[Scene Image] Selected characters:', characterArray.length)
    console.log('[Scene Image] Raw selectedCharacters:', JSON.stringify(characterArray))

    // Single unified project load for both character and scene data
    let project = null
    let characterObjects = characterArray

    // Filter out null/undefined values immediately
    const beforeFilterCount = characterArray.length
    characterObjects = characterObjects.filter((c: any) => c != null)
    const afterFilterCount = characterObjects.length

    console.log(`[Scene Image] Filtered ${beforeFilterCount - afterFilterCount} null values`)
    console.log('[Scene Image] DEBUG - selectedCharacters type:', characterObjects[0] ? typeof characterObjects[0] : 'empty array')
    console.log('[Scene Image] DEBUG - selectedCharacters[0]:', characterObjects[0] ? JSON.stringify(characterObjects[0]).substring(0, 200) : 'none')
    console.log('[Scene Image] DEBUG - projectId:', projectId)

    if (projectId) {
      await sequelize.authenticate()
      project = await Project.findByPk(projectId, {
        attributes: ['id', 'metadata', 'user_id', 'title', 'status', 'current_step']
      })
      
      if (!project) {
        return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 })
      }

      const allCharacters = project.metadata?.visionPhase?.characters || []
      console.log('[Scene Image] DEBUG - characters in project:', allCharacters.length)
      console.log('[Scene Image] DEBUG - characters from DB:', allCharacters.map((c: any) => ({
        name: c.name,
        hasRefImage: !!c.referenceImage,
        refImagePrefix: c.referenceImage ? c.referenceImage.substring(0, 40) : 'none'
      })))
      
      // ALWAYS load characters from database if we have a projectId
      if (characterObjects.length > 0) {
        // If selectedCharacters are IDs (strings), match them
        if (typeof characterObjects[0] === 'string') {
          characterObjects = characterObjects.map((charId: string) => {
            const byId = allCharacters.find((c: any) => c.id === charId)
            if (byId) return byId
            return allCharacters.find((c: any) => c.name === charId)
          }).filter((c: any) => c != null)
          
          console.log('[Scene Image] Loaded character objects by ID:', characterObjects.length)
        } 
        // If selectedCharacters are already objects, reload them from DB
        else if (typeof characterObjects[0] === 'object') {
          characterObjects = characterObjects.map((char: any) => {
            if (!char) return null
            
            // Try ID match first (if ID exists)
            if (char.id) {
              const byId = allCharacters.find((c: any) => c.id === char.id)
              if (byId) return byId
            }
            
            // Fallback to name match
            if (char.name) {
              const byName = allCharacters.find((c: any) => c.name === char.name)
              if (byName) return byName
            }
            
            return null
          }).filter((c: any) => c != null)
          
          console.log('[Scene Image] Reloaded character objects from DB:', characterObjects.length)
        }
      } else if (projectId && typeof sceneIndex === 'number') {
        // AUTO-DETECT: If no characters provided, try to extract them from the scene
        console.log('[Scene Image] No characterObjects provided, attempting to auto-detect from scene')
        const scenes = project.metadata?.visionPhase?.script?.script?.scenes || []
        const scene = scenes[sceneIndex]
        
        if (scene) {
          // Extract character names from scene (heading, action, dialogue)
          const sceneText = [
            scene.heading || '',
            scene.action || '',
            scene.visualDescription || '',
            ...(scene.dialogue || []).map((d: any) => d.character || '')
          ].join(' ').toLowerCase()
          
          // Match character names from scene text
          const detectedChars = allCharacters.filter((char: any) => {
            if (!char.name) return false
            // Check if character name appears in scene text (case-insensitive)
            const charNameLower = char.name.toLowerCase()
            return sceneText.includes(charNameLower) || 
                   // Also check for partial matches (e.g., "Brian Anderson" matches "Brian")
                   charNameLower.split(' ').some(part => part.length > 2 && sceneText.includes(part))
          })
          
          if (detectedChars.length > 0) {
            characterObjects = detectedChars
            console.log(`[Scene Image] Auto-detected ${detectedChars.length} character(s) from scene:`, 
              detectedChars.map((c: any) => c.name))
          } else {
            console.log('[Scene Image] No characters detected in scene text, proceeding without character references')
          }
        }
      }
      
      // DEBUG: Log character properties and ensure referenceImage is populated
      if (characterObjects.length > 0) {
        console.log('[Scene Image] DEBUG - First character keys:', Object.keys(characterObjects[0]))
        console.log('[Scene Image] DEBUG - Has referenceImage:', !!characterObjects[0].referenceImage)
        
        // Log all characters' reference image status
        characterObjects.forEach((char: any, idx: number) => {
          console.log(`[Scene Image] Character ${idx + 1} (${char.name}):`, {
            hasReferenceImage: !!char.referenceImage,
            referenceImageUrl: char.referenceImage ? char.referenceImage.substring(0, 50) + '...' : 'none'
          })
        })
        
        // Check for characters missing reference images
        const missingImages = characterObjects.filter((c: any) => !c.referenceImage)
        if (missingImages.length > 0) {
          console.warn(`[Scene Image] WARNING: ${missingImages.length} character(s) missing referenceImage:`, 
            missingImages.map((c: any) => c.name))
          console.warn('[Scene Image] These characters will be included in prompt text only (no visual reference)')
        }
      } else if (projectId) {
        // Even if no characterObjects found, log available characters from project
        console.log('[Scene Image] DEBUG - No characterObjects found, but project has', allCharacters.length, 'characters')
        if (allCharacters.length > 0) {
          allCharacters.forEach((char: any, idx: number) => {
            console.log(`[Scene Image] Available character ${idx + 1}:`, {
              name: char.name,
              hasReferenceImage: !!char.referenceImage
            })
          })
        }
      }
    }

    // Filter for valid characters (we don't need reference images anymore)
    characterObjects = characterObjects.filter((c: any) => c != null)
    console.log('[Scene Image] Valid character objects:', characterObjects.length)
    
    // Load scene data (reuse same project variable)
    let fullSceneContext = scenePrompt || ''
    let sceneData: any = null  // Store scene for hash calculation
    let references: any[] = []  // Store references for hash calculation

    if (project && typeof sceneIndex === 'number') {
      const scenes = project.metadata?.visionPhase?.script?.script?.scenes || []
      const scene = scenes[sceneIndex]
      sceneData = scene  // Capture for hash calculation
      references = project.metadata?.visionPhase?.references || []  // Capture references
      
      if (scene) {
        // Prefer action (detailed) over visualDescription (camera-focused)
        // Combine both if they're different for maximum context
        fullSceneContext = scene.action || scene.visualDescription || scene.heading || scenePrompt || ''

        // If both action and visualDescription exist and are different, combine them
        if (scene.action && scene.visualDescription && scene.action !== scene.visualDescription) {
          fullSceneContext = `${scene.action} ${scene.visualDescription}`
        }
        
        console.log('[Scene Image] Using scene data:', {
          hasVisualDescription: !!scene.visualDescription,
          hasAction: !!scene.action,
          hasHeading: !!scene.heading,
          contextLength: fullSceneContext.length,
          sceneIndex: sceneIndex,
          combinedFields: !!(scene.action && scene.visualDescription && scene.action !== scene.visualDescription)
        })
      }
    }
    
    // Build character references using visionDescription (preferred) or fallback descriptions
    // IMPORTANT: referenceId is ONLY assigned to characters with GCS images
    // This ensures the [1], [2] markers in the prompt match the API's referenceImages array
    let gcsRefIndex = 0
    const characterReferences = characterObjects.map((char: any, idx: number) => {
      // Prefer Gemini Vision description over manual description
      const rawDescription = char.visionDescription || char.appearanceDescription || 
        `${char.ethnicity || ''} ${char.subject || 'person'}`.trim()
      
      // Strip emotional descriptors - let scene drive emotions
      let description = stripEmotionalDescriptors(rawDescription)
      
      // Determine wardrobe for this character in this scene
      // Check for scene-level wardrobe override first
      let effectiveWardrobe = char.defaultWardrobe
      let effectiveAccessories = char.wardrobeAccessories
      
      const charId = char.id || char.name // Some characters may use name as ID
      const sceneWardrobeOverride = characterWardrobes.find(
        (cw: { characterId: string; wardrobeId: string }) => cw.characterId === charId
      )
      
      if (sceneWardrobeOverride && char.wardrobes && Array.isArray(char.wardrobes)) {
        // Find the specific wardrobe in the character's collection
        const selectedWardrobe = char.wardrobes.find(
          (w: { id: string; description: string; accessories?: string }) => w.id === sceneWardrobeOverride.wardrobeId
        )
        if (selectedWardrobe) {
          effectiveWardrobe = selectedWardrobe.description
          effectiveAccessories = selectedWardrobe.accessories
          console.log(`[Scene Image] Using scene-level wardrobe override for ${char.name}: "${selectedWardrobe.name}"`)
        }
      }
      
      // Strip clothing descriptors if explicit wardrobe is set to prevent conflicts
      // Example: visionDescription says "wearing a blue suit" but defaultWardrobe says "casual jeans and t-shirt"
      if (effectiveWardrobe) {
        const originalDescription = description
        description = stripClothingDescriptors(description)
        if (description !== originalDescription) {
          console.log(`[Scene Image] Stripped clothing from description for ${char.name} (explicit wardrobe: "${effectiveWardrobe}")`)
          console.log(`[Scene Image]   Original: "${originalDescription}"`)
          console.log(`[Scene Image]   Cleaned:  "${description}"`)
        }
      }
      
      console.log(`[Scene Image] Using ${char.visionDescription ? 'Gemini Vision' : 'manual'} description for ${char.name}`)
      
      // Extract age and add explicit age clause
      const ageMatch = description.match(/\b(late\s*)?(\d{1,2})s?\b/i)
      const ageClause = ageMatch ? ` Exact age: ${ageMatch[0]}.` : ''
      
      // Extract key physical features to emphasize in prompt
      const keyFeatures: string[] = []
      
      // Prioritize key features: hairStyle (especially "Bald"), keyFeature, hairColor
      if (char.hairStyle) {
        if (char.hairStyle.toLowerCase() === 'bald') {
          keyFeatures.push('bald head')
        } else if (char.hairColor && char.hairStyle) {
          keyFeatures.push(`${char.hairColor} ${char.hairStyle} hair`)
        } else {
          keyFeatures.push(`${char.hairStyle} hair`)
        }
      }
      
      if (char.keyFeature) {
        keyFeatures.push(char.keyFeature)
      }
      
      if (char.ethnicity && !keyFeatures.some(f => f.toLowerCase().includes(char.ethnicity.toLowerCase()))) {
        // Only add ethnicity if not already mentioned
        keyFeatures.push(char.ethnicity)
      }
      
      console.log(`[Scene Image] Extracted key features for ${char.name}:`, keyFeatures)
      
      // Build wardrobe description if available (using effective wardrobe, which may be overridden)
      let wardrobeDescription = ''
      if (effectiveWardrobe) {
        wardrobeDescription = `, wearing ${effectiveWardrobe}`
        if (effectiveAccessories) {
          wardrobeDescription += `, ${effectiveAccessories}`
        }
        console.log(`[Scene Image] ${char.name} wardrobe: ${wardrobeDescription}`)
      }
      
      // Only assign referenceId if character has reference image (will be in referenceImages array)
      const hasReferenceImage = !!char.referenceImage
      const referenceId = hasReferenceImage ? ++gcsRefIndex : undefined
      
      // Generate linking description for text-matching mode
      // CRITICAL: This MUST be set here and match what we pass to subjectDescription in the API call
      // Using "person [id]" format which is most reliable with Imagen 3.0
      const linkingDescription = hasReferenceImage ? `person [${referenceId}]` : undefined
      
      if (hasReferenceImage) {
        console.log(`[Scene Image] ${char.name} has reference image, assigned referenceId: ${referenceId}, linkingDescription: "${linkingDescription}"`)
      } else {
        console.log(`[Scene Image] ${char.name} has no reference image, will use text description only`)
      }
      
      return {
        referenceId,  // Only defined for characters with reference images
        name: char.name,
        description: `${description}${ageClause}${wardrobeDescription}`,
        imageUrl: char.referenceImage,      // Blob URL for both prompt text and API call
        ethnicity: char.ethnicity,           // For ethnicity injection in scene description
        keyFeatures: keyFeatures.length > 0 ? keyFeatures : undefined,  // Key physical characteristics
        defaultWardrobe: effectiveWardrobe,  // Wardrobe for consistency (may be scene-overridden)
        wardrobeAccessories: effectiveAccessories,  // Accessories for consistency (may be scene-overridden)
        linkingDescription  // CRITICAL: Pre-computed linking text for text-matching (must match subjectDescription)
      }
    })
    
    // Build clean prompt from scene description with text-based character descriptions
    // If customPrompt exists, it's already optimized/edited by user in Prompt Builder
    // We still need to apply character references if not already included
    let optimizedPrompt: string
    if (customPrompt && customPrompt.trim()) {
      // User provided a custom prompt (likely from Prompt Builder, already optimized and possibly edited)
      // Only re-optimize if character references aren't already in the prompt
      // Check for actual reference instruction patterns, not just character names
      const hasCharacterReferences = characterReferences.length > 0 && (() => {
        // Check for reference instruction patterns that must be present
        const hasReferencePattern = 
          // Pattern 1: "Character [NAME] appears in this scene"
          characterReferences.some((ref: { name: string }) => {
            const namePattern = new RegExp(`character\\s+${ref.name.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+appears`, 'i')
            return namePattern.test(customPrompt)
          }) &&
          // Pattern 2: "MUST match their reference image"
          /must\s+match\s+their\s+reference\s+image/i.test(customPrompt)
        
        return hasReferencePattern
      })()
      
      if (hasCharacterReferences || characterReferences.length === 0) {
        // Character references already included or no references, use custom prompt as-is
        optimizedPrompt = customPrompt
        console.log('[Scene Image] Using custom prompt from Prompt Builder (preserving user edits)')
      } else {
        // Need to add character references, but preserve user's edits
        optimizedPrompt = optimizePromptForImagen({
          sceneAction: customPrompt,  // Use custom prompt as base (preserves user edits)
          visualDescription: customPrompt,
          characterReferences: characterReferences,
          artStyle: artStyle || 'photorealistic'
        })
        console.log('[Scene Image] Added character references to user-edited prompt (re-optimized)')
      }
    } else {
      // Use scene description and optimize
      optimizedPrompt = optimizePromptForImagen({
        sceneAction: fullSceneContext,
        visualDescription: fullSceneContext,
        characterReferences: characterReferences,
        artStyle: artStyle || 'photorealistic'
      })
      console.log('[Scene Image] Optimized scene description prompt')
    }

    // Validate we have a prompt to send to the model
    if (!optimizedPrompt || !optimizedPrompt.trim()) {
      console.warn('[Scene Image] Missing scene description/prompt. projectId, sceneIndex, scenePrompt/customPrompt are required.')
      return NextResponse.json({
        success: false,
        error: 'Missing scene description. Provide projectId+sceneIndex or a scenePrompt/customPrompt.'
      }, { status: 400 })
    }

    console.log('[Scene Image] Optimized prompt preview:', optimizedPrompt.substring(0, 150))

    // Build character references using Blob URLs
    // Filter for characters that have reference images
    const charactersWithImages = characterObjects.filter((c: any) => c.referenceImage)
    const charactersWithoutImages = characterObjects.filter((c: any) => !c.referenceImage)
    
    console.log(`[Scene Image] Character reference status:`, {
      totalCharacters: characterObjects.length,
      withImages: charactersWithImages.length,
      withoutImages: charactersWithoutImages.length,
      withoutImagesNames: charactersWithoutImages.map((c: any) => c.name)
    })
    
    if (charactersWithoutImages.length > 0) {
      console.warn(`[Scene Image] ${charactersWithoutImages.length} character(s) will be included in prompt text only (no reference images):`, 
        charactersWithoutImages.map((c: any) => c.name))
      console.warn('[Scene Image] These characters should have referenceImage saved to database for optimal image generation')
    }
    
    // Build image references for all characters with reference images
    // Use the pre-computed linkingDescription from characterReferences for consistency
    const imageReferences = charactersWithImages.map((char: any) => {
      // Find the matching character reference with referenceId and linkingDescription
      const matchingRef = characterReferences.find((ref: any) => ref.name === char.name)
      
      // Use the referenceId from characterReferences - this was assigned in order for chars with images
      const referenceId = matchingRef?.referenceId
      if (!referenceId) {
        console.error(`[Scene Image] ERROR: Character ${char.name} has reference image but no referenceId assigned!`)
      }
      
      // Use the pre-computed linkingDescription - this MUST match what promptOptimizer uses
      const linkingDescription = matchingRef?.linkingDescription || `person [${referenceId || 1}]`
      
      console.log(`[Scene Image] Character ${char.name} linking description: "${linkingDescription}"`)
      
      return {
        referenceId: referenceId || 1, // Fallback to 1 if somehow missing
        imageUrl: char.referenceImage,  // Blob URL - will be downloaded and encoded by generateImageWithGemini
        subjectDescription: linkingDescription
      }
    })

    console.log(`[Scene Image] Using ${imageReferences.length} character references for structured API call`)

    // Build character-specific negative prompts based on reference characteristics
    // NOTE: We focus on FACIAL/IDENTITY negatives only, not wardrobe negatives
    // Per Gemini docs: "Use positive descriptions instead of negatives" for better results
    const baseNegativePrompt = 'elderly appearance, deeply wrinkled, aged beyond reference, geriatric, wrong age, different facial features, incorrect ethnicity, mismatched appearance, different person, celebrity likeness, child, teenager, youthful appearance, text overlay, captions, subtitles, dialogue text, speech bubbles, text on image, watermark, logo text, title cards, intertitles, written words, typography overlay'
    
    const characterSpecificNegatives: string[] = []
    characterObjects.forEach((char: any) => {
      // If reference is bald, exclude hair
      if (char.hairStyle && char.hairStyle.toLowerCase() === 'bald') {
        characterSpecificNegatives.push('hair', 'full head of hair', 'long hair', 'short hair')
      }
      
      // If reference has beard, exclude clean-shaven
      if (char.keyFeature && char.keyFeature.toLowerCase().includes('beard')) {
        characterSpecificNegatives.push('clean-shaven', 'no facial hair', 'shaved')
      }
      
      // If reference shows specific expression, exclude opposite states that would change appearance
      if (char.appearanceDescription && char.appearanceDescription.toLowerCase().includes('smile')) {
        characterSpecificNegatives.push('frowning', 'sad expression', 'angry expression')
      }
      
      // REMOVED: Wardrobe-specific negatives - using positive reinforcement in prompt instead
      // Gemini docs recommend describing what you WANT, not what to avoid
    })
    
    // Combine base negative prompt with character-specific ones (facial features only)
    const negativePromptParts = [baseNegativePrompt]
    if (characterSpecificNegatives.length > 0) {
      const uniqueNegatives = [...new Set(characterSpecificNegatives)] // Remove duplicates
      negativePromptParts.push(...uniqueNegatives)
    }
    const finalNegativePrompt = negativePromptParts.join(', ')
    
    console.log(`[Scene Image] Negative prompt includes ${characterSpecificNegatives.length} character-specific exclusions (facial features only)`)

    // Generate with Gemini (with optional character references)
    // Add retry logic for reference image access issues
    let base64Image: string | null = null
    let generationAttempt = 0
    const maxGenerationAttempts = 2
    
    while (generationAttempt < maxGenerationAttempts) {
      try {
        generationAttempt++
        console.log(`[Scene Image] Generation attempt ${generationAttempt}/${maxGenerationAttempts}`)
        
        base64Image = await generateImageWithGemini(optimizedPrompt, {
          aspectRatio: '16:9',
          numberOfImages: 1,
          imageSize: quality === 'max' ? '2K' : '1K',
          referenceImages: imageReferences.length > 0 ? imageReferences : undefined,
          personGeneration: personGeneration || 'allow_adult', // Default to 'allow_adult' for backward compatibility
          negativePrompt: finalNegativePrompt // Pass character-specific + wardrobe negatives
        })
        
        // Success - break out of retry loop
        if (base64Image) {
          break
        }
        
      } catch (error: any) {
        console.error(`[Scene Image] Generation attempt ${generationAttempt} failed:`, error.message)
        
        // Check if error is related to reference image access
        const isReferenceImageError = 
          error.message?.toLowerCase().includes('reference') ||
          error.message?.toLowerCase().includes('image') ||
          error.message?.toLowerCase().includes('not found') ||
          error.message?.toLowerCase().includes('access') ||
          error.message?.toLowerCase().includes('permission')
        
        if (isReferenceImageError && generationAttempt < maxGenerationAttempts) {
          // Wait longer before retry (exponential backoff)
          const retryDelay = 1000 * Math.pow(2, generationAttempt - 1)
          console.log(`[Scene Image] Reference image access error detected. Retrying after ${retryDelay}ms...`)
          
          await new Promise(resolve => setTimeout(resolve, retryDelay))
          continue
        }
        
        // If not a reference image error, or max attempts reached, throw
        throw error
      }
    }
    
    if (!base64Image) {
      throw new Error('Failed to generate image after all retry attempts')
    }

    // Upload to Vercel Blob storage
    const imageUrl = await uploadImageToBlob(
      base64Image,
      `scenes/scene-${Date.now()}.png`
    )

    console.log('[Scene Image] ✓ Image generated and uploaded')

    // Validate character likeness (optional - informational only)
    let validation: any = null
    if (characterObjects.length > 0) {
      console.log('[Scene Image] Validating character likeness...')

      // Determine which character to validate (prefer character mentioned in action/visualDesc)
      let primaryCharForValidation = characterObjects[0]

      // ✅ ADD: Skip validation if no valid character
      if (!primaryCharForValidation || !primaryCharForValidation.referenceImage) {
        console.log('[Scene Image] Skipping validation - no character with reference image')
      } else {
      
      const sceneText = `${fullSceneContext || ''}`.toLowerCase()
      for (const char of characterObjects) {
        if (char && char.name && char.referenceImage && sceneText.includes(char.name.toLowerCase())) {
          // ✅ Added char && char.referenceImage check
          primaryCharForValidation = char
          console.log(`[Scene Image] Validating against ${char.name} (featured in scene)`)
          break
        }
      }

      try {
        validation = await validateCharacterLikeness(
          imageUrl,
          primaryCharForValidation.referenceImage!,
          primaryCharForValidation.name
        )

        console.log(`[Image Validator] ${primaryCharForValidation.name} - Matches: ${validation.matches}, Confidence: ${validation.confidence}%`)
        
        if (!validation.matches && validation.confidence < 90) {
          console.warn('[Scene Image] ⚠️  Character likeness validation failed (confidence < 90%).')
          console.warn('[Scene Image] Issues:', validation.issues.join(', '))
        } else if (validation.matches) {
          console.log(`[Scene Image] ✓ Character likeness validated (${validation.confidence}% confidence)`)
        }
      } catch (error) {
        console.error('[Scene Image] Validation failed:', error)
      }
      } // Close the else block
    }

    // Calculate workflow sync hashes for tracking staleness
    const basedOnDirectionHash = sceneData ? generateDirectionHash(sceneData) : undefined
    const basedOnReferencesHash = sceneData ? generateImageSourceHash(sceneData) : undefined

    // 3. Charge credits after successful generation
    try {
      await CreditService.charge(
        userId!,
        CREDIT_COST,
        'ai_usage',
        projectId || null,
        { operation: 'imagen_generate', sceneIndex, model: 'gemini-3-pro-image-preview' }
      )
      creditsCharged = CREDIT_COST
      console.log(`[Scene Image] Charged ${CREDIT_COST} credits to user ${userId}`)
    } catch (chargeError: any) {
      console.error('[Scene Image] Failed to charge credits:', chargeError)
      // Don't fail the request if credit charge fails - image was already generated
    }

    // Get updated balance for response
    let newBalance: number | undefined
    try {
      const breakdown = await CreditService.getCreditBreakdown(userId!)
      newBalance = breakdown.total_credits
    } catch (e) {
      // Ignore balance lookup errors
    }

    // Prepare response based on validation results
    const response: any = {
      success: true,
      imageUrl,
      model: 'gemini-3-pro-image-preview',
      quality: quality,
      provider: 'gemini',
      storage: 'vercel-blob',
      // Include hashes for workflow sync tracking
      basedOnDirectionHash,
      basedOnReferencesHash,
      // Credit info
      creditsCharged: CREDIT_COST,
      creditsBalance: newBalance
    }

    // Add validation info (informational only for storyboards)
    if (validation) {
      response.validationConfidence = validation.confidence
      response.validationPassed = true  // Always pass for storyboards
      response.validationMessage = `Storyboard generated (${validation.confidence}% character similarity - informational only)`
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('[Scene Image] Error:', error)
    console.error('[Scene Image] Error stack:', error.stack)
    console.error('[Scene Image] Error details:', {
      message: error.message,
      name: error.name,
      code: error.code,
      statusCode: error.statusCode
    })
    
    // Check if it's a quota error
    const isQuotaError = error.message?.includes('quota') || 
                        error.message?.includes('Quota exceeded') ||
                        error.message?.includes('RESOURCE_EXHAUSTED') ||
                        error.message?.includes('429')
    
    if (isQuotaError) {
      return NextResponse.json({
        success: false,
        error: 'Google Cloud quota limit reached',
        errorType: 'quota',
        googleError: error.message,
        retryable: true,
        documentation: 'https://cloud.google.com/vertex-ai/docs/quotas'
      }, { status: 429 })
    }
    
    // Provide detailed error message to frontend
    const errorMessage = error.message || 'Failed to generate scene image'
    const detailedError = `${errorMessage}${error.code ? ` (Code: ${error.code})` : ''}${error.statusCode ? ` (Status: ${error.statusCode})` : ''}`
    
    return NextResponse.json({
      success: false,
      error: detailedError,
      errorType: 'api',
      errorDetails: {
        originalMessage: error.message,
        code: error.code,
        statusCode: error.statusCode,
        name: error.name
      }
    }, { status: 500 })
  }
}
