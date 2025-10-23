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

    // Single unified project load for both character and scene data
    let project = null
    let characterObjects = selectedCharacters

    if (projectId) {
      await sequelize.authenticate()
      project = await Project.findByPk(projectId)
      
      if (!project) {
        return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 })
      }

      // Load characters if IDs provided
      if (selectedCharacters.length > 0 && typeof selectedCharacters[0] === 'string') {
        const characters = project.metadata?.visionPhase?.characters || []
        
        // Match characters by ID (primary) or name (fallback)
        characterObjects = selectedCharacters.map((charId: string) => {
          // Try ID match first
          const byId = characters.find((c: any) => c.id === charId)
          if (byId) return byId
          
          // Fallback: treat as name for legacy
          return characters.find((c: any) => c.name === charId)
        }).filter((c: any) => c != null)

        console.log('[Scene Image] Loaded character objects:', characterObjects.length)
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

    // Generate with Vertex AI Imagen 3 using Base64 references
    const base64Image = await callVertexAIImagen(optimizedPrompt, {
      aspectRatio: '16:9',
      numberOfImages: 1,
      quality: quality, // Pass quality setting
      referenceImages: base64References.map(ref => ({
        referenceId: ref.referenceId,
        base64Image: ref.base64Image,
        referenceType: 'REFERENCE_TYPE_SUBJECT' as const,
        subjectDescription: ref.description
      }))
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
