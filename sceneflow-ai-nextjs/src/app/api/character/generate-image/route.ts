import { NextRequest, NextResponse } from 'next/server'
import { callVertexAIImagen } from '@/lib/vertexai/client'
import { artStylePresets } from '@/constants/artStylePresets'
import { uploadImageToBlob } from '@/lib/storage/blob'
import { getCharacterAttributes } from '../../../../lib/character/persistence'
import { analyzeCharacterImage } from '@/lib/imagen/visionAnalyzer'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { prompt, projectId, characterId, quality = 'auto', artStyle, shotType, cameraAngle, lighting, additionalDetails } = await req.json()
    
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

    // Enhance prompt for character portrait using user selections (no hard-coded overrides)
    const parts: string[] = []
    parts.push(finalPrompt)

    // Style preset
    const stylePreset = artStyle ? artStylePresets.find(s => s.id === artStyle) : undefined
    if (stylePreset) parts.push(stylePreset.promptSuffix)

    // Camera & composition mappings
    const shotMap: Record<string, string> = {
      'wide-shot': 'wide shot composition',
      'medium-shot': 'medium shot composition',
      'medium-close-up': 'medium close-up portrait',
      'close-up': 'close-up portrait',
      'extreme-close-up': 'extreme close-up portrait',
      'over-shoulder': 'over the shoulder view'
    }
    const angleMap: Record<string, string> = {
      'eye-level': 'eye level angle',
      'low-angle': 'low angle view',
      'high-angle': 'high angle view',
      'birds-eye': "bird's eye view",
      'dutch-angle': 'dutch angle'
    }
    const lightingMap: Record<string, string> = {
      'natural': 'soft natural lighting',
      'golden-hour': 'golden hour lighting',
      'dramatic': 'dramatic cinematic lighting',
      'soft': 'soft diffused lighting',
      'harsh': 'high contrast lighting',
      'backlit': 'backlit subject'
    }
    if (shotType) parts.push(shotMap[shotType] || shotType)
    if (cameraAngle && cameraAngle !== 'eye-level') parts.push(angleMap[cameraAngle] || cameraAngle)
    if (lighting) parts.push(lightingMap[lighting] || lighting)
    if (additionalDetails) parts.push(additionalDetails)

    // Quality hints
    parts.push('high detail, sharp focus')

    const enhancedPrompt = parts.filter(Boolean).join(', ')

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
    
    // AUTO-ANALYZE: Extract detailed description using Gemini Vision
    let visionDescription = null
    try {
      const characterName = prompt?.split(',')[0]?.trim() || 'Character'
      visionDescription = await analyzeCharacterImage(imageUrl, characterName)
      console.log(`[Character Image] Auto-analyzed with Gemini Vision`)
    } catch (error) {
      console.error('[Character Image] Vision analysis failed:', error)
      // Continue without analysis - not critical
    }
    
    return NextResponse.json({ 
      success: true, 
      imageUrl,
      visionDescription, // Include in response for client to save
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

