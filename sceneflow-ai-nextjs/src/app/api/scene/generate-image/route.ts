import { NextRequest, NextResponse } from 'next/server'
import { callVertexAIImagen } from '@/lib/vertexai/client'
import { uploadImageToBlob } from '@/lib/storage/blob'
import { prepareCharacterReferences, buildPromptWithReferences } from '@/lib/imagen/characterReferences'

export const runtime = 'nodejs'
export const maxDuration = 60

// Helper to parse scene action for details
function parseSceneAction(sceneContext: any) {
  const action = sceneContext?.action || sceneContext?.visualDescription || ''
  const details = {
    actions: [] as string[],
    emotion: [] as string[],
    lighting: [] as string[],
    sounds: [] as string[],
    environment: [] as string[]
  }
  
  const actionLower = action.toLowerCase()
  
  // Extract key actions (verbs that show what's happening)
  const actionMatches = action.match(/([A-Z][a-z]+(?:\s+[a-z]+)*(?:ing|s|ed))/g)
  if (actionMatches) {
    details.actions = actionMatches.slice(0, 3)  // Top 3 actions
  }
  
  // Detect emotion/mood
  if (actionLower.includes('stress') || actionLower.includes('tense')) details.emotion.push('stressed, tense')
  if (actionLower.includes('joy') || actionLower.includes('happy')) details.emotion.push('joyful, happy')
  if (actionLower.includes('sad') || actionLower.includes('tears')) details.emotion.push('sad, tearful')
  if (actionLower.includes('fear') || actionLower.includes('panic')) details.emotion.push('fearful, panicked')
  
  // Extract lighting cues
  if (actionLower.includes('illuminated by')) {
    const lightMatch = action.match(/illuminated by ([^,\.]+)/i)
    if (lightMatch) details.lighting.push(lightMatch[1])
  }
  if (actionLower.includes('glow')) details.lighting.push('glowing light')
  if (actionLower.includes('shadow')) details.lighting.push('dramatic shadows')
  
  // Extract environmental details
  const envMatch = action.match(/in a ([^,\.]+(?:office|room|street|beach|[a-z]+))/i)
  if (envMatch) details.environment.push(envMatch[1])
  
  return details
}

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

    // Prepare character references FIRST (need this for IDs)
    const characterReferences = sceneContext?.characters 
      ? await prepareCharacterReferences(sceneContext.characters)
      : []

    // Build character context with reference IDs
    let characterRefs = ''
    if (sceneContext?.characters && Array.isArray(sceneContext.characters) && sceneContext.characters.length > 0) {
      const charDetails = sceneContext.characters.map((c: any) => {
        const parts = []
        
        // Find if this character has a prepared reference
        const ref = characterReferences.find(r => r.name === c.name)
        
        // Add name with [referenceId] if available
        if (ref) {
          parts.push(`${c.name} [${ref.id}]`)
        } else {
          parts.push(`${c.name}`)
        }
        
        // Only include non-visual attributes (reference handles physical appearance)
        if (c.role) parts.push(c.role)
        
        // Expression/demeanor (changes by scene)
        const context = []
        if (c.expression) context.push(c.expression)
        if (c.demeanor) context.push(c.demeanor)
        
        if (context.length > 0) {
          return `${parts.join(' ')}: ${context.join(', ')}`
        }
        
        return parts.join(' ')
      }).join('; ')
      
      characterRefs = `\n\nCharacters: ${charDetails}`
      
      console.log('[Scene Image] Character list with IDs:', charDetails)
      
      if (characterReferences.length > 0) {
        characterRefs += `\n\nIMPORTANT: Match character physical appearance to reference images using [referenceId].`
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
    
    // Parse scene details for emotion, lighting, environment
    const sceneDetails = parseSceneAction(sceneContext)

    // Build scene-focused prompt
    const scenePromptParts = []
    
    // 1. Start with visual description (shot type, framing)
    const visualDesc = sceneContext?.visualDescription || ''
    if (visualDesc) {
      scenePromptParts.push(visualDesc)
    }
    
    // 2. Character in action with reference
    const sceneCharacterNames = getSceneCharacterNames(sceneContext)
    
    console.log('[Scene Image] Scene character names:', sceneCharacterNames)
    console.log('[Scene Image] Character references:', characterReferences.map(r => ({ id: r.id, name: r.name })))
    
    if (characterReferences.length > 0) {
      // Map character names to include [referenceId]
      const charWithRefs = sceneCharacterNames.map(charName => {
        const ref = characterReferences.find(r => r.name === charName)
        return ref ? `${charName} [${ref.id}]` : charName
      }).join(', ')
      
      console.log('[Scene Image] Characters with reference IDs:', charWithRefs)
      
      if (charWithRefs) {
        // Add character with their current action/emotion
        const actionDesc = sceneDetails.actions.length > 0 
          ? sceneDetails.actions.slice(0, 2).join(', ')
          : ''
        const emotionDesc = sceneDetails.emotion.length > 0
          ? sceneDetails.emotion[0]
          : ''
        
        if (actionDesc || emotionDesc) {
          scenePromptParts.push(`featuring ${charWithRefs} ${actionDesc} ${emotionDesc}`.trim())
        } else {
          scenePromptParts.push(`featuring ${charWithRefs}`)
        }
      }
    } else if (sceneCharacterNames.length > 0) {
      // No references, just mention character names
      scenePromptParts.push(`featuring ${sceneCharacterNames.join(', ')}`)
    }
    
    // 3. Environment and atmosphere
    if (sceneDetails.environment.length > 0) {
      scenePromptParts.push(`in ${sceneDetails.environment.join(', ')}`)
    }
    
    // 4. Lighting details
    if (sceneDetails.lighting.length > 0) {
      scenePromptParts.push(`${sceneDetails.lighting.join(', ')}`)
    }
    
    // 5. Location from heading
    if (sceneContext?.heading) {
      scenePromptParts.push(sceneContext.heading)
    }
    
    // Build optimized scene prompt
    const scenePrompt = scenePromptParts.filter(Boolean).join(', ')
    
    // Use scene-focused prompt with character refs and scene desc
    const finalPrompt = (scenePrompt || prompt) + characterRefs + sceneDesc
    
    // Add cinematic quality enhancers
    const stylePrompt = finalPrompt + `\n\nStyle: Cinematic scene, professional cinematography, film quality
Quality: 4K resolution, cinematic lighting, sharp focus
Composition: 16:9 aspect ratio, professional framing
Camera: Cinematic camera angle, depth of field`

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

