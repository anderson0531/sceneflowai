import { NextRequest, NextResponse } from 'next/server'
import { callVertexAIImagen } from '@/lib/vertexai/client'
import { uploadImageToBlob } from '@/lib/storage/blob'
import { prepareBase64References } from '@/lib/imagen/base64References'
import { optimizePromptForImagen } from '@/lib/imagen/promptOptimizer'
import { validateCharacterLikeness } from '@/lib/imagen/imageValidator'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      sceneContext,
      selectedCharacters = [],
      quality = 'auto' // NEW parameter
    } = body

    console.log('[Scene Image] Generating scene image')
    console.log('[Scene Image] Selected characters:', selectedCharacters.length)

    // Prepare Base64 character references
    const base64References = await prepareBase64References(selectedCharacters)
    
    // Build clean prompt from scene description with ALL character references
    const optimizedPrompt = optimizePromptForImagen({
      sceneAction: sceneContext?.action || '',
      visualDescription: sceneContext?.visualDescription || '',
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
    if (base64References.length > 0 && selectedCharacters.length > 0) {
      console.log('[Scene Image] Validating character likeness...')

      // Determine which character to validate (prefer character mentioned in action/visualDesc)
      let primaryCharForValidation = selectedCharacters[0]
      
      const sceneText = `${sceneContext?.action || ''} ${sceneContext?.visualDescription || ''}`.toLowerCase()
      for (const char of selectedCharacters) {
        if (char.name && sceneText.includes(char.name.toLowerCase())) {
          // This character is mentioned in the scene, use them for validation
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
    return NextResponse.json(
      { error: error.message || 'Failed to generate scene image' },
      { status: 500 }
    )
  }
}
