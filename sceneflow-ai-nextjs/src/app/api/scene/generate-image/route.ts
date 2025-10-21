import { NextRequest, NextResponse } from 'next/server'
import { callVertexAIImagen } from '@/lib/vertexai/client'
import { uploadImageToBlob } from '@/lib/storage/blob'
import { optimizePromptForImagen } from '@/lib/imagen/promptOptimizer'
import { validateCharacterLikeness } from '@/lib/imagen/imageValidator'

export const runtime = 'nodejs'
export const maxDuration = 60

// Helper to extract character names from scene
function getSceneCharacterNames(sceneContext: any): string[] {
  const foundNames = new Set<string>()
  
  // 1. Try explicit characters array first
  if (sceneContext?.characters && sceneContext.characters.length > 0) {
    sceneContext.characters.forEach((c: any) => {
      const name = c.name || c
      if (name) foundNames.add(name)
    })
  }
  
  // 2. Extract from dialogue
  if (sceneContext?.dialogue && Array.isArray(sceneContext.dialogue)) {
    sceneContext.dialogue.forEach((d: any) => {
      if (d.character) {
        // Remove parentheticals like (V.O.) or (O.S.)
        const cleanName = d.character.replace(/\s*\([^)]*\)/g, '').trim()
        foundNames.add(cleanName)
      }
    })
  }
  
  // 3. Extract from action/visual description (only if no characters found yet)
  if (foundNames.size === 0) {
    const textToSearch = [
      sceneContext?.action || '',
      sceneContext?.visualDescription || ''
    ].join(' ')
    
    // Look for character name patterns (full names with 2+ parts, or single capitalized names)
    const namePattern = /\b([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g
    const matches = textToSearch.matchAll(namePattern)
    
    for (const match of matches) {
      const potentialName = match[1]
      foundNames.add(potentialName)
    }
  }
  
  return Array.from(foundNames)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      prompt,
      sceneContext,
      selectedCharacters = []
    } = body

    console.log('[Scene Image] Generating scene image')
    console.log('[Scene Image] Has scene context:', !!sceneContext)
    console.log('[Scene Image] Selected characters:', selectedCharacters.length)
    console.log('[Scene Image] Selected character details:', selectedCharacters.map((c: any) => ({
      name: c.name,
      hasGCS: !!c.referenceImageGCS,
      gcsUrl: c.referenceImageGCS?.substring(0, 50) || 'none',
      hasAppearance: !!c.appearanceDescription
    })))

    // Extract character names from scene
    const sceneCharacterNames = getSceneCharacterNames(sceneContext)
    console.log('[Scene Image] Scene character names:', sceneCharacterNames)

    // Filter selected characters to only those in the scene with GCS URLs
    // Use flexible matching: check if character name contains scene name or vice versa
    const charactersWithGCS = selectedCharacters.filter((char: any) => {
      if (!char.referenceImageGCS) {
        console.log(`[Scene Image] Character ${char.name} has no GCS URL, skipping`)
        return false
      }
      
      // Normalize names for comparison (remove extra spaces, lowercase)
      const charNameNorm = char.name.toLowerCase().trim()
      
      // Check if this character matches any scene character name
      const isInScene = sceneCharacterNames.some(sceneName => {
        const sceneNameNorm = sceneName.toLowerCase().trim()
        
        // Match if:
        // 1. Exact match
        // 2. Character name contains scene name (e.g., "Brian Anderson Sr" contains "Brian")
        // 3. Scene name contains character name (e.g., "Brian" matches "Brian Anderson Sr")
        const matches = charNameNorm === sceneNameNorm ||
                       charNameNorm.includes(sceneNameNorm) ||
                       sceneNameNorm.includes(charNameNorm)
        
        if (matches) {
          console.log(`[Scene Image] ✓ Matched "${char.name}" to scene name "${sceneName}"`)
        }
        
        return matches
      })
      
      if (!isInScene && sceneCharacterNames.length === 0) {
        // If no scene names found, include all characters with GCS
        console.log(`[Scene Image] No scene names found, including character ${char.name}`)
        return true
      }
      
      return isInScene
    })

    console.log('[Scene Image] Characters with GCS references:', charactersWithGCS.map((c: any) => ({
      name: c.name,
      hasGCS: !!c.referenceImageGCS,
      hasAppearance: !!c.appearanceDescription
    })))

    // Build optimized prompt using AI
    let finalPrompt = prompt
    
    if (charactersWithGCS.length > 0) {
      try {
        finalPrompt = await optimizePromptForImagen({
          rawPrompt: prompt,
          sceneAction: sceneContext?.action || '',
          visualDescription: sceneContext?.visualDescription || prompt,
          characterNames: sceneCharacterNames,
          hasCharacterReferences: true,
          characterMetadata: charactersWithGCS.map((char: any) => ({
            name: char.name,
            referenceImageGCS: char.referenceImageGCS,
            appearanceDescription: char.appearanceDescription || `${char.ethnicity || ''} ${char.subject || 'person'}`.trim()
          }))
        })

        console.log('[Scene Image] ✓ AI-optimized prompt with GCS references')
        console.log('[Scene Image] Prompt preview:', finalPrompt.substring(0, 200))
      } catch (error) {
        console.error('[Prompt Optimizer] AI failed:', error)
        // Fallback: use original prompt
        console.warn('[Scene Image] Using original prompt as fallback')
      }
    } else {
      console.log('[Scene Image] No GCS references available, using original prompt')
    }

    // Validate shot type compatibility
    if (charactersWithGCS.length > 0) {
      const isWideShot = /wide|establishing|aerial|high-angle|high angle|bird.?s eye|overhead/i.test(finalPrompt)
      
      if (isWideShot) {
        console.log('[Scene Image] ⚠️  WARNING: Wide shot with character reference may not show facial details')
        console.log('[Scene Image] Consider using: Close-Up, Medium Close-Up, or Medium Shot')
      } else {
        console.log('[Scene Image] ✓ Shot type compatible with character reference')
      }
    }

    // Generate image with Vertex AI Imagen 3
    // GCS references are now embedded in the prompt text
    const base64Image = await callVertexAIImagen(finalPrompt, {
      aspectRatio: '16:9',
      numberOfImages: 1
    })

    // Upload to Vercel Blob storage
    const imageUrl = await uploadImageToBlob(
      base64Image,
      `scenes/scene-${Date.now()}.png`
    )

    console.log('[Scene Image] ✓ Image generated and uploaded')

    // Validate character likeness if references were used
    let validation: any = null
    if (charactersWithGCS.length > 0 && selectedCharacters.length > 0) {
      console.log('[Scene Image] Validating character likeness...')

      const primaryChar = selectedCharacters[0]

      try {
        validation = await validateCharacterLikeness(
          imageUrl,
          primaryChar.referenceImage!,  // Use Vercel Blob URL for comparison
          primaryChar.name
        )

        // Stricter threshold: retry if confidence < 90%
        if (!validation.matches && validation.confidence < 90) {
          console.warn('[Scene Image] ⚠️  Character likeness validation failed (confidence < 90%).')
          console.warn('[Scene Image] Issues:', validation.issues.join(', '))
          console.warn('[Scene Image] Confidence:', validation.confidence)

          // Log warning but don't retry - the prompt optimizer should have handled it
          console.warn('[Scene Image] Proceeding with current image. Consider reviewing character reference quality.')
        } else if (validation.matches) {
          console.log(`[Scene Image] ✓ Character likeness validated (${validation.confidence}% confidence)`)
        } else {
          console.warn(`[Scene Image] ⚠️  Low confidence match (${validation.confidence}%), but proceeding`)
        }
      } catch (error) {
        console.error('[Scene Image] Validation failed:', error)
        // Proceed with image if validation fails
      }
    }

    return NextResponse.json({
      success: true,
      imageUrl,
      model: 'imagen-3.0-generate-002',
      provider: 'vertex-ai',
      storage: 'vercel-blob',
      validationWarning: validation && !validation.matches && validation.confidence < 90
        ? `Generated character may not match reference (${validation.confidence}% confidence). Issues: ${validation.issues.join(', ')}`
        : undefined
    })
  } catch (error: any) {
    console.error('[Scene Image] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate scene image' },
      { status: 500 }
    )
  }
}
