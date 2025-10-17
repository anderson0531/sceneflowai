import { NextRequest, NextResponse } from 'next/server'
import { callVertexAIImagen } from '@/lib/vertexai/client'
import { uploadImageToBlob } from '@/lib/storage/blob'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { prompt, sceneContext } = await req.json()
    
    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    // Build character references with detailed appearance for visual consistency
    let characterRefs = ''
    if (sceneContext?.characters && Array.isArray(sceneContext.characters) && sceneContext.characters.length > 0) {
      const charDetails = sceneContext.characters.map((c: any) => {
        const parts = [`${c.name}`]
        if (c.appearance) parts.push(`Appearance: ${c.appearance}`)
        if (c.demeanor) parts.push(`Demeanor: ${c.demeanor}`)
        if (c.clothing) parts.push(`Clothing: ${c.clothing}`)
        if (c.description && !c.appearance) parts.push(c.description)  // Fallback if no appearance
        return parts.join(', ')
      }).join('; ')
      
      characterRefs = `\n\nCHARACTERS IN SCENE: ${charDetails}`
    }

    // Add scene description if available
    let sceneDesc = ''
    if (sceneContext?.sceneDescription) {
      const s = sceneContext.sceneDescription
      const parts = []
      if (s.location) parts.push(`Location: ${s.location}`)
      if (s.atmosphere) parts.push(`Atmosphere: ${s.atmosphere}`)
      if (s.furniture_props) parts.push(`Furniture/Props: ${s.furniture_props}`)
      if (parts.length > 0) {
        sceneDesc = `\n\nLOCATION DETAILS: ${parts.join(', ')}`
      }
    }

    // Enhance prompt for cinematic scene
    let enhancedPrompt = prompt + characterRefs + sceneDesc
    
    // Add scene context if provided
    if (sceneContext) {
      const contextParts = []
      if (sceneContext.visualStyle) contextParts.push(`Visual style: ${sceneContext.visualStyle}`)
      if (sceneContext.tone) contextParts.push(`Tone: ${sceneContext.tone}`)
      if (contextParts.length > 0) {
        enhancedPrompt += `\n\n${contextParts.join(', ')}`
      }
    }
    
    // Add cinematic quality enhancers
    enhancedPrompt += `\n\nStyle: Cinematic scene, professional cinematography, film quality
Quality: 4K resolution, cinematic lighting, sharp focus
Composition: 16:9 aspect ratio, professional framing, rule of thirds
Camera: Cinematic camera angle, depth of field
Lighting: Cinematic lighting, atmospheric, professional film lighting`

    console.log('[Scene Image] Generating with Vertex AI Imagen 3:', enhancedPrompt.substring(0, 150))

    // Generate image with Vertex AI Imagen 3
    const base64Image = await callVertexAIImagen(enhancedPrompt, {
      aspectRatio: '16:9',
      numberOfImages: 1
    })
    
    // Upload to Vercel Blob storage
    const imageUrl = await uploadImageToBlob(
      base64Image,
      `scenes/scene-${Date.now()}.png`
    )
    
    return NextResponse.json({ 
      success: true, 
      imageUrl,
      model: 'imagen-3.0-generate-001',
      provider: 'vertex-ai',
      storage: 'vercel-blob'
    })

  } catch (error) {
    console.error('[Scene Image] Vertex AI generation error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Image generation failed' 
    }, { status: 500 })
  }
}

