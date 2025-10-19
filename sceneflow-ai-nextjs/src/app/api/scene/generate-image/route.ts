import { NextRequest, NextResponse } from 'next/server'
import { callVertexAIImagen } from '@/lib/vertexai/client'
import { uploadImageToBlob } from '@/lib/storage/blob'
import { prepareCharacterReferences, buildPromptWithReferences } from '@/lib/imagen/characterReferences'

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
      if (d.character) foundNames.add(d.character)
    })
  }
  
  // Note: Vision page already does character extraction from action/description
  // so we don't need to duplicate that logic here
  
  return Array.from(foundNames)
}

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
          parts.push(`[REFERENCE IMAGE: ${c.referenceImage}]`)
        }
        
        // CRITICAL: Add text descriptions as fallback/supplement
        // Build detailed physical description
        const physicalDesc = []
        if (c.ethnicity) physicalDesc.push(c.ethnicity)
        if (c.keyFeature) physicalDesc.push(c.keyFeature)
        if (c.hairStyle || c.hairColor) {
          const hair = [c.hairColor, c.hairStyle].filter(Boolean).join(' ')
          if (hair) physicalDesc.push(`Hair: ${hair}`)
        }
        if (c.eyeColor) physicalDesc.push(`Eyes: ${c.eyeColor}`)
        if (c.expression) physicalDesc.push(`Expression: ${c.expression}`)
        if (c.build) physicalDesc.push(`Build: ${c.build}`)
        
        if (physicalDesc.length > 0) {
          parts.push(`Appearance: ${physicalDesc.join(', ')}`)
        }
        
        // Legacy fields as additional fallback
        if (c.appearance) parts.push(`Details: ${c.appearance}`)
        if (c.description && physicalDesc.length === 0) parts.push(c.description)
        
        return parts.join(' - ')
      }).join('\n')
      
      const hasRefs = sceneContext.characters.some((c: any) => c.referenceImage)
      characterRefs = `\n\nCHARACTERS IN SCENE:\n${charDetails}`
      if (hasRefs) {
        characterRefs += `\n\nIMPORTANT: Match the exact appearance shown in [REFERENCE IMAGE] URLs. Use physical descriptions as supplementary details.`
      } else {
        characterRefs += `\n\nIMPORTANT: Match the physical appearance details exactly.`
      }
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
    
    // Prepare character references if available
    const characterReferences = sceneContext?.characters 
      ? await prepareCharacterReferences(sceneContext.characters)
      : []

    // Build prompt with reference IDs
    const sceneCharacterNames = getSceneCharacterNames(sceneContext)
    const finalPrompt = characterReferences.length > 0
      ? buildPromptWithReferences(enhancedPrompt, characterReferences, sceneCharacterNames)
      : enhancedPrompt

    // Add cinematic quality enhancers
    const stylePrompt = finalPrompt + `\n\nStyle: Cinematic scene, professional cinematography, film quality
Quality: 4K resolution, cinematic lighting, sharp focus
Composition: 16:9 aspect ratio, professional framing, rule of thirds
Camera: Cinematic camera angle, depth of field
Lighting: Cinematic lighting, atmospheric, professional film lighting`

    console.log('[Scene Image] Using', characterReferences.length, 'character references')
    console.log('[Scene Image] Generating with Vertex AI Imagen 3:', stylePrompt.substring(0, 150))

    // Generate image with Vertex AI Imagen 3
    const base64Image = await callVertexAIImagen(stylePrompt, {
      aspectRatio: '16:9',
      numberOfImages: 1,
      referenceImages: characterReferences.map(ref => ({
        referenceId: ref.id,
        bytesBase64Encoded: ref.imageBase64,
        referenceType: 'SUBJECT' as const,
        subjectDescription: ref.description
      }))
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

