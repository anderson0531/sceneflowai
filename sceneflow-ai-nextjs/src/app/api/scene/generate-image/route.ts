import { NextRequest, NextResponse } from 'next/server'
import { callVertexAIImagen } from '@/lib/vertexai/client'
import { uploadImageToBlob } from '@/lib/storage/blob'
import { prepareBase64References } from '@/lib/imagen/base64References'
import { optimizePromptForImagen } from '@/lib/imagen/promptOptimizer'
import { validateCharacterLikeness } from '@/lib/imagen/imageValidator'
import Project from '../../../../models/Project'
import { sequelize } from '../../../../config/database'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      projectId,
      sceneIndex,
      scenePrompt,
      selectedCharacters = [],
      quality = 'auto' // NEW parameter
    } = body

    console.log('[Scene Image] Generating scene image')
    console.log('[Scene Image] Selected characters:', selectedCharacters.length)
    console.log('[Scene Image] Raw selectedCharacters:', JSON.stringify(selectedCharacters))

    // Single unified project load for both character and scene data
    let project = null
    let characterObjects = selectedCharacters

    // Filter out null/undefined values immediately
    const beforeFilterCount = selectedCharacters.length
    characterObjects = characterObjects.filter((c: any) => c != null)
    const afterFilterCount = characterObjects.length

    console.log(`[Scene Image] Filtered ${beforeFilterCount - afterFilterCount} null values`)
    console.log('[Scene Image] DEBUG - selectedCharacters type:', characterObjects[0] ? typeof characterObjects[0] : 'empty array')
    console.log('[Scene Image] DEBUG - selectedCharacters[0]:', characterObjects[0] ? JSON.stringify(characterObjects[0]).substring(0, 200) : 'none')
    console.log('[Scene Image] DEBUG - projectId:', projectId)

    if (projectId) {
      await sequelize.authenticate()
      project = await Project.findByPk(projectId)
      
      if (!project) {
        return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 })
      }

      // ALWAYS load characters from database if we have a projectId
      if (characterObjects.length > 0) {
        const characters = project.metadata?.visionPhase?.characters || []
        console.log('[Scene Image] DEBUG - characters in project:', characters.length)
        
        // If selectedCharacters are IDs (strings), match them
        if (typeof characterObjects[0] === 'string') {
          characterObjects = characterObjects.map((charId: string) => {
            const byId = characters.find((c: any) => c.id === charId)
            if (byId) return byId
            return characters.find((c: any) => c.name === charId)
          }).filter((c: any) => c != null)
          
          console.log('[Scene Image] Loaded character objects by ID:', characterObjects.length)
        } 
        // If selectedCharacters are already objects, reload them from DB
        else if (typeof characterObjects[0] === 'object') {
          characterObjects = characterObjects.map((char: any) => {
            if (!char) return null
            
            // Try ID match first (if ID exists)
            if (char.id) {
              const byId = characters.find((c: any) => c.id === char.id)
              if (byId) return byId
            }
            
            // Fallback to name match
            if (char.name) {
              const byName = characters.find((c: any) => c.name === char.name)
              if (byName) return byName
            }
            
            return null
          }).filter((c: any) => c != null)
          
          console.log('[Scene Image] Reloaded character objects from DB:', characterObjects.length)
        }
        
        // DEBUG: Log character properties
        if (characterObjects.length > 0) {
          console.log('[Scene Image] DEBUG - First character keys:', Object.keys(characterObjects[0]))
          console.log('[Scene Image] DEBUG - Has referenceImage:', !!characterObjects[0].referenceImage)
          console.log('[Scene Image] DEBUG - Has referenceImageGCS:', !!characterObjects[0].referenceImageGCS)
        }
      }
    }

    // Filter for valid reference images
    characterObjects = characterObjects.filter((c: any) => 
      c != null && (c.referenceImage || c.referenceImageGCS)
    )
    console.log('[Scene Image] Valid character objects after filtering:', characterObjects.length)

    // Prepare Base64 character references
    const base64References = await prepareBase64References(characterObjects)
    
    // Load scene data (reuse same project variable)
    let fullSceneContext = scenePrompt || ''

    if (project && typeof sceneIndex === 'number') {
      const scenes = project.metadata?.visionPhase?.script?.script?.scenes || []
      const scene = scenes[sceneIndex]
      
      if (scene) {
        // Build comprehensive scene description from multiple fields
        fullSceneContext = scene.visualDescription || 
                          scene.action || 
                          scene.heading || 
                          scenePrompt || 
                          ''
        
        console.log('[Scene Image] Using scene data:', {
          hasVisualDescription: !!scene.visualDescription,
          hasAction: !!scene.action,
          hasHeading: !!scene.heading,
          contextLength: fullSceneContext.length,
          sceneIndex: sceneIndex
        })
      }
    }
    
    // Build clean prompt from scene description with ALL character references
    const optimizedPrompt = optimizePromptForImagen({
      sceneAction: fullSceneContext,
      visualDescription: fullSceneContext,
      characterReferences: base64References.map(ref => ({
        referenceId: ref.referenceId,
        name: ref.name,
        description: ref.description
      }))
    })

    console.log('[Scene Image] Optimized prompt preview:', optimizedPrompt.substring(0, 150))

    // Generate with Vertex AI Imagen 3
    // Prefer GCS URIs over Base64 for efficiency
    const referenceImages = characterObjects.map((char: any, idx: number) => {
      const matchingRef = base64References.find(r => r.referenceId === idx + 1)
      
      // Build enhanced subject description with age clause (for both GCS and Base64)
      const buildSubjectDescription = (char: any) => {
        const baseDescription = char.appearanceDescription || 
          `${char.ethnicity || ''} ${char.subject || 'person'}`.trim()
        const ageMatch = baseDescription.match(/\b(late\s*)?(\d{1,2})s?\b/i)
        const ageClause = ageMatch ? ` Exact age: ${ageMatch[0]}, not older, not younger.` : ''
        return `Match this person's facial features exactly: ${baseDescription}.${ageClause} Maintain exact likeness including face shape, bone structure, and all distinctive features.`
      }
      
      // Use GCS URL if available (preferred), otherwise use Base64
      if (char.referenceImageGCS && char.referenceImageGCS.startsWith('gs://')) {
        console.log(`[Scene Image] Using GCS URI for ${char.name}:`, char.referenceImageGCS)
        return {
          referenceId: idx + 1,
          gcsUri: char.referenceImageGCS,
          subjectDescription: buildSubjectDescription(char)
        }
      } else {
        console.log(`[Scene Image] Using Base64 for ${char.name} (GCS not available)`)
        return {
          referenceId: idx + 1,
          base64Image: matchingRef?.base64Image,
          subjectDescription: matchingRef?.description || `Character ${idx + 1}`
        }
      }
    })

    const base64Image = await callVertexAIImagen(optimizedPrompt, {
      aspectRatio: '16:9',
      numberOfImages: 1,
      quality: quality, // Pass quality setting
      negativePrompt: 'elderly appearance, deeply wrinkled, aged beyond reference, geriatric, wrong age, different facial features, incorrect ethnicity, mismatched appearance, different person, celebrity likeness, child, teenager, youthful appearance',
      referenceImages
    })

    // Upload to Vercel Blob storage
    const imageUrl = await uploadImageToBlob(
      base64Image,
      `scenes/scene-${Date.now()}.png`
    )

    console.log('[Scene Image] ✓ Image generated and uploaded')

    // Validate character likeness if references were used
    let validation: any = null
    if (base64References.length > 0 && characterObjects.length > 0) {
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

    // Add validation info based on results
    if (validation) {
      response.validationConfidence = validation.confidence
      
      if (!validation.matches && validation.confidence < 90) {
        // Validation failed - show warning
        response.validationPassed = false
        response.validationWarning = `Generated character may not match reference (${validation.confidence}% confidence). Issues: ${validation.issues.join(', ')}`
        
        // Suggest Max quality if currently using Auto
        if (quality === 'auto') {
          response.qualitySuggestion = 'max'
          response.qualitySuggestionMessage = 'Try regenerating with Max quality (Imagen 4 Ultra) for better character cloning'
        }
      } else {
        // Validation passed or acceptable for storyboards
        response.validationPassed = true
        if (validation.confidence >= 90) {
          response.validationMessage = `Character likeness verified (${validation.confidence}% confidence)`
        }
      }
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
