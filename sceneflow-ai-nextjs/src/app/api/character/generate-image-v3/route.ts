import { NextRequest, NextResponse } from 'next/server'
import { callGeminiImageGeneration } from '@/lib/vertexai/gemini-image-client'
import { uploadImageToBlob } from '@/lib/storage/blob'
import { getCharacterAttributes } from '../../../../lib/character/persistence'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { 
      prompt, 
      projectId, 
      characterId, 
      aspectRatio = '16:9', 
      personGeneration = 'allow_adult',
      includeThoughts = false,
      negativePrompt
    } = await req.json()
    
    // 1. Load Character Attributes (if applicable)
    const attributeParts: string[] = []
    if (projectId && characterId) {
      try {
        const character = await getCharacterAttributes(projectId, characterId)
        if (character) {
          if (character.keyFeature) attributeParts.push(character.keyFeature)
          if (character.ethnicity) attributeParts.push(character.ethnicity)
          if (character.hairColor && character.hairStyle) attributeParts.push(`${character.hairColor} ${character.hairStyle} hair`)
          if (character.eyeColor) attributeParts.push(`${character.eyeColor} eyes`)
          if (character.expression) attributeParts.push(character.expression)
          if (character.build) attributeParts.push(`${character.build} build`)
        }
      } catch (e) {
        console.warn('[Character Image V3] Failed to load character attributes:', e)
      }
    }

    // 2. Construct Final Prompt
    // We simply join attributes and the user prompt.
    // We do NOT inject hidden style presets unless explicitly requested by the user in the prompt.
    // The user prompt is trusted.
    
    const userPrompt = prompt?.trim() || ''
    
    // Combine and dedupe simple tokens to avoid repetition like "blue eyes, blue eyes"
    const rawSegments = [...attributeParts, userPrompt].join(', ').split(',')
    const cleanSegments: string[] = []
    const seen = new Set<string>()
    
    for (const seg of rawSegments) {
      const s = seg.trim()
      if (!s) continue
      const key = s.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      cleanSegments.push(s)
    }
    
    const finalPrompt = cleanSegments.join(', ')

    if (!finalPrompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    console.log('[Character Image V3] Final Prompt:', finalPrompt)

    // 3. Call Gemini 3 Pro Image Model
    const { imageBase64, thoughts } = await callGeminiImageGeneration(finalPrompt, {
      aspectRatio,
      personGeneration,
      includeThoughts,
      negativePrompt
    })

    // 4. Upload to Blob Storage
    const imageUrl = await uploadImageToBlob(imageBase64, projectId || 'temp')

    return NextResponse.json({ 
      url: imageUrl, 
      thoughts,
      prompt: finalPrompt 
    })

  } catch (error: any) {
    console.error('[Character Image V3] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate image' },
      { status: 500 }
    )
  }
}
