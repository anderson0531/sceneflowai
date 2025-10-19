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

    // Build character references with visual URLs and detailed appearance for consistency
    let characterRefs = ''
    if (sceneContext?.characters && Array.isArray(sceneContext.characters) && sceneContext.characters.length > 0) {
      const charDetails = sceneContext.characters.map((c: any) => {
        const parts = [`${c.name}`]
        
        // Add reference image URL if available
        if (c.referenceImage) {
          parts.push(`Reference Image: ${c.referenceImage}`)
        }
        
        // Add text descriptions as fallback/supplement
        if (c.ethnicity) parts.push(`Ethnicity: ${c.ethnicity}`)
        if (c.keyFeature) parts.push(`Key Feature: ${c.keyFeature}`)
        if (c.hairStyle) parts.push(`Hair: ${c.hairStyle}`)
        if (c.hairColor) parts.push(`Hair Color: ${c.hairColor}`)
        if (c.eyeColor) parts.push(`Eyes: ${c.eyeColor}`)
        if (c.build) parts.push(`Build: ${c.build}`)
        
        // Legacy fields as fallback
        if (c.appearance) parts.push(`Appearance: ${c.appearance}`)
        if (c.demeanor) parts.push(`Demeanor: ${c.demeanor}`)
        if (c.clothing) parts.push(`Clothing: ${c.clothing}`)
        if (c.description && !c.keyFeature && !c.appearance) parts.push(c.description)
        
        return parts.join(', ')
      }).join('\n')
      
      characterRefs = `\n\nCHARACTERS IN SCENE:\n${charDetails}\n\nIMPORTANT: Match the exact appearance of characters shown in their reference images.`
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
    
    // Add character consistency instruction if reference images exist
    if (sceneContext?.characters?.some((c: any) => c.referenceImage)) {
      enhancedPrompt += '\n\nCRITICAL: Ensure characters match their reference images exactly - same facial features, hair style/color, build, and clothing when specified.'
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

