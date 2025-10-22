import { NextRequest, NextResponse } from 'next/server'
import { callVertexAIImagen } from '@/lib/vertexai/client'
import { uploadImageToBlob } from '@/lib/storage/blob'
import { getCharacterAttributes } from '../../../../lib/character/persistence'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { prompt, projectId, characterId, quality = 'auto' } = await req.json()
    
    let finalPrompt = prompt?.trim() || ''
    
    // If projectId and characterId provided, try to build prompt from stored attributes
    if (projectId && characterId && !finalPrompt) {
      const character = await getCharacterAttributes(projectId, characterId)
      if (character) {
        // Build comprehensive prompt from flat character structure
        const parts: string[] = []
        
        // Core identity - key feature is primary descriptor
        if (character.keyFeature) {
          parts.push(character.keyFeature)
        }
        if (character.ethnicity) {
          parts.push(character.ethnicity)
        }
        
        // Appearance details - build comprehensive visual
        if (character.hairColor && character.hairStyle) {
          parts.push(`${character.hairColor} ${character.hairStyle} hair`)
        }
        if (character.eyeColor) {
          parts.push(`${character.eyeColor} eyes`)
        }
        if (character.expression) {
          parts.push(character.expression)
        }
        if (character.build) {
          parts.push(`${character.build} build`)
        }
        
        finalPrompt = parts.join(', ')
        console.log('[Character Image] Built prompt from structured attributes:', finalPrompt.substring(0, 100))
      }
    }
    
    if (!finalPrompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    // Enhance prompt for character portrait
    const enhancedPrompt = `${finalPrompt}

Style: Professional character portrait, photorealistic, high detail
Quality: 8K resolution, studio lighting, sharp focus
Composition: Portrait orientation, neutral background, character-focused
Camera: 85mm portrait lens, shallow depth of field
Lighting: Soft natural lighting, professional photography`

    console.log('[Character Image] Generating with Vertex AI Imagen 3:', enhancedPrompt.substring(0, 100))

    // Generate with Vertex AI (1:1 for portrait)
    const base64Image = await callVertexAIImagen(enhancedPrompt, {
      aspectRatio: '1:1',
      numberOfImages: 1,
      quality: quality // Pass quality setting
    })
    
    // Upload to Vercel Blob
    const imageUrl = await uploadImageToBlob(
      base64Image,
      `characters/char-${Date.now()}.png`
    )
    
    return NextResponse.json({ 
      success: true, 
      imageUrl,
      model: quality === 'max' ? 'imagen-4.0-ultra-generate-001' : 'imagen-3.0-generate-002',
      quality: quality,
      provider: 'vertex-ai',
      storage: 'vercel-blob'
    })

  } catch (error) {
    console.error('[Character Image] Vertex AI generation error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Image generation failed' 
    }, { status: 500 })
  }
}

