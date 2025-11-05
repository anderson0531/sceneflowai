import { NextRequest, NextResponse } from 'next/server'
import { callVertexAIImagen } from '@/lib/vertexai/client'
import { uploadImageToBlob } from '@/lib/storage/blob'
import { optimizePromptForImagen } from '@/lib/imagen/promptOptimizer'
import { validateCharacterLikeness } from '@/lib/imagen/imageValidator'
import { waitForGCSURIs, checkGCSURIAccessibility } from '@/lib/storage/gcsAccessibility'
import Project from '../../../../models/Project'
import { sequelize } from '../../../../config/database'

export const runtime = 'nodejs'
export const maxDuration = 60

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

export async function POST(req: NextRequest) {
  try {
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
      personGeneration       // NEW: Optional personGeneration setting (default: 'allow_adult')
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
      
      // DEBUG: Log character properties and ensure referenceImageGCS is populated
      if (characterObjects.length > 0) {
        console.log('[Scene Image] DEBUG - First character keys:', Object.keys(characterObjects[0]))
        console.log('[Scene Image] DEBUG - Has referenceImage:', !!characterObjects[0].referenceImage)
        console.log('[Scene Image] DEBUG - Has referenceImageGCS:', !!characterObjects[0].referenceImageGCS)
        
        // Log all characters' reference image status
        characterObjects.forEach((char: any, idx: number) => {
          console.log(`[Scene Image] Character ${idx + 1} (${char.name}):`, {
            hasReferenceImage: !!char.referenceImage,
            hasReferenceImageGCS: !!char.referenceImageGCS,
            referenceImageUrl: char.referenceImage ? char.referenceImage.substring(0, 50) + '...' : 'none',
            referenceImageGCSUrl: char.referenceImageGCS ? char.referenceImageGCS.substring(0, 50) + '...' : 'none'
          })
        })
        
        // Ensure all characters have referenceImageGCS - if missing but referenceImage exists, 
        // log warning but continue (GCS URL might be in a different field or needs to be fetched)
        const missingGCS = characterObjects.filter((c: any) => c.referenceImage && !c.referenceImageGCS)
        if (missingGCS.length > 0) {
          console.warn(`[Scene Image] WARNING: ${missingGCS.length} character(s) have referenceImage but missing referenceImageGCS:`, 
            missingGCS.map((c: any) => c.name))
          console.warn('[Scene Image] These characters will still be included in prompt text but may not have structured GCS references')
        }
      } else if (projectId) {
        // Even if no characterObjects found, log available characters from project
        console.log('[Scene Image] DEBUG - No characterObjects found, but project has', allCharacters.length, 'characters')
        if (allCharacters.length > 0) {
          allCharacters.forEach((char: any, idx: number) => {
            console.log(`[Scene Image] Available character ${idx + 1}:`, {
              name: char.name,
              hasReferenceImage: !!char.referenceImage,
              hasReferenceImageGCS: !!char.referenceImageGCS
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

    if (project && typeof sceneIndex === 'number') {
      const scenes = project.metadata?.visionPhase?.script?.script?.scenes || []
      const scene = scenes[sceneIndex]
      
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
    const characterReferences = characterObjects.map((char: any, idx: number) => {
      // Prefer Gemini Vision description over manual description
      const rawDescription = char.visionDescription || char.appearanceDescription || 
        `${char.ethnicity || ''} ${char.subject || 'person'}`.trim()
      
      // Strip emotional descriptors - let scene drive emotions
      const description = stripEmotionalDescriptors(rawDescription)
      
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
      
      return {
        referenceId: idx + 1,
        name: char.name,
        description: `${description}${ageClause}`,
        imageUrl: char.referenceImage,      // HTTPS URL for prompt text (preferred - works in prompts)
        gcsUri: char.referenceImageGCS,     // GCS URI for structured array (if needed)
        ethnicity: char.ethnicity,           // For ethnicity injection in scene description
        keyFeatures: keyFeatures.length > 0 ? keyFeatures : undefined  // Key physical characteristics
      }
    })
    
    // Build clean prompt from scene description with text-based character descriptions
    // If customPrompt exists, it's already optimized/edited by user in Prompt Builder
    // We still need to apply character references if not already included
    let optimizedPrompt: string
    if (customPrompt && customPrompt.trim()) {
      // User provided a custom prompt (likely from Prompt Builder, already optimized and possibly edited)
      // Only re-optimize if character references aren't already in the prompt
      const hasCharacterReferences = characterReferences.length > 0 && 
        characterReferences.some((ref: { name: string }) => customPrompt.includes(ref.name.toUpperCase()) || customPrompt.includes(ref.name))
      
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
        console.log('[Scene Image] Added character references to user-edited prompt')
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

    console.log('[Scene Image] Optimized prompt preview:', optimizedPrompt.substring(0, 150))

    // Build character references using GCS URIs
    // Filter for characters that have GCS references (required for Imagen API structured references)
    const charactersWithGCS = characterObjects.filter((c: any) => c.referenceImageGCS)
    const charactersWithoutGCS = characterObjects.filter((c: any) => c.referenceImage && !c.referenceImageGCS)
    
    console.log(`[Scene Image] Character reference status:`, {
      totalCharacters: characterObjects.length,
      withGCS: charactersWithGCS.length,
      withoutGCS: charactersWithoutGCS.length,
      withoutGCSNames: charactersWithoutGCS.map((c: any) => c.name)
    })
    
    if (charactersWithoutGCS.length > 0) {
      console.warn(`[Scene Image] ${charactersWithoutGCS.length} character(s) will be included in prompt text only (no structured GCS references):`, 
        charactersWithoutGCS.map((c: any) => c.name))
      console.warn('[Scene Image] These characters should have referenceImageGCS saved to database for optimal image generation')
    }
    
    const gcsReferences = charactersWithGCS.map((char: any, idx: number) => ({
      referenceId: idx + 1,
      gcsUri: char.referenceImageGCS,
      referenceType: 'REFERENCE_TYPE_SUBJECT' as const,
      subjectType: 'SUBJECT_TYPE_PERSON' as const,
      subjectDescription: char.appearanceDescription || 
        `${char.ethnicity || ''} ${char.subject || 'person'}`.trim(),
      // Store HTTPS fallback URL
      httpsUrl: char.referenceImage
    }))

    console.log(`[Scene Image] Using ${gcsReferences.length} character references with GCS for structured API call`)
    if (gcsReferences.length > 0) {
      gcsReferences.forEach((ref, idx) => {
        console.log(`[Scene Image] GCS Reference ${idx + 1}:`, {
          referenceId: ref.referenceId,
          gcsUri: ref.gcsUri.substring(0, 60) + '...',
          subjectDescription: ref.subjectDescription.substring(0, 50) + '...'
        })
      })
    }

    // Pre-flight validation: Wait for GCS URIs to be accessible
    // This helps avoid race conditions where the image was just uploaded
    if (gcsReferences.length > 0) {
      console.log('[Scene Image] Pre-flight validation: Checking GCS URI accessibility...')
      const gcsUris = gcsReferences.map(ref => ref.gcsUri)
      
      try {
        // Wait for all GCS URIs to be accessible with retries
        // This adds a delay (1000ms initial) to allow GCS to process the upload
        // Increased from 500ms to 1000ms for better reliability
        const { accessible, failed } = await waitForGCSURIs(gcsUris, 5, 1000)
        
        if (failed.length > 0) {
          console.warn(`[Scene Image] ${failed.length} GCS URI(s) may not be accessible:`, failed)
          console.warn('[Scene Image] Will attempt generation anyway - Vertex AI may handle this gracefully')
        } else {
          console.log(`[Scene Image] ✓ All ${accessible.length} GCS URI(s) are accessible`)
        }
      } catch (error: any) {
        console.warn('[Scene Image] Pre-flight validation failed:', error.message)
        console.warn('[Scene Image] Continuing with generation - Vertex AI will validate access')
      }
    }

    // Build character-specific negative prompts based on reference characteristics
    const baseNegativePrompt = 'elderly appearance, deeply wrinkled, aged beyond reference, geriatric, wrong age, different facial features, incorrect ethnicity, mismatched appearance, different person, celebrity likeness, child, teenager, youthful appearance'
    
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
      // This is handled by the base negative prompt already, but we can add more specific ones
      if (char.appearanceDescription && char.appearanceDescription.toLowerCase().includes('smile')) {
        characterSpecificNegatives.push('frowning', 'sad expression', 'angry expression')
      }
    })
    
    // Combine base negative prompt with character-specific ones
    const negativePromptParts = [baseNegativePrompt]
    if (characterSpecificNegatives.length > 0) {
      const uniqueNegatives = [...new Set(characterSpecificNegatives)] // Remove duplicates
      negativePromptParts.push(...uniqueNegatives)
    }
    const finalNegativePrompt = negativePromptParts.join(', ')
    
    console.log(`[Scene Image] Negative prompt includes ${characterSpecificNegatives.length} character-specific exclusions`)

    // Generate with Vertex AI Imagen 3 (with character references)
    // Add retry logic for reference image access issues
    let base64Image: string | null = null
    let generationAttempt = 0
    const maxGenerationAttempts = 2
    
    while (generationAttempt < maxGenerationAttempts) {
      try {
        generationAttempt++
        console.log(`[Scene Image] Generation attempt ${generationAttempt}/${maxGenerationAttempts}`)
        
        base64Image = await callVertexAIImagen(optimizedPrompt, {
          aspectRatio: '16:9',
          numberOfImages: 1,
          quality: quality,
          negativePrompt: finalNegativePrompt,
          referenceImages: gcsReferences.length > 0 ? gcsReferences : undefined,
          personGeneration: personGeneration || 'allow_adult' // Default to 'allow_adult' for backward compatibility
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
          
          // Re-check GCS URIs before retry with longer delay and more retries
          if (gcsReferences.length > 0) {
            const gcsUris = gcsReferences.map(ref => ref.gcsUri)
            await waitForGCSURIs(gcsUris, 3, 1500)
          }
          
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

    // Prepare response based on validation results
    const response: any = {
      success: true,
      imageUrl,
      model: quality === 'max' ? 'imagen-4.0-ultra-generate-001' : 'imagen-3.0-generate-002',
      quality: quality,
      provider: 'vertex-ai',
      storage: 'vercel-blob'
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
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to generate scene image',
      errorType: 'api'
    }, { status: 500 })
  }
}
