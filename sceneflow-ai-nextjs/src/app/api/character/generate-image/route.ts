import { NextRequest, NextResponse } from 'next/server'
import { callVertexAIImagen } from '@/lib/vertexai/client'
import { uploadImageToBlob } from '@/lib/storage/blob'
import { getCharacterAttributes } from '../../../../lib/character/persistence'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { prompt, projectId, characterId } = await req.json()
    
    let finalPrompt = prompt?.trim() || ''
    
    // If projectId and characterId provided, try to build prompt from stored attributes
    if (projectId && characterId && !finalPrompt) {
      const character = await getCharacterAttributes(projectId, characterId)
      if (character) {
        // Build comprehensive prompt from character attributes
        const parts: string[] = []
        parts.push(`Professional character portrait of ${character.name}`)
        if (character.age) parts.push(`age ${character.age}`)
        if (character.gender) parts.push(character.gender)
        if (character.ethnicity) parts.push(character.ethnicity)
        if (character.build) parts.push(`${character.build} build`)
        if (character.height) parts.push(character.height)
        if (character.hairStyle && character.hairColor) parts.push(`${character.hairColor} ${character.hairStyle} hair`)
        else if (character.hairStyle) parts.push(`${character.hairStyle} hair`)
        else if (character.hairColor) parts.push(`${character.hairColor} hair`)
        if (character.eyeColor) parts.push(`${character.eyeColor} eyes`)
        if (character.distinctiveFeatures) parts.push(character.distinctiveFeatures)
        if (character.clothing) parts.push(`wearing ${character.clothing}`)
        if (character.demeanor) parts.push(character.demeanor)
        
        finalPrompt = parts.join(', ')
        console.log('[Character Image] Built prompt from stored attributes:', finalPrompt.substring(0, 100))
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

    // Generate with Vertex AI Imagen 3 (1:1 for portrait)
    const base64Image = await callVertexAIImagen(enhancedPrompt, {
      aspectRatio: '1:1',
      numberOfImages: 1
    })
    
    // Upload to Vercel Blob
    const imageUrl = await uploadImageToBlob(
      base64Image,
      `characters/char-${Date.now()}.png`
    )
    
    return NextResponse.json({ 
      success: true, 
      imageUrl,
      model: 'imagen-3.0-generate-001',
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

