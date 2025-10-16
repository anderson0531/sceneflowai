import { NextRequest, NextResponse } from 'next/server'
import { callVertexAIImagen } from '@/lib/vertexai/client'
import { uploadImageToBlob } from '@/lib/storage/blob'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json()
    
    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    // Enhance prompt for character portrait
    const enhancedPrompt = `${prompt}

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

